// Autómata de estado finito determinista G = (Q, Σ, δ, q0, Qm).
// Cada máquina o entidad del juego tiene su propia instancia y SOLO cambia
// de estado con ejecutar(σ), que consulta la tabla δ.
// Núcleo formal: no depende del motor de juego ni del DOM.

export class Automata {
  constructor(json, id = json.nombre) {
    this.json = json;
    this.id = id;
    this.nombre = json.nombre;
    this.estados = [...json.estados];                 // Q
    this.inicial = json.inicial;                      // q0
    this.marcados = new Set(json.marcados);           // Qm
    this.eventos = new Map(json.eventos.map((e) => [e.id, e])); // Σ con sus atributos
    this.porCodigo = new Map(json.eventos.map((e) => [e.codigo, e.id]));

    // Tabla δ: estado -> (evento -> estado destino).
    this.delta = new Map(this.estados.map((q) => [q, new Map()]));
    for (const [origen, evento, destino] of json.transiciones) {
      if (!this.delta.has(origen) || !this.delta.has(destino)) {
        throw new Error(`${this.nombre}: estado desconocido en (${origen}, ${evento}, ${destino})`);
      }
      if (!this.eventos.has(evento)) throw new Error(`${this.nombre}: evento desconocido ${evento}`);
      if (this.delta.get(origen).has(evento)) {
        throw new Error(`${this.nombre}: no determinista en δ(${origen}, ${evento})`);
      }
      this.delta.get(origen).set(evento, destino);
    }

    this.estado = this.inicial;
    this.historial = [];   // eventos ejecutados: la palabra observada
    this.oyentes = [];     // vistas que escuchan los cambios de estado
  }

  // Γ(q): eventos con transición definida desde q (por defecto, el estado actual).
  eventosActivos(q = this.estado) {
    return [...this.delta.get(q).keys()];
  }

  // δ(q, σ) sin efectos: devuelve el destino o undefined si no está definida.
  siguiente(q, evento) {
    return this.delta.get(q)?.get(evento);
  }

  // ¿δ(estado actual, σ) está definida?
  puede(evento) {
    return this.delta.get(this.estado).has(evento);
  }

  // Ejecuta σ: único punto en el que el autómata cambia de estado.
  ejecutar(evento) {
    const destino = this.siguiente(this.estado, evento);
    if (destino === undefined) {
      throw new Error(`δ(${this.estado}, ${evento}) no está definida en ${this.nombre}`);
    }
    const origen = this.estado;
    this.estado = destino;
    const paso = { evento, origen, destino, codigo: this.eventos.get(evento).codigo };
    this.historial.push(paso);
    for (const oyente of this.oyentes) oyente(paso, this);
    return destino;
  }

  esMarcado(q = this.estado) {
    return this.marcados.has(q);
  }

  esControlable(evento) {
    return this.eventos.get(evento)?.controlable === true;
  }

  esObservable(evento) {
    return this.eventos.get(evento)?.observable !== false;
  }

  // Palabra observada (códigos de una letra), opcionalmente los últimos n eventos.
  palabra(n = this.historial.length) {
    return this.historial.slice(-n).map((p) => p.codigo).join('');
  }

  // ¿La palabra (cadena de códigos o lista de eventos) lleva de q0 a un estado
  // marcado? No modifica el estado actual: sirve para comparar con JFLAP.
  acepta(palabra) {
    const simbolos = typeof palabra === 'string' ? [...palabra] : palabra;
    let q = this.inicial;
    for (const s of simbolos) {
      const evento = this.eventos.has(s) ? s : this.porCodigo.get(s);
      q = evento === undefined ? undefined : this.siguiente(q, evento);
      if (q === undefined) return false; // δ no definida: la palabra se rechaza
    }
    return this.marcados.has(q);
  }

  // Suscribe una función a los cambios de estado. Devuelve cómo cancelarla.
  alCambiar(oyente) {
    this.oyentes.push(oyente);
    return () => { this.oyentes = this.oyentes.filter((o) => o !== oyente); };
  }

  reiniciar() {
    this.estado = this.inicial;
    this.historial = [];
  }

  // Estado serializable para guardar y restaurar una partida.
  exportar() {
    return { estado: this.estado, historial: this.historial.map((p) => ({ ...p })) };
  }

  importar(dato) {
    this.estado = dato.estado;
    this.historial = dato.historial.map((p) => ({ ...p }));
  }
}
