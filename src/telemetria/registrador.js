// Registrador de eventos de la partida (Event Log, docs/log.md).
// Escucha los cambios del núcleo (eventos de δ y disparos de la red) y anota, por
// cada estudiante (un caso), cuándo empieza y termina cada actividad, con qué
// recurso y en qué estado de la cadena Oleada. Las marcas de tiempo son
// FECHA_BASE_LOG + tiempo de simulación, nunca la hora del computador.
// No depende del motor de juego ni del DOM.

import { FECHA_BASE_LOG, PROYECTO_LOG } from '../config.js';

// Actividades en orden normativo (docs/log.md, sección 2).
export const ACTIVIDADES = ['Esperar_fila', 'Pasar_torniquete', 'Recibir_bandeja', 'Buscar_mesa', 'Almorzar', 'Entregar_menaje'];
export const ACTIVIDAD_FINAL = 'Entregar_menaje';

const idCaso = (idEstudiante) => `EST-${String(Number(idEstudiante.slice(1))).padStart(4, '0')}`;
const mesa = (i) => `Mesa_${String(i + 1).padStart(2, '0')}`;

export class Registrador {
  constructor(comedor, { fechaBase = FECHA_BASE_LOG, proyecto = PROYECTO_LOG } = {}) {
    this.comedor = comedor;
    this.fechaBase = fechaBase;
    this.base = Date.parse(fechaBase);
    this.proyecto = proyecto;
    this.semilla = comedor.semilla;
    this.oyentes = [];
    this.vaciar();
    this.instantaneas = {};
    comedor.on('*', (evento) => this.alEvento(evento));
  }

  vaciar() {
    this.casos = new Map();     // Case_ID -> caso, en orden de llegada
    this.porEstudiante = new Map(); // id del estudiante en el núcleo -> Case_ID
    this.pendientes = new Set(); // casos que todavía no llegan a Salida
    this.filas = [];            // una por actividad, en el orden en que empezaron
    this.cerrados = 0;
    this.quitados = 0;          // eventos quitados al reintentar tras un interbloqueo
  }

  // ---------- consulta ----------

  // ISO 8601 con milisegundos a partir del tiempo de simulación (s).
  marca(t) {
    return t == null ? '' : new Date(this.base + Math.round(t * 1000)).toISOString();
  }

  estadoMarkov() {
    return this.comedor.markov ? this.comedor.markov.oleada.estado : '-';
  }

  resumen() {
    return { casos: this.casos.size, abiertos: this.casos.size - this.cerrados, cerrados: this.cerrados, eventos: this.filas.length };
  }

  // Filas del CSV con las 7 columnas del esquema fijo.
  filasLog({ soloCerrados = false } = {}) {
    const filas = soloCerrados ? this.filas.filter((f) => this.casos.get(f.caso).completo) : this.filas;
    return filas.map((f) => this.comoFila(f));
  }

  comoFila(f) {
    return {
      Case_ID: f.caso, Activity: f.actividad, Timestamp_Inicio: this.marca(f.inicio),
      Timestamp_Fin: this.marca(f.fin), Resource_ID: f.recurso, Markov_State: f.markov,
      Lifecycle: f.fin == null ? 'start' : 'complete'
    };
  }

  // Últimas n actividades terminadas (para la lista de la tecla L).
  ultimos(n = 10) {
    const terminadas = [];
    for (let i = this.filas.length - 1; i >= 0 && terminadas.length < n; i--) {
      if (this.filas[i].fin != null) terminadas.push(this.comoFila(this.filas[i]));
    }
    return terminadas;
  }

  // Casos con sus atributos y sus actividades, para el XES.
  trazas({ soloCerrados = false } = {}) {
    const lista = [];
    for (const caso of this.casos.values()) {
      if (soloCerrados && !caso.completo) continue;
      lista.push({
        id: caso.id,
        atributos: { oleada_llegada: caso.oleada, linea: caso.linea, turno: caso.turno, semilla: this.semilla, completo: caso.completo },
        actividades: caso.filas.map((f) => ({
          actividad: f.actividad, recurso: f.recurso, markov: f.markov,
          inicio: this.marca(f.inicio), fin: f.fin == null ? null : this.marca(f.fin)
        }))
      });
    }
    return lista;
  }

  // Tiempo medio de ciclo de los casos cerrados (de la llegada a Salida), en s de simulación.
  tiempoCicloMedio() {
    let suma = 0;
    let n = 0;
    for (const caso of this.casos.values()) {
      if (!caso.completo) continue;
      suma += caso.filas.at(-1).fin - caso.filas[0].inicio;
      n++;
    }
    return n > 0 ? suma / n : null;
  }

  // Espera acumulada (s) por zona del comedor, para el mapa de calor (tecla H).
  // Incluye las actividades abiertas hasta el instante actual.
  esperas() {
    const ahora = this.comedor.reloj.tiempo;
    const zonas = { fila: [0, 0, 0], mostrador: [0, 0, 0], mesa: 0, carro: 0 };
    for (const caso of this.casos.values()) {
      const filas = caso.filas;
      filas.forEach((f, i) => {
        const fin = f.fin ?? ahora;
        if (f.actividad === 'Esperar_fila') zonas.fila[caso.linea - 1] += fin - f.inicio;
        if (f.actividad === 'Buscar_mesa') zonas.mesa += fin - f.inicio;
        // Hueco antes de una actividad: espera sin actividad (docs/log.md, sección 2).
        if (i > 0 && filas[i - 1].fin != null) {
          const hueco = f.inicio - filas[i - 1].fin;
          if (f.actividad === 'Recibir_bandeja') zonas.mostrador[caso.linea - 1] += hueco;
          if (f.actividad === 'Entregar_menaje') zonas.carro += hueco;
        }
      });
      // Estudiante que ya terminó de comer y espera Espacio_carro.
      const ultima = filas.at(-1);
      if (!caso.completo && ultima?.actividad === 'Almorzar' && ultima.fin != null) zonas.carro += ahora - ultima.fin;
      if (!caso.completo && ultima?.actividad === 'Pasar_torniquete' && ultima.fin != null) zonas.mostrador[caso.linea - 1] += ahora - ultima.fin;
    }
    return zonas;
  }

  on(oyente) {
    this.oyentes.push(oyente);
  }

  avisar(tipo, datos) {
    for (const oyente of this.oyentes) oyente({ tipo, ...datos });
  }

  // ---------- escritura: cada cambio del núcleo abre o cierra una actividad ----------

  alEvento(e) {
    switch (e.tipo) {
      case 'llegada': this.llegada(e); break;
      case 'torniquete': this.torniquete(e); break;
      case 'estudiante': this.estudiante(e); break;
      case 'instantanea': this.instantaneas[e.cual] = this.exportar(); break;
      case 'restaurado': this.restaurar(e.cual); break;
      default:
    }
  }

  caso(idEstudiante) {
    return this.casos.get(this.porEstudiante.get(idEstudiante)) ?? null;
  }

  abrir(caso, actividad, recurso) {
    if (caso.abierta) this.cerrar(caso); // nunca hay dos actividades abiertas en un caso
    const fila = {
      n: this.filas.length, caso: caso.id, actividad, inicio: this.comedor.reloj.tiempo, fin: null, recurso,
      markov: this.estadoMarkov()
    };
    caso.filas.push(fila);
    caso.abierta = fila;
    this.filas.push(fila);
    this.avisar('abrir', { fila });
  }

  cerrar(caso, actividad = null, recurso = null) {
    const fila = caso.abierta;
    if (!fila || (actividad && fila.actividad !== actividad)) return;
    fila.fin = this.comedor.reloj.tiempo;
    if (recurso) fila.recurso = recurso;
    caso.abierta = null;
    this.avisar('cerrar', { fila });
  }

  llegada({ id, linea }) {
    const caso = {
      id: idCaso(id), estudiante: id, linea, turno: this.comedor.turno.id, oleada: this.estadoMarkov(),
      filas: [], abierta: null, completo: false
    };
    this.casos.set(caso.id, caso);
    this.porEstudiante.set(id, caso.id);
    this.pendientes.add(caso);
    this.abrir(caso, 'Esperar_fila', `Linea_${linea}`);
  }

  torniquete({ evento, linea, estudiante }) {
    const caso = estudiante ? this.caso(estudiante) : null;
    if (!caso) return;
    if (evento === 'leer') this.abrir(caso, 'Pasar_torniquete', `Torniquete_${linea}`);
    else if (evento === 'acceso_ok' || evento === 'rechazo') this.cerrar(caso, 'Pasar_torniquete');
  }

  estudiante({ id, evento, linea, mesa: numero }) {
    const caso = this.caso(id);
    if (!caso) return;
    switch (evento) {
      case 'servir': this.abrir(caso, 'Recibir_bandeja', `Linea_${linea}`); break;
      case 'buscar_mesa': this.cerrar(caso, 'Recibir_bandeja'); this.abrir(caso, 'Buscar_mesa', 'Sin_mesa'); break;
      case 'sentarse':
        this.cerrar(caso, 'Buscar_mesa', mesa(numero));
        this.abrir(caso, 'Almorzar', mesa(numero));
        break;
      case 'fin_comer': this.cerrar(caso, 'Almorzar'); break;
      case 'terminar': this.abrir(caso, 'Entregar_menaje', 'Lavado'); break;
      case 'entregar':
        this.cerrar(caso, 'Entregar_menaje');
        caso.completo = true;
        this.cerrados++;
        this.pendientes.delete(caso);
        this.avisar('caso_cerrado', { caso: caso.id });
        break;
      default:
    }
  }

  // ---------- guardar y restaurar (reintento tras un interbloqueo) ----------

  // El log solo crece: las filas nuevas se agregan al final y una fila abierta solo
  // cambia al cerrarse. Basta guardar cuántas filas y casos había y cómo estaban las
  // filas abiertas; así guardar no copia el log entero (cada 120 s en turnos largos).
  exportar() {
    const abiertas = [];
    for (const caso of this.pendientes) if (caso.abierta) abiertas.push([caso.abierta.n, caso.abierta.recurso]);
    return { nFilas: this.filas.length, nCasos: this.casos.size, abiertas };
  }

  importar(dato) {
    this.filas.length = dato.nFilas;
    for (const [n, recurso] of dato.abiertas) Object.assign(this.filas[n], { fin: null, recurso });
    // Los casos que llegaron después del punto guardado ya no ocurrieron.
    const ids = [...this.casos.keys()];
    for (const id of ids.slice(dato.nCasos)) {
      this.porEstudiante.delete(this.casos.get(id).estudiante);
      this.casos.delete(id);
    }
    this.pendientes = new Set();
    this.cerrados = 0;
    for (const caso of this.casos.values()) {
      caso.filas = caso.filas.filter((f) => f.n < dato.nFilas);
      const ultima = caso.filas.at(-1);
      caso.abierta = ultima && ultima.fin == null ? ultima : null;
      caso.completo = Boolean(ultima && ultima.actividad === ACTIVIDAD_FINAL && ultima.fin != null);
      if (caso.completo) this.cerrados++;
      else this.pendientes.add(caso);
    }
  }

  // La partida volvió a un punto guardado: el registro vuelve al mismo punto y se
  // quitan los eventos que ya no ocurrieron (docs/log.md, sección 7).
  restaurar(cual) {
    const dato = this.instantaneas[cual];
    if (!dato) return;
    const antes = this.filas.length;
    this.importar(dato);
    this.quitados += Math.max(0, antes - this.filas.length);
    this.avisar('restaurado', { quitados: antes - this.filas.length });
  }
}
