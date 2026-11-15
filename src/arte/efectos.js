// Efectos de Phaser 4 con propósito (docs/arte.md): glow en lo seleccionado,
// bloom en eventos críticos y partículas en los flujos. Si un filtro no está
// disponible (por ejemplo sin WebGL), el juego sigue sin ese efecto.

import { PALETA } from './paleta.js';

// Glow sobre un objeto. Devuelve una función que lo quita.
export function resaltar(objeto, color = 0xffffff, fuerza = 4) {
  try {
    objeto.enableFilters();
    const glow = objeto.filters.external.addGlow(color, fuerza, 0, 1, false, 10, 10);
    return () => {
      try { objeto.filters.external.remove(glow, true); } catch { /* el objeto ya no existe */ }
    };
  } catch {
    return () => {};
  }
}

// Bloom de cámara para eventos críticos (fallo, desborde, interbloqueo):
// la imagen se bifurca, se quedan las zonas brillantes, se desenfocan y se
// suman al original. Devuelve pulso(intensidad, ms).
export function crearBloom(escena) {
  const camara = escena.cameras.main;
  let paralelo = null;
  try {
    paralelo = camara.filters.internal.addParallelFilters();
    paralelo.top.addThreshold(0.55, 0.9);
    paralelo.top.addBlur(1, 2, 2, 1);
    paralelo.blend.blendMode = Phaser.BlendModes.ADD;
    paralelo.blend.amount = 0;
    paralelo.active = false;
  } catch {
    paralelo = null;
  }
  let pico = 0;      // intensidad inicial del pulso
  let total = 1;     // duración del pulso en ms
  let restante = 0;  // ms que le quedan
  return {
    // Inicia un destello que se apaga solo.
    pulso(intensidad = 0.6, duracion = 700) {
      if (!paralelo) return;
      pico = intensidad;
      total = duracion;
      restante = duracion;
      paralelo.active = true;
      paralelo.blend.amount = intensidad;
    },
    // Se llama en cada cuadro con el tiempo real: el destello se apaga aunque
    // la simulación esté en pausa.
    actualizar(delta) {
      if (!paralelo || restante <= 0) return;
      restante -= delta;
      if (restante <= 0) {
        paralelo.blend.amount = 0;
        paralelo.active = false;
      } else {
        paralelo.blend.amount = pico * (restante / total) ** 2;
      }
    }
  };
}

// Emisores de partículas de la planta.
export function crearParticulas(escena, puntos) {
  // Vapor del lavado: fluye mientras hay un lavado en curso.
  const vapor = escena.add.particles(puntos.lavado.x, puntos.lavado.y - 24, 'nube', {
    speedY: { min: -34, max: -18 }, speedX: { min: -8, max: 8 },
    scale: { start: 0.45, end: 1.5 }, alpha: { start: 0.55, end: 0 },
    lifespan: 1300, frequency: 130, emitting: false
  }).setDepth(7000);

  // Chispas del torniquete bloqueado.
  const chispas = puntos.torniquetes.map((p) => escena.add.particles(p.x, p.y - 30, 'punto', {
    speed: { min: 30, max: 90 }, angle: { min: 200, max: 340 }, gravityY: 220,
    scale: { start: 0.5, end: 0 }, tint: [PALETA.fallo, PALETA.espera, 0xffffff],
    lifespan: 520, frequency: 90, emitting: false
  }).setDepth(7000));

  // Ráfaga cuando un token pasa por una estación (servir, lavar, relevo).
  const rafaga = escena.add.particles(0, 0, 'punto', {
    speed: { min: 20, max: 70 }, scale: { start: 0.45, end: 0 }, alpha: { start: 0.9, end: 0 },
    lifespan: 420, emitting: false
  }).setDepth(7000);

  // Acumulación en la entrada cuando En_fila se desborda.
  const desborde = escena.add.particles(puntos.entrada.x, puntos.entrada.y - 10, 'punto', {
    speed: { min: 15, max: 60 }, angle: { min: 180, max: 360 }, gravityY: 90,
    scale: { start: 0.6, end: 0 }, tint: PALETA.fallo, lifespan: 600, emitting: false
  }).setDepth(7000);

  return {
    vapor, chispas, rafaga, desborde,
    estallar(x, y, color, cantidad = 8) {
      rafaga.setParticleTint(color);
      rafaga.explode(cantidad, x, y);
    }
  };
}
