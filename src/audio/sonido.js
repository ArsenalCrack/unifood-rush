// Sonidos sintetizados con Web Audio API (sin archivos de audio).
// El contexto se crea con el primer gesto del jugador, como exige el navegador.

let contexto = null;
let silencio = false;

function tono(frecuencia, duracion, { tipo = 'sine', volumen = 0.08, retraso = 0, hasta = null } = {}) {
  if (!contexto || silencio) return;
  const t0 = contexto.currentTime + retraso;
  const oscilador = contexto.createOscillator();
  const ganancia = contexto.createGain();
  oscilador.type = tipo;
  oscilador.frequency.setValueAtTime(frecuencia, t0);
  if (hasta) oscilador.frequency.exponentialRampToValueAtTime(hasta, t0 + duracion);
  ganancia.gain.setValueAtTime(volumen, t0);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
  oscilador.connect(ganancia).connect(contexto.destination);
  oscilador.start(t0);
  oscilador.stop(t0 + duracion + 0.02);
}

export const sonido = {
  // Llamar desde un clic o una tecla.
  activar() {
    try {
      if (!contexto) contexto = new (window.AudioContext || window.webkitAudioContext)();
      if (contexto.state === 'suspended') contexto.resume();
    } catch {
      contexto = null; // sin audio: el juego sigue en silencio
    }
  },
  alternarSilencio() { silencio = !silencio; return silencio; },
  clic() { tono(520, 0.05, { tipo: 'triangle', volumen: 0.05 }); },
  servir() { tono(660, 0.07, { tipo: 'triangle' }); tono(880, 0.09, { tipo: 'triangle', retraso: 0.06 }); },
  acceso() { tono(990, 0.08, { volumen: 0.04 }); },
  rechazo() { tono(220, 0.16, { tipo: 'square', volumen: 0.04 }); },
  bloqueoTorniquete() { [0, 0.16, 0.32].forEach((r) => tono(330, 0.12, { tipo: 'square', volumen: 0.06, retraso: r })); },
  intentoBloqueado() { tono(140, 0.2, { tipo: 'sawtooth', volumen: 0.07, hasta: 80 }); },
  disparo() { tono(440, 0.06, { tipo: 'triangle', volumen: 0.05 }); },
  lavado() { tono(300, 0.25, { tipo: 'sine', volumen: 0.04, hasta: 700 }); },
  reparado() { [523, 659, 784].forEach((f, i) => tono(f, 0.12, { tipo: 'triangle', retraso: i * 0.09 })); },
  error() { tono(180, 0.22, { tipo: 'square', volumen: 0.05 }); },
  desborde() { tono(260, 0.1, { tipo: 'square', volumen: 0.04 }); },
  relevo() { tono(392, 0.12, { tipo: 'triangle' }); tono(587, 0.18, { tipo: 'triangle', retraso: 0.12 }); },
  alarma() { tono(700, 0.18, { tipo: 'square', volumen: 0.05, hasta: 500 }); },
  logro() { [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.16, { tipo: 'triangle', retraso: i * 0.1 })); },
  interbloqueo() { tono(200, 0.9, { tipo: 'sawtooth', volumen: 0.09, hasta: 55 }); },
  finTurno() { [392, 523, 659, 784].forEach((f, i) => tono(f, 0.22, { tipo: 'sine', retraso: i * 0.14 })); },
  // Fase 2: cambios de estado peligrosos de las cadenas de Markov.
  oleadaAlta() { [660, 880, 660].forEach((f, i) => tono(f, 0.12, { tipo: 'square', volumen: 0.05, retraso: i * 0.13 })); },
  riesgo() { tono(520, 0.1, { tipo: 'triangle', volumen: 0.05 }); tono(780, 0.14, { tipo: 'triangle', volumen: 0.05, retraso: 0.1 }); },
  mesasLlenas() { tono(330, 0.18, { tipo: 'triangle', volumen: 0.05, hasta: 260 }); },
  exportar() { [523, 784].forEach((f, i) => tono(f, 0.1, { tipo: 'triangle', retraso: i * 0.08 })); }
};
