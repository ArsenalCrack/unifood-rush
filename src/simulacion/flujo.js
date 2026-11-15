// Motor de simulación del comedor, parte 1: lo que ocurre solo.
// Eventos NO controlables y transiciones automáticas, programados en el reloj
// con el generador con semilla. Sin Phaser ni DOM: se prueba en Node.
// Regla: los estados cambian solo con Automata.ejecutar (δ) y los recursos
// solo con RedPetri.disparar o con eventos externos del reloj (agregarTokens).

import { Reloj } from '../sed/reloj.js';
import { Aleatorio } from '../sed/aleatorio.js';
import { Automata } from '../sed/automata.js';
import { RedPetri } from '../sed/redPetri.js';
import { Lenguaje } from '../sed/lenguaje.js';
import { componerVarios, supervisor, puedeConjunto, ejecutarConjunto } from '../sed/composicion.js';
import { explorar } from '../sed/cobertura.js';
import { MODELOS } from '../sed/modelos/index.js';
import { TIEMPOS, PUNTOS, TURNOS, SEMILLA, RADAR_PROFUNDIDAD, META_LOGRO_LAVADOS } from '../config.js';

export const RAZON_SUPERVISOR =
  '¬(servir ∧ Registro = Sin_acceso): el torniquete no registró acceso_ok para este estudiante';

export class FlujoComedor {
  constructor({ turno = TURNOS[0], semilla = SEMILLA, monitor = true, piloto = false, logros = [] } = {}) {
    this.turno = turno;
    this.semilla = semilla;
    this.azar = new Aleatorio(semilla * 1000 + turno.id);
    this.reloj = new Reloj((evento) => this.manejar(evento));
    this.piloto = piloto;
    this.sinMonitor = !monitor; // verdadero mientras todo el turno se juegue sin monitores
    this.lenguaje = new Lenguaje(MODELOS.reparacion);

    // Supervisor de la ficha: Estudiante ‖ Torniquete ‖ Registro_Acceso con
    // Violacion como estado prohibido. Se calcula una vez sobre el producto completo.
    this.composicion = componerVarios(
      [MODELOS.estudiante, MODELOS.torniquete, MODELOS.registroAcceso], { completo: true });
    this.supervisor = supervisor(this.composicion, (tupla) => tupla[2] === 'Violacion', RAZON_SUPERVISOR);

    // Cada línea tiene su torniquete compuesto con su contador de rechazos.
    this.lineas = [1, 2].map((id) => ({
      id,
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
    this.logros = new Set(logros);
    this.oyentes = new Map();
    this.terminado = false;
    this.gameOver = null;
    this.resumen = null;
    this.instantaneaVerde = null;
    this.crearRed(monitor);
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
    const porJugador = cambio.tipo === 'disparo' && this.red.transiciones[cambio.t].disparo === 'jugador';
    if (previo === 'amarillo' && r.estado === 'verde' && porJugador) this.stats.deadlocksEvitados++;
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
    this.gameOver = {
      tiempo: this.reloj.tiempo,
      marcado: this.red.comoObjeto(),
      secuencia: [...this.red.secuencia],
      descripcion: MODELOS.comedor.deadlock.descripcion,
      prevencion: this.red.json.deadlock.prevencion
    };
    this.reloj.pausar();
    this.emitir('game_over', this.gameOver);
  }

  // ---------- arranque y bucle ----------

  iniciar() {
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
    this.trasCambioRed({ tipo: 'inicio', etiqueta: 'M0' });
    this.guardarVerde();
    this.instantaneaInicio = this.instantaneaVerde; // comienzo del turno, antes de toda decisión
    this.cerrarAccion();
    this.emitir('inicio', {});
  }

  // Lo único que hace el bucle del juego: avanzar el reloj.
  avanzar(dt) {
    if (this.terminado || this.gameOver) return 0;
    return this.reloj.avanzar(dt);
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

  // El estudiante elige la fila más corta entre las que no están bloqueadas.
  elegirLinea() {
    const abiertas = this.lineas.filter((l) => !l.torniquete.puede('reiniciar'));
    const candidatas = abiertas.length > 0 ? abiertas : this.lineas;
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
    this.emitir('torniquete', { linea: idLinea, evento: 'leer' });
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
    if (this.stats.completados === this.turno.estudiantes) this.finTurno();
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
    if (this.radar.estado === 'verde') this.instantaneaVerde = this.instantanea();
  }

  instantanea() {
    return structuredClone({
      reloj: this.reloj.exportar(), azar: this.azar.estado, monitor: this.monitor,
      sinMonitor: this.sinMonitor, red: this.red.exportar(),
      lineas: this.lineas.map((l) => ({
        torniquete: l.torniquete.exportar(), contador: l.contador.exportar(), azar: l.azar.estado, fila: l.fila,
        mostrador: l.mostrador, lecturaPendiente: l.lecturaPendiente, pilotoPendiente: l.pilotoPendiente,
        intentosReparacion: l.intentosReparacion, ayudaUsada: l.ayudaUsada
      })),
      estudiantes: [...this.estudiantes.values()].map((e) => ({
        id: e.id, linea: e.linea, mesa: e.mesa, tLlegada: e.tLlegada, tServido: e.tServido,
        automata: e.automata.exportar(), registro: e.registro.exportar()
      })),
      siguienteId: this.siguienteId, mesas: this.mesas, esperandoMesa: this.esperandoMesa,
      quierenTerminar: this.quierenTerminar, lavados: this.lavados, puntaje: this.puntaje,
      rachaServir: this.rachaServir, stats: this.stats, radar: this.radar
    });
  }

  restaurar(dato) {
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
        fila: l.fila, mostrador: l.mostrador, lecturaPendiente: l.lecturaPendiente,
        pilotoPendiente: l.pilotoPendiente, intentosReparacion: l.intentosReparacion, ayudaUsada: l.ayudaUsada
      });
    });
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
      gameOver: null, terminado: false, radarEmitido: null
    });
    this.emitir('restaurado', {});
    this.cerrarAccion();
  }
}
