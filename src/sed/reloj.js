// Reloj de simulación por eventos discretos.
// Guarda un calendario de eventos futuros (cola de prioridad por tiempo) y
// avanza de evento en evento. Entre eventos el estado del sistema no cambia.
// Núcleo formal: no depende del motor de juego ni del DOM.

import { VELOCIDADES } from '../config.js';

export class Reloj {
  // manejador(evento, reloj): función que recibe los eventos que son objetos.
  constructor(manejador = null) {
    this.tiempo = 0;        // tiempo de simulación en segundos
    this.velocidad = 1;     // 1, 2, 4 u 8
    this.pausado = false;
    this.cola = [];         // calendario ordenado por (t, sec)
    this.sec = 0;           // desempata eventos con el mismo tiempo (orden de llegada)
    this.manejador = manejador;
  }

  // Programa un evento en el tiempo absoluto t. Devuelve su identificador.
  // El evento puede ser una función o un objeto { tipo, ... } para el manejador.
  programar(t, evento) {
    const item = { t: Math.max(t, this.tiempo), sec: this.sec++, evento };
    // Inserción ordenada por búsqueda binaria: la cola siempre queda ordenada.
    let izq = 0;
    let der = this.cola.length;
    while (izq < der) {
      const mitad = (izq + der) >> 1;
      const otro = this.cola[mitad];
      if (otro.t < item.t || (otro.t === item.t && otro.sec < item.sec)) izq = mitad + 1;
      else der = mitad;
    }
    this.cola.splice(izq, 0, item);
    return item.sec;
  }

  // Programa un evento dentro de dt segundos de simulación.
  programarEn(dt, evento) {
    return this.programar(this.tiempo + dt, evento);
  }

  // Quita del calendario el evento con ese identificador.
  cancelar(id) {
    const i = this.cola.findIndex((item) => item.sec === id);
    if (i >= 0) this.cola.splice(i, 1);
    return i >= 0;
  }

  // Avanza dt segundos reales (multiplicados por la velocidad) y dispara, en
  // orden de tiempo, todos los eventos vencidos. Devuelve cuántos disparó.
  // limite: instante de simulación que no se pasa (el borde del paso k de la Fase 2).
  avanzar(dt, limite = Infinity) {
    if (this.pausado || dt <= 0) return 0;
    return this.avanzarHasta(Math.min(this.tiempo + dt * this.velocidad, limite));
  }

  // Avanza hasta el instante absoluto fin disparando los eventos con t <= fin.
  avanzarHasta(fin) {
    if (this.pausado || fin <= this.tiempo) return 0;
    let disparados = 0;
    while (this.cola.length > 0 && this.cola[0].t <= fin) {
      const item = this.cola.shift();
      this.tiempo = item.t; // el reloj salta al instante del evento
      if (typeof item.evento === 'function') item.evento(this);
      else if (this.manejador) this.manejador(item.evento, this);
      disparados++;
      if (this.pausado) return disparados; // un evento puede detener la simulación
      if (disparados > 100000) throw new Error('Reloj: demasiados eventos en un solo avance');
    }
    this.tiempo = fin;
    return disparados;
  }

  pausar() { this.pausado = true; }
  reanudar() { this.pausado = false; }
  alternarPausa() { this.pausado = !this.pausado; return this.pausado; }

  cambiarVelocidad(v) {
    if (!VELOCIDADES.includes(v)) throw new Error(`Velocidad no válida: ${v}`);
    this.velocidad = v;
  }

  // Tiempo del próximo evento (o Infinity si el calendario está vacío).
  proximo() {
    return this.cola.length > 0 ? this.cola[0].t : Infinity;
  }

  // Copia del estado para guardar y restaurar una partida (solo eventos objeto).
  exportar() {
    return {
      tiempo: this.tiempo, velocidad: this.velocidad, sec: this.sec,
      cola: this.cola.map((i) => ({ t: i.t, sec: i.sec, evento: structuredClone(i.evento) }))
    };
  }

  importar(dato) {
    this.tiempo = dato.tiempo;
    this.velocidad = dato.velocidad;
    this.sec = dato.sec;
    this.cola = dato.cola.map((i) => ({ t: i.t, sec: i.sec, evento: structuredClone(i.evento) }));
  }
}
