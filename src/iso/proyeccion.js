// Proyección isométrica 2:1 (pseudo-3D). Solo aritmética: no depende del motor de juego.
// Una celda (x, y) a altura z se dibuja en:
//   pantallaX = (x − y) · TILE_W / 2
//   pantallaY = (x + y) · TILE_H / 2 − z · TILE_H
// más el origen de la planta. El punto devuelto es el centro de la celda.

import { TILE_W, TILE_H, ORIGEN } from '../config.js';

// Celda (x, y, z) -> píxel del mundo.
export function aPantalla(x, y, z = 0) {
  return {
    x: ORIGEN.x + (x - y) * (TILE_W / 2),
    y: ORIGEN.y + (x + y) * (TILE_H / 2) - z * TILE_H
  };
}

// Píxel del mundo -> celda (x, y) en el suelo, redondeada a la celda más cercana.
export function aCelda(px, py) {
  const a = (px - ORIGEN.x) / (TILE_W / 2); // x − y
  const b = (py - ORIGEN.y) / (TILE_H / 2); // x + y
  return { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) };
}

// Orden de profundidad: el objeto con mayor (x + y) está más cerca y tapa al lejano.
export function profundidad(x, y) {
  return x + y;
}

// Cuatro vértices del rombo de una celda (arriba, derecha, abajo, izquierda).
export function rombo(x, y, escala = 1) {
  const c = aPantalla(x, y);
  const w = (TILE_W / 2) * escala;
  const h = (TILE_H / 2) * escala;
  return [
    { x: c.x, y: c.y - h }, { x: c.x + w, y: c.y }, { x: c.x, y: c.y + h }, { x: c.x - w, y: c.y }
  ];
}
