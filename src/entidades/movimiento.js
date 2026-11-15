// Movimiento de sprites sobre la rejilla isométrica. Cada sprite guarda su
// posición en celdas (sprite.celda) y se ordena por profundidad (x + y).
// Los movimientos son solo de la vista: no cambian estados ni recursos.

import { aPantalla, profundidad } from '../iso/proyeccion.js';
import { poner } from '../arte/texturas.js';

// Coloca el sprite en el píxel de su celda y actualiza su orden de profundidad.
export function colocar(sprite, sesgo = 0) {
  const p = aPantalla(sprite.celda.x, sprite.celda.y);
  sprite.setPosition(p.x, p.y);
  sprite.setDepth(profundidad(sprite.celda.x, sprite.celda.y) * 10 + (sprite.sesgo ?? sesgo));
  return sprite;
}

// Recorre una ruta de celdas en una duración total (ms), repartida por distancia.
export function caminar(escena, sprite, ruta, duracion, alLlegar = null) {
  if (sprite.caminata) { sprite.caminata.stop(); sprite.caminata = null; }
  const tramos = [];
  let desde = sprite.celda;
  let total = 0;
  for (const punto of ruta) {
    const d = Math.hypot(punto.x - desde.x, punto.y - desde.y);
    if (d > 0.01) { tramos.push({ punto, d }); total += d; desde = punto; }
  }
  const paso = (i) => {
    if (!sprite.active) return;
    if (i >= tramos.length) { sprite.caminata = null; if (alLlegar) alLlegar(sprite); return; }
    const { punto, d } = tramos[i];
    sprite.caminata = escena.tweens.add({
      targets: sprite.celda,
      x: punto.x,
      y: punto.y,
      duration: Math.max(40, duracion * (d / total)),
      onUpdate: () => colocar(sprite),
      onComplete: () => { colocar(sprite); paso(i + 1); }
    });
  };
  paso(0);
}

// Duración (ms) para recorrer una ruta a una velocidad en celdas por segundo.
export function duracionRuta(desde, ruta, velocidad) {
  let total = 0;
  let a = desde;
  for (const b of ruta) { total += Math.hypot(b.x - a.x, b.y - a.y); a = b; }
  return (total / velocidad) * 1000;
}

// Token que viaja de un lugar a otro al dispararse una transición.
export function volar(escena, clave, desde, hacia, duracion = 450, alLlegar = null) {
  const a = aPantalla(desde.x, desde.y, desde.z ?? 0.6);
  const b = aPantalla(hacia.x, hacia.y, hacia.z ?? 0.6);
  const ficha = poner(escena, clave, a.x, a.y).setDepth(5000);
  escena.tweens.add({
    targets: ficha,
    x: b.x,
    y: b.y,
    duration: duracion,
    ease: 'Sine.easeInOut',
    onComplete: () => { ficha.destroy(); if (alLlegar) alLlegar(); }
  });
  return ficha;
}
