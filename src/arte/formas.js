// Funciones de dibujo en código (sin archivos de imagen). Reciben un objeto
// Graphics de Phaser y dibujan alrededor de un punto base (cx, cy): el centro
// de la celda en el suelo. Luz desde arriba a la izquierda: la cara izquierda
// es más clara que la derecha. Las usan el juego y hoja-arte.html.

import { PALETA, ESTADOS, sombra } from './paleta.js';

const poligono = (g, puntos, color, alfa = 1) => {
  g.fillStyle(color, alfa);
  g.fillPoints(puntos.map(([x, y]) => ({ x, y })), true);
};

// Rombo del suelo (una celda de 64 x 32 px si a = 32 y b = 16).
export function losa(g, cx, cy, color, a = 32, b = 16, alfa = 1) {
  poligono(g, [[cx, cy - b], [cx + a, cy], [cx, cy + b], [cx - a, cy]], color, alfa);
}

// Caja isométrica: base de semiejes (a, b) centrada en (cx, cy) y altura h.
export function caja(g, cx, cy, a, b, h, color, colorTapa = sombra(color, 0.25)) {
  poligono(g, [[cx - a, cy], [cx, cy + b], [cx, cy + b - h], [cx - a, cy - h]], sombra(color, -0.12)); // cara izquierda
  poligono(g, [[cx, cy + b], [cx + a, cy], [cx + a, cy - h], [cx, cy + b - h]], sombra(color, -0.32)); // cara derecha
  poligono(g, [[cx, cy - b - h], [cx + a, cy - h], [cx, cy + b - h], [cx - a, cy - h]], colorTapa);    // tapa
}

// Prisma sobre un rectángulo de celdas [x0, x1] x [y0, y1] con altura h en px.
// "centro" convierte celda -> píxel. Sirve para piezas largas (mostradores).
export function prisma(g, centro, x0, y0, x1, y1, h, color, colorTapa = sombra(color, 0.25)) {
  const a = centro(x0, y0);
  const b = centro(x1, y0);
  const c = centro(x1, y1);
  const d = centro(x0, y1);
  poligono(g, [[d.x, d.y], [c.x, c.y], [c.x, c.y - h], [d.x, d.y - h]], sombra(color, -0.12)); // cara y = y1
  poligono(g, [[c.x, c.y], [b.x, b.y], [b.x, b.y - h], [c.x, c.y - h]], sombra(color, -0.32)); // cara x = x1
  poligono(g, [[a.x, a.y - h], [b.x, b.y - h], [c.x, c.y - h], [d.x, d.y - h]], colorTapa);    // tapa
}

export function sombraSuelo(g, cx, cy, a = 9, b = 4) {
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(cx, cy, a * 2, b * 2);
}

// Íconos de estado: figuras simples dentro de una insignia oscura de radio 7.
export function icono(g, tipo, cx, cy, color = 0xffffff, conInsignia = true) {
  if (conInsignia) {
    g.fillStyle(PALETA.fondo, 0.92); g.fillCircle(cx, cy, 7.5);
    g.lineStyle(1.5, color, 1); g.strokeCircle(cx, cy, 7.5);
  }
  g.fillStyle(color, 1);
  g.lineStyle(1.8, color, 1);
  switch (tipo) {
    case 'puntos': [-3.5, 0, 3.5].forEach((dx) => g.fillCircle(cx + dx, cy, 1.4)); break;
    case 'raya': g.lineBetween(cx - 4, cy, cx + 4, cy); break;
    case 'visto': g.lineBetween(cx - 4, cy, cx - 1, cy + 3); g.lineBetween(cx - 1, cy + 3, cx + 4, cy - 3); break;
    case 'equis': g.lineBetween(cx - 3.5, cy - 3.5, cx + 3.5, cy + 3.5); g.lineBetween(cx - 3.5, cy + 3.5, cx + 3.5, cy - 3.5); break;
    case 'bandeja': g.fillRoundedRect(cx - 4.5, cy - 2, 9, 4, 1.5); break;
    case 'pregunta':
      g.beginPath(); g.arc(cx, cy - 1.6, 2.6, Math.PI, Math.PI * 0.45, false); g.strokePath();
      g.lineBetween(cx + 0.4, cy + 0.8, cx + 0.4, cy + 1.6); g.fillCircle(cx + 0.4, cy + 4, 1.1); break;
    case 'cubiertos':
      g.lineBetween(cx - 2.5, cy - 4, cx - 2.5, cy + 4); g.lineBetween(cx + 2.5, cy - 1, cx + 2.5, cy + 4);
      g.fillEllipse(cx + 2.5, cy - 2.4, 3, 4.2); break;
    case 'flecha':
      g.lineBetween(cx - 4, cy, cx + 3, cy); g.lineBetween(cx + 0.5, cy - 3, cx + 4, cy); g.lineBetween(cx + 0.5, cy + 3, cx + 4, cy); break;
    case 'candado':
      g.fillRoundedRect(cx - 3.5, cy - 0.5, 7, 5, 1);
      g.beginPath(); g.arc(cx, cy - 0.5, 2.4, Math.PI, 0, false); g.strokePath(); break;
    case 'gota':
      g.fillCircle(cx, cy + 1.2, 2.8); g.fillTriangle(cx - 2.4, cy, cx + 2.4, cy, cx, cy - 4.5); break;
    case 'cucharon':
      g.fillCircle(cx - 1.5, cy + 2, 2.6); g.lineBetween(cx, cy + 0.5, cx + 4, cy - 4); break;
    case 'admiracion': g.lineBetween(cx, cy - 4, cx, cy + 1); g.fillCircle(cx, cy + 3.8, 1.2); break;
    default: g.fillCircle(cx, cy, 2);
  }
}

// Persona (token "estudiante" o "personal"). (cx, cy) son los pies.
// opciones: bandeja 'limpia' | 'sucia' | null, gorro (personal), icono, colorIcono.
export function persona(g, cx, cy, colorCuerpo, opciones = {}) {
  sombraSuelo(g, cx, cy, 8, 3.5);
  g.fillStyle(sombra(colorCuerpo, -0.35), 1);
  g.fillRect(cx - 4, cy - 6, 3.2, 6); g.fillRect(cx + 0.8, cy - 6, 3.2, 6);          // piernas
  g.fillStyle(colorCuerpo, 1);
  g.fillRoundedRect(cx - 5.5, cy - 19, 11, 14, 3.5);                                 // cuerpo
  g.fillStyle(sombra(colorCuerpo, -0.25), 1);
  g.fillRoundedRect(cx + 1.5, cy - 19, 4, 14, { tl: 0, bl: 0, tr: 3.5, br: 3.5 });   // lado en sombra
  g.fillStyle(PALETA.piel, 1);
  g.fillCircle(cx, cy - 23.5, 4.6);                                                  // cabeza
  if (opciones.gorro) {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - 4.6, cy - 30.5, 9.2, 5, 2);
  } else {
    g.fillStyle(0x3b2b20, 1);
    g.fillRoundedRect(cx - 4.6, cy - 28.6, 9.2, 3.6, 1.8);                           // cabello
  }
  if (opciones.bandeja) bandeja(g, cx + 6, cy - 11, opciones.bandeja === 'sucia', 0.8);
  if (opciones.icono) icono(g, opciones.icono, cx, cy - 39, opciones.colorIcono ?? colorCuerpo);
}

// Estudiante dibujado según el estado de su autómata.
export function estudiante(g, cx, cy, estado) {
  const { color, icono: ico } = ESTADOS.Estudiante[estado];
  const bandejaDe = { Recibiendo_Bandeja: 'limpia', Buscando_Mesa: 'limpia', Almorzando: 'limpia' }[estado] ?? null;
  persona(g, cx, cy, color, { bandeja: bandejaDe, icono: ico, colorIcono: sombra(color, 0.25) });
}

// Bandeja: token de Bandeja_limpia (clara) o Bandeja_sucia (marrón con restos).
export function bandeja(g, cx, cy, sucia = false, escala = 1) {
  const a = 11 * escala;
  const b = 5.5 * escala;
  const color = sucia ? PALETA.bandejaSucia : PALETA.bandejaLimpia;
  losa(g, cx, cy + 1.5 * escala, sombra(color, -0.4), a, b);
  losa(g, cx, cy, color, a, b);
  losa(g, cx, cy, sombra(color, sucia ? -0.18 : -0.08), a * 0.72, b * 0.72);
  if (sucia) {
    g.fillStyle(0x4a3317, 1); g.fillCircle(cx - 2 * escala, cy, 1.5 * escala);
    g.fillStyle(PALETA.relevo, 1); g.fillCircle(cx + 3 * escala, cy - 0.5 * escala, 1.2 * escala);
  }
}

// Mesa de un puesto. La marca verde indica el token de Mesa_libre.
export function mesa(g, cx, cy, libre = true) {
  sombraSuelo(g, cx, cy + 3, 22, 9);
  caja(g, cx, cy + 2, 4, 2, 9, sombra(PALETA.madera, -0.3));          // pata
  caja(g, cx, cy - 7, 21, 10.5, 3.5, PALETA.madera);                  // tablero
  if (libre) {
    losa(g, cx, cy - 10.5, PALETA.operacion, 8, 4);
    losa(g, cx, cy - 10.5, sombra(PALETA.operacion, 0.45), 4, 2);
  }
}

// Torniquete dibujado según el estado de su autómata.
export function torniquete(g, cx, cy, estado) {
  const { color, icono: ico } = ESTADOS.Torniquete[estado];
  sombraSuelo(g, cx, cy + 2, 16, 7);
  caja(g, cx, cy, 13, 6.5, 24, PALETA.acero);                          // cuerpo
  caja(g, cx, cy - 24, 13, 6.5, 4, color, sombra(color, 0.3));         // banda de luz de estado
  g.lineStyle(3, sombra(PALETA.acero, -0.45), 1);                      // brazos
  g.lineBetween(cx - 4, cy - 12, cx - 20, cy - 6);
  g.lineBetween(cx - 4, cy - 12, cx - 15, cy - 20);
  g.fillStyle(sombra(PALETA.acero, -0.5), 1); g.fillCircle(cx - 4, cy - 12, 3);
  icono(g, ico, cx, cy - 42, sombra(color, 0.3));
}

// Carro de menaje: lugares Espacio_carro (huecos) y Bandeja_sucia.
export function carro(g, cx, cy) {
  sombraSuelo(g, cx, cy + 6, 26, 10);
  g.fillStyle(0x222831, 1); g.fillCircle(cx - 16, cy + 9, 3.5); g.fillCircle(cx + 16, cy + 9, 3.5); g.fillCircle(cx, cy + 15, 3.5);
  caja(g, cx, cy + 2, 26, 13, 12, sombra(PALETA.acero, -0.15), sombra(PALETA.acero, -0.35));
}

// Estación de lavado (t_lavar): pila con agua.
export function fregadero(g, cx, cy) {
  caja(g, cx, cy, 31, 15.5, 18, PALETA.acero);
  losa(g, cx, cy - 18, PALETA.mantenimiento, 22, 11);
  losa(g, cx - 3, cy - 19, sombra(PALETA.mantenimiento, 0.45), 9, 4);
  g.lineStyle(3, sombra(PALETA.acero, -0.4), 1);
  g.lineBetween(cx + 14, cy - 22, cx + 14, cy - 34); g.lineBetween(cx + 14, cy - 34, cx + 6, cy - 31); // grifo
}

// Tablero de relevo (lugar Relevo y monitores).
export function tablero(g, cx, cy) {
  sombraSuelo(g, cx, cy + 1, 14, 5);
  caja(g, cx, cy, 2.5, 1.2, 30, sombra(PALETA.muro, -0.3));
  poligono(g, [[cx - 20, cy - 44], [cx + 20, cy - 34], [cx + 20, cy - 14], [cx - 20, cy - 24]], sombra(PALETA.fondo, 0.12));
  g.lineStyle(2, PALETA.relevo, 1);
  g.strokePoints([{ x: cx - 20, y: cy - 44 }, { x: cx + 20, y: cy - 34 }, { x: cx + 20, y: cy - 14 }, { x: cx - 20, y: cy - 24 }], true);
}

// Ficha de permiso de relevo (token de Relevo): disco naranja con dos flechas.
export function fichaRelevo(g, cx, cy, r = 7) {
  g.fillStyle(sombra(PALETA.relevo, -0.4), 1); g.fillCircle(cx, cy + 1.5, r);
  g.fillStyle(PALETA.relevo, 1); g.fillCircle(cx, cy, r);
  g.lineStyle(1.6, 0xffffff, 1);
  g.lineBetween(cx - 4, cy - 1.8, cx + 3, cy - 1.8); g.lineBetween(cx + 1, cy - 3.8, cx + 3.4, cy - 1.8);
  g.lineBetween(cx + 4, cy + 2, cx - 3, cy + 2); g.lineBetween(cx - 1, cy + 4, cx - 3.4, cy + 2);
}

// Escudo (token de los lugares monitor Minimo_lavado y Minimo_linea).
export function escudo(g, cx, cy, s = 1) {
  const c = PALETA.mantenimiento;
  poligono(g, [[cx - 6 * s, cy - 6 * s], [cx + 6 * s, cy - 6 * s], [cx + 6 * s, cy + 1 * s], [cx, cy + 8 * s], [cx - 6 * s, cy + 1 * s]], sombra(c, -0.35));
  poligono(g, [[cx - 4.5 * s, cy - 4.5 * s], [cx + 4.5 * s, cy - 4.5 * s], [cx + 4.5 * s, cy + 0.5 * s], [cx, cy + 6 * s], [cx - 4.5 * s, cy + 0.5 * s]], sombra(c, 0.25));
}

// Suelo ajedrezado de columnas x filas celdas. "centro" convierte celda -> píxel.
export function suelo(g, columnas, filas, centro) {
  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      const c = centro(x, y);
      losa(g, c.x, c.y, (x + y) % 2 === 0 ? PALETA.suelo : sombra(PALETA.suelo, -0.07));
    }
  }
}

// Muro del fondo entre dos puntos del suelo, con altura h en píxeles.
export function muro(g, p1, p2, h = 44, color = PALETA.muro) {
  poligono(g, [[p1.x, p1.y], [p2.x, p2.y], [p2.x, p2.y - h], [p1.x, p1.y - h]], color);
  g.lineStyle(3, sombra(color, 0.3), 1);
  g.lineBetween(p1.x, p1.y - h, p2.x, p2.y - h);
}
