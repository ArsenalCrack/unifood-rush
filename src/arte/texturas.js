// Convierte los dibujos en código de formas.js en texturas de Phaser, una por
// cada estado de cada autómata y una por cada tipo de token. Así cada sprite
// solo cambia de textura cuando el núcleo le avisa de un cambio de estado.

import * as F from './formas.js';
import { ESTADOS, PALETA, sombra } from './paleta.js';

// clave -> { w, h, origenX, origenY }: tamaño y punto base de cada textura.
export const TEXTURAS = {};

function crear(escena, clave, w, h, bx, by, dibujar) {
  const g = escena.make.graphics({ x: 0, y: 0 }, false);
  dibujar(g, bx, by);
  g.generateTexture(clave, w, h);
  g.destroy();
  TEXTURAS[clave] = { w, h, origenX: bx / w, origenY: by / h };
}

// Lista de pasos (para la barra de progreso de la escena Arranque).
export function pasosDeTexturas(escena) {
  const pasos = [];
  for (const estado of Object.keys(ESTADOS.Estudiante)) {
    pasos.push(() => crear(escena, `est_${estado}`, 40, 64, 20, 56, (g, x, y) => F.estudiante(g, x, y, estado)));
  }
  // Variante de Almorzando: ya terminó de comer y espera hueco en el carro.
  pasos.push(() => crear(escena, 'est_espera_carro', 40, 64, 20, 56, (g, x, y) =>
    F.persona(g, x, y, PALETA.operacion, { bandeja: 'limpia', icono: 'admiracion', colorIcono: PALETA.fallo })));
  pasos.push(() => crear(escena, 'personal_linea', 40, 64, 20, 56, (g, x, y) =>
    F.persona(g, x, y, PALETA.personal, { gorro: true, icono: 'cucharon', colorIcono: sombra(PALETA.personal, 0.45) })));
  pasos.push(() => crear(escena, 'personal_lavado', 40, 64, 20, 56, (g, x, y) =>
    F.persona(g, x, y, PALETA.personal, { gorro: true, icono: 'gota', colorIcono: sombra(PALETA.mantenimiento, 0.45) })));
  for (const estado of Object.keys(ESTADOS.Torniquete)) {
    pasos.push(() => crear(escena, `tor_${estado}`, 60, 76, 34, 62, (g, x, y) => F.torniquete(g, x, y, estado)));
  }
  pasos.push(() => crear(escena, 'mesa_libre', 56, 44, 28, 26, (g, x, y) => F.mesa(g, x, y, true)));
  pasos.push(() => crear(escena, 'mesa_ocupada', 56, 44, 28, 26, (g, x, y) => F.mesa(g, x, y, false)));
  pasos.push(() => crear(escena, 'carro', 64, 48, 32, 24, F.carro));
  pasos.push(() => crear(escena, 'fregadero', 72, 68, 36, 48, F.fregadero));
  pasos.push(() => crear(escena, 'tablero', 48, 60, 24, 54, F.tablero));
  pasos.push(() => crear(escena, 'bandeja_limpia', 26, 16, 13, 7, (g, x, y) => F.bandeja(g, x, y, false)));
  pasos.push(() => crear(escena, 'bandeja_sucia', 26, 16, 13, 7, (g, x, y) => F.bandeja(g, x, y, true)));
  pasos.push(() => crear(escena, 'hueco', 26, 16, 13, 7, (g, x, y) => {
    g.lineStyle(1.2, 0xffffff, 0.55);
    g.strokePoints([{ x, y: y - 5.5 }, { x: x + 11, y }, { x, y: y + 5.5 }, { x: x - 11, y }], true);
  }));
  pasos.push(() => crear(escena, 'ficha_relevo', 18, 20, 9, 9, (g, x, y) => F.fichaRelevo(g, x, y)));
  pasos.push(() => crear(escena, 'escudo', 16, 18, 8, 8, (g, x, y) => F.escudo(g, x, y)));
  pasos.push(() => crear(escena, 'punto', 8, 8, 4, 4, (g, x, y) => { g.fillStyle(0xffffff, 1); g.fillCircle(x, y, 4); }));
  pasos.push(() => crear(escena, 'nube', 16, 16, 8, 8, (g, x, y) => {
    g.fillStyle(0xffffff, 0.35); g.fillCircle(x, y, 8);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(x, y, 5);
  }));
  return pasos;
}

// Crea una imagen con el punto base de su textura sobre (px, py).
export function poner(escena, clave, px, py) {
  const t = TEXTURAS[clave];
  return escena.add.image(px, py, clave).setOrigin(t.origenX, t.origenY);
}

// Cambia la textura de una imagen conservando su punto base.
export function cambiar(imagen, clave) {
  if (imagen.texture.key === clave) return imagen;
  const t = TEXTURAS[clave];
  return imagen.setTexture(clave).setOrigin(t.origenX, t.origenY);
}
