// Autómata observador para sistemas parcialmente observados (Σ = Σo ∪ Σuo).
// Entrega el conjunto de estados en que la máquina podría estar.
// En UniFood Rush todos los eventos son observables (Σuo = ∅), así que el
// observador coincide con el autómata: se incluye para completar el núcleo y
// se prueba con esa propiedad.
// Núcleo formal: sin Phaser ni DOM.

export class Observador {
  constructor(json) {
    this.json = json;
    this.noObservables = new Set(json.eventos.filter((e) => e.observable === false).map((e) => e.id));
    this.delta = new Map(json.estados.map((q) => [q, new Map()]));
    for (const [origen, evento, destino] of json.transiciones) this.delta.get(origen).set(evento, destino);
    this.actual = this.alcanceNoObservable([json.inicial]);
  }

  // Estados alcanzables desde el conjunto usando solo eventos no observables.
  alcanceNoObservable(conjunto) {
    const alcance = new Set(conjunto);
    const pendientes = [...conjunto];
    while (pendientes.length > 0) {
      const q = pendientes.pop();
      for (const [evento, destino] of this.delta.get(q)) {
        if (this.noObservables.has(evento) && !alcance.has(destino)) {
          alcance.add(destino);
          pendientes.push(destino);
        }
      }
    }
    return [...alcance].sort();
  }

  // Conjunto de estados posibles ahora mismo.
  estimacion() {
    return [...this.actual];
  }

  // Paso del observador desde un conjunto con un evento observable.
  paso(conjunto, evento) {
    const destinos = [];
    for (const q of conjunto) {
      const destino = this.delta.get(q).get(evento);
      if (destino !== undefined) destinos.push(destino);
    }
    return this.alcanceNoObservable(destinos);
  }

  // Actualiza la estimación al observar σ.
  observar(evento) {
    if (this.noObservables.has(evento)) throw new Error(`${evento} no es observable`);
    const nueva = this.paso(this.actual, evento);
    if (nueva.length === 0) throw new Error(`El evento ${evento} no es posible desde {${this.actual}}`);
    this.actual = nueva;
    return this.estimacion();
  }

  // Construcción de subconjuntos completa: devuelve el autómata observador.
  construir() {
    const nombre = (conjunto) => `{${conjunto.join(',')}}`;
    const inicial = this.alcanceNoObservable([this.json.inicial]);
    const estados = new Map([[nombre(inicial), inicial]]);
    const transiciones = [];
    const pendientes = [inicial];
    const observables = this.json.eventos.filter((e) => e.observable !== false).map((e) => e.id);
    while (pendientes.length > 0) {
      const conjunto = pendientes.shift();
      for (const evento of observables) {
        const destino = this.paso(conjunto, evento);
        if (destino.length === 0) continue;
        if (!estados.has(nombre(destino))) {
          estados.set(nombre(destino), destino);
          pendientes.push(destino);
        }
        transiciones.push([nombre(conjunto), evento, nombre(destino)]);
      }
    }
    return { estados: [...estados.keys()], conjuntos: Object.fromEntries(estados), inicial: nombre(inicial), transiciones };
  }
}
