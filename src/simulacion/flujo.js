// Motor de simulación del comedor, parte 1: lo que ocurre solo.
// Eventos NO controlables y transiciones automáticas, programados en el reloj
// con el generador con semilla. No depende del motor de juego ni del DOM: se prueba en Node.
// Regla: los estados cambian solo con Automata.ejecutar (δ) y los recursos
// solo con RedPetri.disparar o con eventos externos del reloj (agregarTokens).

import { Reloj } from '../sed/reloj.js';
import { Aleatorio } from '../sed/aleatorio.js';
import { Automata } from '../sed/automata.js';
import { RedPetri } from '../sed/redPetri.js';
import { Lenguaje } from '../sed/lenguaje.js';
import { componerVarios, supervisor, puedeConjunto, ejecutarConjunto } from '../sed/composicion.js';
import { explorar } from '../sed/cobertura.js';
import { CadenaMarkov } from '../sed/markov.js';
import { MODELOS, MARKOV } from '../sed/modelos/index.js';
import { decidirLinea3 } from './politica.js';
import {
  TIEMPOS, PUNTOS, TURNOS, SEMILLA, RADAR_PROFUNDIDAD, META_LOGRO_LAVADOS,
  PASO_K_MS, SEMILLA_MARKOV, PASOS_RIESGO, COSTOS, PUNTOS_FASE2, META_LOGRO_OLEADA
} from '../config.js';

export const RAZON_SUPERVISOR =
  '¬(servir ∧ Registro = Sin_acceso): el torniquete no registró acceso_ok para este estudiante';

export const PASO_K_S = PASO_K_MS / 1000;

// Semilla del generador de las cadenas en una partida: depende solo de la semilla de la
// partida y del turno (cada turno tiene sus oleadas), así que la secuencia de oleadas no
// cambia con lo que haga el jugador.
export const semillaMarkov = (semilla, turno = 1) => (SEMILLA_MARKOV * 100000 + semilla * 10 + turno) >>> 0;

export class FlujoComedor {
  // llegadas: 'fase1' (ola fija de la Fase 1) o 'markov' (las decide la cadena Oleada).
  // relojExterno: en el juego, el paso k lo da el temporizador de la escena Planta, que
  //   llama a pasoMarkov(); sin él (Node), avanzar() da los pasos en el borde de cada paso.
  // politica: política automática (src/simulacion/politica.js) o null.
  constructor({
    turno = TURNOS[0], semilla = SEMILLA, monitor = true, piloto = false, logros = [],
    llegadas = 'fase1', relojExterno = false, politica = null
  } = {}) {
    this.turno = turno;
    this.semilla = semilla;
    this.azar = new Aleatorio(semilla * 1000 + turno.id);
    this.reloj = new Reloj((evento) => this.manejar(evento));
    this.politica = politica;
    if (politica?.piloto) piloto = true;
    this.piloto = piloto;
    this.sinMonitor = !monitor; // verdadero mientras todo el turno se juegue sin monitores
    this.lenguaje = new Lenguaje(MODELOS.reparacion);

    // Supervisor de la ficha: Estudiante ‖ Torniquete ‖ Registro_Acceso con
    // Violacion como estado prohibido. Se calcula una vez sobre el producto completo.
    this.composicion = componerVarios(
      [MODELOS.estudiante, MODELOS.torniquete, MODELOS.registroAcceso], { completo: true });
    this.supervisor = supervisor(this.composicion, (tupla) => tupla[2] === 'Violacion', RAZON_SUPERVISOR);

    // Cada línea tiene su torniquete compuesto con su contador de rechazos.
    // La línea 3 (Fase 2) empieza cerrada: los estudiantes solo eligen líneas abiertas.
    this.lineas = [1, 2, 3].map((id) => ({
      id,
      abierta: id <= 2,
      torniquete: new Automata(MODELOS.torniquete, `T${id}`),
      contador: new Automata(MODELOS.contadorRechazos, `C${id}`),
      // Generador propio de la línea: el resultado de su n-ésima lectura es
      // siempre el mismo para una semilla, sin importar el ritmo del jugador.
      azar: new Aleatorio(semilla * 1000 + turno.id * 10 + id),
      fila: [],                 // ids de estudiantes En_Fila, en orden
      mostrador: null,          // id del estudiante que está Recibiendo_Bandeja
      lecturaPendiente: false,
      pilotoPendiente: false,
      intentosReparacion: 0,
      ayudaUsada: false
    }));

    this.estudiantes = new Map(); // id -> { automata, registro, linea, mesa, ... }
    this.siguienteId = 1;
    this.mesas = new Array(MODELOS.comedor.lugares.find((l) => l.nombre === 'Mesa_libre').m0).fill(null);
    this.esperandoMesa = [];      // estudiantes en Buscando_Mesa
    this.quierenTerminar = [];    // estudiantes que ya terminaron de comer
    this.lavados = [];            // ids de los temporizadores de t_lavar en curso
    this.puntaje = 0;
    this.rachaServir = 0;
    this.stats = {
      llegadas: 0, servidos: 0, completados: 0, rechazos: 0, bloqueos: 0, reparaciones: 0,
      palabrasInvalidas: 0, ayudas: 0, intentosBloqueados: 0, desbordes: 0, lavados: 0,
      relevos: 0, deadlocksEvitados: 0
    };
    this.radar = { estado: 'verde', bloqueos: [], historial: [] };
    this.radarEmitido = null;
    this.decisionEnAmarillo = false; // hubo un relevo con el radar en amarillo
    this.logros = new Set(logros);
    this.oyentes = new Map();
    this.terminado = false;
    this.gameOver = null;
    this.resumen = null;
    this.instantaneaVerde = null;
    this.crearRed(monitor);

    // --- Fase 2: cadenas de Markov y paso k (docs/modelo/markov.md) ---
    this.modoMarkov = llegadas === 'markov';
    this.relojExterno = relojExterno;
    this.k = 0;
    this.markov = null;
    this.pasosTurno = 0;
    this.fase2 = {
      aperturasLinea3: 0, pasosLinea3: 0, relevosComprados: 0, pronosticos: 0,
      pasosAlta: 0, altasSinDesborde: 0, rachaAltaSinDesborde: 0, altaSinLinea: 0, bajaConLinea: 0,
      desbordesAlEmpezarPaso: 0
    };
    if (this.modoMarkov) {
      const base = semillaMarkov(semilla, turno.id);
      this.azarMarkov = new Aleatorio(base);        // sorteo de la oleada en cada paso
      this.azarLlegadas = new Aleatorio(base + 1);  // instantes de las llegadas dentro del paso
      this.markov = {
        oleada: new CadenaMarkov(MARKOV.oleada, () => this.azarMarkov.siguiente()),
        mesas: new CadenaMarkov(MARKOV.mesas)         // referencia: se observa, no se sortea
      };
      this.pasosTurno = turno.pasos ?? Math.ceil(turno.llegadas / PASO_K_S);
    }
  }

  // ---------- infraestructura ----------

  // Crea la red de Petri (con o sin monitores). Conserva el marcado por nombre.
  crearRed(monitor, marcadoPorNombre = null) {
    const json = monitor ? MODELOS.comedorMonitor : MODELOS.comedor;
    const secuencia = this.red ? this.red.secuencia : [];
    this.red = new RedPetri(json);
    if (marcadoPorNombre) this.red.fijarMarcado(json.lugares.map((l) => marcadoPorNombre[l.nombre] ?? l.m0));
    this.red.secuencia = [...secuencia];
    this.monitor = monitor;
    this.red.alCambiar((cambio) => this.trasCambioRed(cambio));
  }

  on(tipo, oyente) {
    if (!this.oyentes.has(tipo)) this.oyentes.set(tipo, []);
    this.oyentes.get(tipo).push(oyente);
  }

  // Quita un oyente (las escenas superpuestas lo hacen al cerrarse).
  off(tipo, oyente) {
    const lista = this.oyentes.get(tipo);
    if (lista) this.oyentes.set(tipo, lista.filter((o) => o !== oyente));
  }

  emitir(tipo, datos = {}) {
    for (const oyente of this.oyentes.get(tipo) ?? []) oyente(datos);
    for (const oyente of this.oyentes.get('*') ?? []) oyente({ tipo, ...datos });
  }

  sumar(puntos, motivo) {
    this.puntaje += puntos;
    this.emitir('puntaje', { delta: puntos, motivo, total: this.puntaje });
  }

  otorgar(idLogro) {
    if (this.logros.has(idLogro)) return;
    this.logros.add(idLogro);
    this.emitir('logro', { id: idLogro });
  }

  // Radar del Árbol de Cobertura: se recalcula tras cada cambio de marcado.
  trasCambioRed(cambio) {
    const previo = this.radar.estado;
    const r = explorar(this.red, this.red.M, RADAR_PROFUNDIDAD);
    const etiqueta = cambio.etiqueta ?? (cambio.tipo === 'disparo' ? cambio.nombre : `+${cambio.lugar}`);
    const historial = [...this.radar.historial, { etiqueta, estado: r.estado, marcado: this.red.marcado() }].slice(-6);
    this.radar = { estado: r.estado, bloqueos: r.bloqueos, historial };
    // Deadlock evitado: el jugador tomó una decisión de relevo con el radar en
    // amarillo y después el radar volvió a verde.
    const info = cambio.tipo === 'disparo' ? this.red.transiciones[cambio.t] : null;
    if (info && info.disparo === 'jugador' && !info.evento && previo === 'amarillo') this.decisionEnAmarillo = true;
    if (r.estado === 'verde') {
      if (previo === 'amarillo' && this.decisionEnAmarillo) this.stats.deadlocksEvitados++;
      this.decisionEnAmarillo = false;
    }
    this.emitir('red', cambio);
  }

  // Se llama al final de cada evento del reloj y de cada acción del jugador.
  cerrarAccion() {
    if (this.radar.estado === 'rojo' && !this.gameOver) this.terminarPorBloqueo();
    if (this.radarEmitido !== this.radar) {
      this.radarEmitido = this.radar;
      this.emitir('radar', this.radar);
    }
  }

  // Interbloqueo: marcado muerto con estudiantes en proceso. Termina la partida.
  terminarPorBloqueo() {
    // El texto explica cuál de los dos interbloqueos documentados ocurrió.
    const sinServidores = this.red.tokens('Personal_linea') === 0;
    this.gameOver = {
      tiempo: this.reloj.tiempo,
      marcado: this.red.comoObjeto(),
      secuencia: [...this.red.secuencia],
      descripcion: sinServidores ? MODELOS.comedor.deadlock.simetrico : MODELOS.comedor.deadlock.descripcion,
      prevencion: this.red.json.deadlock.prevencion
    };
    this.reloj.pausar();
    this.emitir('game_over', this.gameOver);
  }

  // ---------- arranque y bucle ----------

  iniciar() {
    if (this.modoMarkov) {
      // Fase 2: las llegadas las decide la cadena Oleada, paso a paso. El paso 0 usa pi^(0).
      this.programarLlegadasDelPaso();
      this.reloj.programar(TIEMPOS.relevo, { tipo: 'relevo' });
      if (Number.isFinite(this.pasosTurno)) {
        this.reloj.programar(this.pasosTurno * PASO_K_S + TIEMPOS.margenFinal, { tipo: 'fin_turno' });
      }
    } else {
      const { estudiantes, llegadas } = this.turno;
      // Llegadas externas: mezcla de uniforme y triangular (ola en la mitad del turno).
      const tiempos = [];
      for (let i = 0; i < estudiantes; i++) {
        const u = this.azar.ocurre(0.5) ? this.azar.siguiente() : (this.azar.siguiente() + this.azar.siguiente()) / 2;
        tiempos.push(1 + (llegadas - 1) * u);
      }
      tiempos.sort((a, b) => a - b);
      for (const t of tiempos) this.reloj.programar(t, { tipo: 'llegada' });
      this.reloj.programar(TIEMPOS.relevo, { tipo: 'relevo' });
      this.reloj.programar(llegadas + TIEMPOS.margenFinal, { tipo: 'fin_turno' });
    }
    this.trasCambioRed({ tipo: 'inicio', etiqueta: 'M0' });
    this.guardarVerde();
    this.instantaneaInicio = this.instantaneaVerde; // comienzo del turno, antes de toda decisión
    this.emitir('instantanea', { cual: 'inicio' });
    this.cerrarAccion();
    this.emitir('inicio', {});
  }

  // Lo único que hace el bucle del juego: avanzar el reloj.
  avanzar(dt) {
    if (this.terminado || this.gameOver) return 0;
    if (!this.modoMarkov) return this.reloj.avanzar(dt);
    // En el juego el paso k lo da el TimerEvent: el reloj espera en el borde del paso.
    if (this.relojExterno) return this.reloj.avanzar(dt, this.proximoBorde());
    // En Node el núcleo da los pasos en el borde, en el mismo orden que en el juego.
    if (this.reloj.pausado || dt <= 0) return 0;
    const objetivo = this.reloj.tiempo + dt * this.reloj.velocidad;
    let disparados = 0;
    while (!this.terminado && !this.gameOver && !this.reloj.pausado) {
      const borde = this.proximoBorde();
      if (borde > objetivo) { disparados += this.reloj.avanzarHasta(objetivo); break; }
      disparados += this.reloj.avanzarHasta(borde);
      if (this.reloj.tiempo < borde) break; // un evento detuvo el reloj
      this.pasoMarkov();
    }
    return disparados;
  }

  // ---------- Fase 2: reloj discreto y cadenas de Markov ----------

  // Instante de simulación del siguiente paso k (Infinity si ya no hay más pasos).
  proximoBorde() {
    return this.modoMarkov && this.k < this.pasosTurno ? (this.k + 1) * PASO_K_S : Infinity;
  }

  // Paso k: lo llama el temporizador de la escena Planta (o avanzar() en Node).
  // Avanza las cadenas en un orden fijo y devuelve los cambios. Primero lleva el reloj
  // exactamente al borde del paso, así el paso ocurre siempre en el mismo instante.
  pasoMarkov() {
    if (!this.modoMarkov || this.terminado || this.gameOver || this.k >= this.pasosTurno) return null;
    const borde = (this.k + 1) * PASO_K_S;
    if (this.reloj.tiempo < borde) this.reloj.avanzarHasta(borde);
    if (this.reloj.tiempo < borde || this.terminado || this.gameOver) return null;
    // 1) Oleada: fila activa de P y u = rng().
    const oleada = this.markov.oleada.paso();
    // 2) Mesas: ocupación observada en la red de Petri, por cuartos.
    const mesas = this.markov.mesas.observar(this.cuartoMesas());
    this.k = oleada.k;
    // 3) Puntaje del paso que terminó y decisión de la política automática.
    this.revisarPasoFase2(oleada);
    if (this.politica) decidirLinea3(this, this.politica);
    // 4) Llegadas del paso que empieza.
    this.programarLlegadasDelPaso();
    const cambio = { k: this.k, oleada, mesas, riesgo: this.riesgo() };
    this.emitir('markov', cambio);
    this.cerrarAccion();
    return cambio;
  }

  // Llegadas del paso k actual: 4, 10 o 18 según la oleada, en instantes al azar del paso.
  programarLlegadasDelPaso() {
    if (this.k >= this.pasosTurno) { this.llegadasDelPaso = 0; return; }
    const cuantas = MARKOV.oleada.llegadasPorPaso[this.markov.oleada.estado];
    const inicio = this.k * PASO_K_S;
    const tiempos = Array.from({ length: cuantas }, () => inicio + PASO_K_S * this.azarLlegadas.siguiente());
    tiempos.sort((a, b) => a - b);
    for (const t of tiempos) this.reloj.programar(t, { tipo: 'llegada' });
    this.llegadasDelPaso = cuantas;
  }

  // Estado observado de la cadena Mesas: M(Almorzando) por cuartos de las 20 mesas.
  cuartoMesas() {
    const { lugar, cortes } = MARKOV.mesas.observa;
    const ocupadas = this.red.tokens(lugar);
    const i = cortes.filter((c) => ocupadas >= c).length;
    return MARKOV.mesas.estados[i];
  }

  // P(oleada Alta al menos una vez en los próximos "pasos" pasos), desde el estado actual.
  riesgo(pasos = PASOS_RIESGO) {
    return this.markov ? this.markov.oleada.riesgo(pasos) : 0;
  }

  // Puntaje de la Fase 2 (GDD 16.6) al cerrar el paso que acaba de terminar.
  revisarPasoFase2({ de, a }) {
    const f = this.fase2;
    const linea3 = this.lineas[2].abierta;
    if (linea3) {
      f.pasosLinea3++;
      this.sumar(-COSTOS.linea3Paso, 'línea 3 abierta');
    }
    if (de === 'Alta') {
      f.pasosAlta++;
      if (!linea3) f.altaSinLinea++;
      if (this.stats.desbordes === f.desbordesAlEmpezarPaso) {
        f.altasSinDesborde++;
        f.rachaAltaSinDesborde++;
        this.sumar(PUNTOS_FASE2.altaSinDesborde, 'oleada alta sin desborde');
        if (f.rachaAltaSinDesborde >= META_LOGRO_OLEADA) this.otorgar('oleada_contenida');
      } else {
        f.rachaAltaSinDesborde = 0;
      }
    }
    if (de === 'Baja' && linea3) f.bajaConLinea++;
    // Pronóstico acertado: empieza una oleada Alta y la línea 3 ya estaba abierta.
    if (a === 'Alta' && de !== 'Alta' && linea3) {
      f.pronosticos++;
      this.sumar(PUNTOS_FASE2.pronostico, 'pronóstico acertado');
      this.otorgar('pronostico');
    }
    f.desbordesAlEmpezarPaso = this.stats.desbordes;
  }

  // Despacha un evento del calendario.
  manejar(evento) {
    switch (evento.tipo) {
      case 'llegada': this.llegada(); break;
      case 'leer': this.leer(evento); break;
      case 'resultado_lectura': this.resultadoLectura(evento); break;
      case 'bloqueo': this.bloqueo(evento); break;
      case 'buscar_mesa': this.buscarMesa(evento); break;
      case 'fin_comer': this.finComer(evento); break;
      case 'entregar': this.entregar(evento); break;
      case 'fin_lavado': this.finLavado(evento); break;
      case 'relevo': this.relevo(); break;
      case 'piloto': this.turnoPiloto(evento); break;
      case 'reparacion_auto': this.reparacionAutomatica(evento); break;
      case 'fin_turno': this.finTurno(); break;
      default: throw new Error(`Evento desconocido: ${evento.tipo}`);
    }
    this.cerrarAccion();
  }

  // ---------- llegadas y torniquetes ----------

  // Llegada externa: un token nuevo en En_fila y un autómata Estudiante nuevo.
  llegada() {
    const linea = this.elegirLinea();
    const id = `E${this.siguienteId++}`;
    this.estudiantes.set(id, {
      id, linea: linea.id, mesa: null, tLlegada: this.reloj.tiempo, tServido: null,
      automata: new Automata(MODELOS.estudiante, id),
      registro: new Automata(MODELOS.registroAcceso, `${id}.registro`)
    });
    linea.fila.push(id);
    this.stats.llegadas++;
    const { desborde } = this.red.agregarTokens('En_fila', 1);
    this.emitir('llegada', { id, linea: linea.id });
    if (desborde > 0) {
      this.stats.desbordes++;
      this.sumar(PUNTOS.desborde, 'desborde');
      this.emitir('desborde', { lugar: 'En_fila', exceso: desborde });
    }
    this.programarLectura(linea);
  }

  // El estudiante elige la fila más corta entre las líneas abiertas que no están bloqueadas.
  elegirLinea() {
    const disponibles = this.lineas.filter((l) => l.abierta);
    const sinBloqueo = disponibles.filter((l) => !l.torniquete.puede('reiniciar'));
    const candidatas = sinBloqueo.length > 0 ? sinBloqueo : disponibles;
    const carga = (l) => l.fila.length + (l.mostrador ? 1 : 0);
    const minimo = Math.min(...candidatas.map(carga));
    return this.azar.elegir(candidatas.filter((l) => carga(l) === minimo));
  }

  // El estudiante en cabeza acerca el carné cuando el mostrador queda libre.
  programarLectura(linea) {
    if (linea.lecturaPendiente || linea.mostrador !== null || linea.fila.length === 0) return;
    const cabeza = this.estudiantes.get(linea.fila[0]);
    if (cabeza.registro.estado !== cabeza.registro.inicial) return; // ya tiene acceso registrado
    if (!puedeConjunto('leer', [linea.torniquete, linea.contador])) return; // bloqueado
    linea.lecturaPendiente = true;
    this.reloj.programarEn(TIEMPOS.presentarCarne, { tipo: 'leer', linea: linea.id });
  }

  // Evento no controlable leer (común a Torniquete y Contador_Rechazos).
  leer({ linea: idLinea }) {
    const linea = this.lineas[idLinea - 1];
    if (linea.fila.length === 0 || !puedeConjunto('leer', [linea.torniquete, linea.contador])) {
      linea.lecturaPendiente = false;
      return;
    }
    ejecutarConjunto('leer', [linea.torniquete, linea.contador]);
    this.emitir('torniquete', { linea: idLinea, evento: 'leer', estudiante: linea.fila[0] });
    this.reloj.programarEn(TIEMPOS.lectura, { tipo: 'resultado_lectura', linea: idLinea });
  }

  // Resultado de la lectura: acceso_ok o rechazo (no controlables, con semilla).
  resultadoLectura({ linea: idLinea }) {
    const linea = this.lineas[idLinea - 1];
    const cabeza = this.estudiantes.get(linea.fila[0]);
    if (linea.azar.ocurre(this.turno.pRechazo)) {
      ejecutarConjunto('rechazo', [linea.torniquete, linea.contador]);
      this.stats.rechazos++;
      this.emitir('torniquete', { linea: idLinea, evento: 'rechazo', estudiante: cabeza.id });
      // Tras el tercer rechazo el contador solo deja habilitado bloqueo.
      if (puedeConjunto('bloqueo', [linea.torniquete, linea.contador])) {
        this.reloj.programarEn(TIEMPOS.bloqueo, { tipo: 'bloqueo', linea: idLinea });
      } else {
        this.reloj.programarEn(TIEMPOS.reintento, { tipo: 'leer', linea: idLinea });
      }
    } else {
      // acceso_ok es común al torniquete y al registro del estudiante leído.
      ejecutarConjunto('acceso_ok', [linea.torniquete, cabeza.registro]);
      linea.lecturaPendiente = false;
      this.emitir('torniquete', { linea: idLinea, evento: 'acceso_ok', estudiante: cabeza.id });
    }
  }

  bloqueo({ linea: idLinea }) {
    const linea = this.lineas[idLinea - 1];
    ejecutarConjunto('bloqueo', [linea.torniquete, linea.contador]);
    linea.lecturaPendiente = false;
    linea.intentosReparacion = 0;
    linea.ayudaUsada = false;
    this.stats.bloqueos++;
    this.emitir('torniquete', { linea: idLinea, evento: 'bloqueo' });
    this.emitir('alerta', { nivel: 'fallo', texto: `Torniquete ${idLinea} bloqueado` });
    // Política automática: la reparación ocurre en un instante fijo de simulación.
    if (this.politica?.reparar) this.reloj.programarEn(this.politica.reparar.demora, { tipo: 'reparacion_auto', linea: idLinea });
  }

  reparacionAutomatica({ linea: idLinea }) {
    if (this.lineas[idLinea - 1].torniquete.puede('reiniciar')) this.reparar(idLinea, this.politica.reparar.palabra);
  }

  // ---------- mesas, menaje y lavado ----------

  // buscar_mesa (uc): el estudiante deja el mostrador con su bandeja.
  buscarMesa({ estudiante }) {
    const est = this.estudiantes.get(estudiante);
    const linea = this.lineas[est.linea - 1];
    est.automata.ejecutar('buscar_mesa');
    linea.mostrador = null;
    this.esperandoMesa.push(est.id);
    this.emitir('estudiante', { id: est.id, evento: 'buscar_mesa' });
    this.programarLectura(linea);
    this.intentarSentar();
  }

  // t_sentarse (automática): Con_bandeja + Mesa_libre -> Almorzando.
  intentarSentar() {
    while (this.esperandoMesa.length > 0 && this.red.habilitada('t_sentarse')) {
      const est = this.estudiantes.get(this.esperandoMesa.shift());
      this.red.disparar('t_sentarse');
      est.automata.ejecutar('sentarse');
      const libres = this.mesas.map((ocupante, i) => (ocupante === null ? i : -1)).filter((i) => i >= 0);
      est.mesa = this.azar.elegir(libres);
      this.mesas[est.mesa] = est.id;
      this.reloj.programarEn(this.azar.entre(TIEMPOS.comerMin, TIEMPOS.comerMax), { tipo: 'fin_comer', estudiante: est.id });
      this.emitir('estudiante', { id: est.id, evento: 'sentarse', mesa: est.mesa });
    }
  }

  finComer({ estudiante }) {
    this.quierenTerminar.push(estudiante);
    this.emitir('estudiante', { id: estudiante, evento: 'fin_comer' });
    this.intentarTerminar();
  }

  // t_terminar (automática): Almorzando + Espacio_carro -> Mesa_libre + Bandeja_sucia + Salida.
  intentarTerminar() {
    while (this.quierenTerminar.length > 0 && this.red.habilitada('t_terminar')) {
      const est = this.estudiantes.get(this.quierenTerminar.shift());
      this.red.disparar('t_terminar');
      est.automata.ejecutar('terminar');
      const mesa = est.mesa;
      this.mesas[mesa] = null;
      est.mesa = null;
      this.reloj.programarEn(TIEMPOS.entregar, { tipo: 'entregar', estudiante: est.id });
      this.emitir('estudiante', { id: est.id, evento: 'terminar', mesa });
    }
    this.intentarSentar();
    this.revisarLavado();
  }

  // entregar (uc): el estudiante deja el menaje en el carro y sale.
  entregar({ estudiante }) {
    const est = this.estudiantes.get(estudiante);
    est.automata.ejecutar('entregar');
    this.stats.completados++;
    const rapido = est.tServido - est.tLlegada < PUNTOS.esperaRapida;
    this.sumar(PUNTOS.completado + (rapido ? PUNTOS.servicioRapido : 0), 'completado');
    this.otorgar('primera_bandeja');
    this.emitir('estudiante', { id: est.id, evento: 'entregar', palabra: est.automata.palabra() });
    this.estudiantes.delete(est.id);
    if (this.todosSalieron()) this.finTurno();
  }

  // El turno puede cerrar antes del margen final cuando ya no llegará nadie y todos salieron.
  todosSalieron() {
    if (!this.modoMarkov) return this.stats.completados === this.turno.estudiantes;
    return this.k >= this.pasosTurno && this.stats.completados === this.stats.llegadas;
  }

  // t_lavar (automática, varios servidores): hay tantos lavados en curso como
  // el grado de habilitación min(⌊Bandeja_sucia/5⌋, Personal_lavado).
  revisarLavado() {
    const grado = this.red.grado('t_lavar');
    while (this.lavados.length < grado) {
      this.lavados.push(this.reloj.programarEn(TIEMPOS.lavar, { tipo: 'fin_lavado' }));
      this.emitir('lavado', { fase: 'inicio', enCurso: this.lavados.length });
    }
    while (this.lavados.length > grado) {
      this.reloj.cancelar(this.lavados.pop());
      this.emitir('lavado', { fase: 'cancelado', enCurso: this.lavados.length });
    }
  }

  finLavado() {
    this.lavados.shift(); // el temporizador más antiguo es el que vence
    if (this.red.habilitada('t_lavar')) {
      this.red.disparar('t_lavar');
      this.stats.lavados++;
      this.sumar(PUNTOS.lavado, 'lavado');
      if (this.stats.lavados >= META_LOGRO_LAVADOS) this.otorgar('ciclo_cerrado');
      this.emitir('lavado', { fase: 'fin', enCurso: this.lavados.length });
    }
    this.intentarTerminar();
  }

  // Cambio de turno del personal (externo, cada 120 s): llegan permisos de relevo.
  relevo() {
    const { agregados } = this.red.agregarTokens('Relevo', 2);
    this.stats.relevos++;
    this.reloj.programarEn(TIEMPOS.relevo, { tipo: 'relevo' });
    this.emitir('relevo', { agregados, disponibles: this.red.tokens('Relevo') });
    this.emitir('alerta', { nivel: 'info', texto: `Cambio de turno: ${this.red.tokens('Relevo')} permisos de relevo` });
    this.guardarVerde();
  }

  // ---------- guardar y restaurar ----------

  // Guarda el estado en un punto de decisión si el radar está en verde.
  guardarVerde() {
    if (this.radar.estado !== 'verde') return;
    this.instantaneaVerde = this.instantanea();
    this.emitir('instantanea', { cual: 'verde' });
  }

  instantanea() {
    return structuredClone({
      reloj: this.reloj.exportar(), azar: this.azar.estado, monitor: this.monitor,
      sinMonitor: this.sinMonitor, red: this.red.exportar(),
      lineas: this.lineas.map((l) => ({
        abierta: l.abierta,
        torniquete: l.torniquete.exportar(), contador: l.contador.exportar(), azar: l.azar.estado, fila: l.fila,
        mostrador: l.mostrador, lecturaPendiente: l.lecturaPendiente, pilotoPendiente: l.pilotoPendiente,
        intentosReparacion: l.intentosReparacion, ayudaUsada: l.ayudaUsada
      })),
      k: this.k, fase2: this.fase2, llegadasDelPaso: this.llegadasDelPaso ?? 0,
      markov: this.markov ? {
        oleada: this.markov.oleada.exportar(), mesas: this.markov.mesas.exportar(),
        azarMarkov: this.azarMarkov.estado, azarLlegadas: this.azarLlegadas.estado
      } : null,
      estudiantes: [...this.estudiantes.values()].map((e) => ({
        id: e.id, linea: e.linea, mesa: e.mesa, tLlegada: e.tLlegada, tServido: e.tServido,
        automata: e.automata.exportar(), registro: e.registro.exportar()
      })),
      siguienteId: this.siguienteId, mesas: this.mesas, esperandoMesa: this.esperandoMesa,
      quierenTerminar: this.quierenTerminar, lavados: this.lavados, puntaje: this.puntaje,
      rachaServir: this.rachaServir, stats: this.stats, radar: this.radar,
      decisionEnAmarillo: this.decisionEnAmarillo
    });
  }

  // cual: 'verde' (último marcado verde) o 'inicio' (comienzo del turno), para el registrador.
  restaurar(dato, cual = 'verde') {
    const d = structuredClone(dato);
    this.crearRed(d.monitor);
    this.red.importar(d.red);
    this.sinMonitor = d.sinMonitor;
    this.reloj.importar(d.reloj);
    this.reloj.pausado = false;
    this.azar.estado = d.azar;
    d.lineas.forEach((l, i) => {
      const linea = this.lineas[i];
      linea.torniquete.importar(l.torniquete);
      linea.contador.importar(l.contador);
      linea.azar.estado = l.azar;
      Object.assign(linea, {
        abierta: l.abierta ?? linea.id <= 2,
        fila: l.fila, mostrador: l.mostrador, lecturaPendiente: l.lecturaPendiente,
        pilotoPendiente: l.pilotoPendiente, intentosReparacion: l.intentosReparacion, ayudaUsada: l.ayudaUsada
      });
    });
    this.k = d.k ?? 0;
    if (d.fase2) this.fase2 = d.fase2;
    this.llegadasDelPaso = d.llegadasDelPaso;
    if (this.markov && d.markov) {
      this.markov.oleada.importar(d.markov.oleada);
      this.markov.mesas.importar(d.markov.mesas);
      this.azarMarkov.estado = d.markov.azarMarkov;
      this.azarLlegadas.estado = d.markov.azarLlegadas;
    }
    this.estudiantes = new Map(d.estudiantes.map((e) => {
      const automata = new Automata(MODELOS.estudiante, e.id);
      const registro = new Automata(MODELOS.registroAcceso, `${e.id}.registro`);
      automata.importar(e.automata);
      registro.importar(e.registro);
      return [e.id, { id: e.id, linea: e.linea, mesa: e.mesa, tLlegada: e.tLlegada, tServido: e.tServido, automata, registro }];
    }));
    Object.assign(this, {
      siguienteId: d.siguienteId, mesas: d.mesas, esperandoMesa: d.esperandoMesa,
      quierenTerminar: d.quierenTerminar, lavados: d.lavados, puntaje: d.puntaje,
      rachaServir: d.rachaServir, stats: d.stats, radar: d.radar,
      decisionEnAmarillo: d.decisionEnAmarillo,
      gameOver: null, terminado: false, radarEmitido: null
    });
    this.emitir('restaurado', { cual });
    this.cerrarAccion();
  }
}
