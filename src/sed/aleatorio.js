// Generador pseudoaleatorio con semilla (algoritmo mulberry32).
// Con la misma semilla la partida es reproducible: mismas llegadas,
// mismos rechazos y mismos tiempos de almuerzo.
// Núcleo formal: no depende del motor de juego ni del DOM.

export class Aleatorio {
  constructor(semilla = 1) {
    this.estado = semilla >>> 0; // entero de 32 bits; es todo el estado del generador
  }

  // Siguiente número en [0, 1).
  siguiente() {
    this.estado = (this.estado + 0x6D2B79F5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Real uniforme en [min, max).
  entre(min, max) {
    return min + (max - min) * this.siguiente();
  }

  // Entero uniforme en [min, max] (ambos incluidos).
  entero(min, max) {
    return Math.floor(this.entre(min, max + 1));
  }

  // Verdadero con probabilidad p.
  ocurre(p) {
    return this.siguiente() < p;
  }

  // Elemento al azar de una lista.
  elegir(lista) {
    return lista[Math.floor(this.siguiente() * lista.length)];
  }
}

// Versión funcional clásica: devuelve una función que entrega números en [0, 1).
export function mulberry32(semilla) {
  const g = new Aleatorio(semilla);
  return () => g.siguiente();
}
