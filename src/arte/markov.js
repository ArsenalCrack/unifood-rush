// Dibujo en código de la Fase 2 (docs/arte.md, sección 9): un color e ícono por
// estado de cada cadena (de menor a mayor riesgo), mapa de calor de P, barras de
// pi^(n) y de pi contra frecuencias, chip de estado y botón «Exportar Event Log».
// Lo usan PanelMarkov, el HUD, la planta, Resultados y hoja-arte-fase2.html.

import { PALETA, TEXTO, estilo, estiloMono, css, sombra } from './paleta.js';
import { icono } from './formas.js';
import { boton } from './ui.js';

export const ESTADOS_MARKOV = {
  Oleada: {
    Baja: { color: PALETA.operacion, icono: 'personas1', texto: 'BAJA', detalle: '4 por paso' },
    Media: { color: PALETA.espera, icono: 'personas2', texto: 'MEDIA', detalle: '10 por paso' },
    Alta: { color: PALETA.fallo, icono: 'personas3', texto: 'ALTA', detalle: '18 por paso' }
  },
  Mesas: {
    '0-25%': { color: PALETA.mantenimiento, icono: 'cuarto1', texto: '0-25 %', detalle: '0 a 4 mesas' },
    '25-50%': { color: PALETA.operacion, icono: 'cuarto2', texto: '25-50 %', detalle: '5 a 9 mesas' },
    '50-75%': { color: PALETA.espera, icono: 'cuarto3', texto: '50-75 %', detalle: '10 a 14 mesas' },
    '75-100%': { color: PALETA.fallo, icono: 'cuarto4', texto: '75-100 %', detalle: '15 a 20 mesas' }
  }
};

export function estiloEstado(cadena, estado) {
  return ESTADOS_MARKOV[cadena]?.[estado] ?? { color: PALETA.acero, icono: 'raya', texto: String(estado), detalle: '' };
}

// Colores del panel analítico.
export const PANEL = {
  fondo: 0x0f1524,
  serieTeorica: 0x7fb0f5,   // pi teórico
  serieObservada: PALETA.relevo, // frecuencias de la partida
  resalte: 0xf0c53a,        // fila del estado actual
  rejilla: 0xffffff
};

const mezclar = (a, b, t) => {
  const c = (d) => Math.round(((a >> d) & 255) + (((b >> d) & 255) - ((a >> d) & 255)) * t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

// Mapa de calor de una probabilidad: de blanco (0) a rojo de fallo (1).
export function colorCalor(v) {
  return mezclar(0xfbfaf6, PALETA.fallo, Math.max(0, Math.min(1, v)));
}

// Interpola dos colores con un tween de duración ms y llama a pintar(color) en cada cuadro.
export function tweenColor(escena, desde, hasta, duracion, pintar) {
  if (desde === hasta) { pintar(hasta); return null; }
  return escena.tweens.addCounter({
    from: 0, to: 1, duration: duracion,
    onUpdate: (tw) => pintar(mezclar(desde, hasta, tw.getValue())),
    onComplete: () => pintar(hasta)
  });
}

const num = (v, decimales) => (Number.isFinite(v) ? v.toFixed(decimales).replace('.', ',') : '∞');

// Mapa de calor de una matriz con sus valores. Devuelve los objetos creados.
// resaltar: índice de la fila del estado actual (borde amarillo).
export function mapaCalor(escena, x, y, { M, filas, columnas = filas, ancho = 62, alto = 30, decimales = 2, resaltar = null, tam = 11, etiquetas = true }) {
  const objetos = [];
  const g = escena.add.graphics();
  objetos.push(g);
  M.forEach((fila, i) => fila.forEach((v, j) => {
    const cx = x + j * ancho;
    const cy = y + i * alto;
    g.fillStyle(colorCalor(v), 1);
    g.fillRect(cx, cy, ancho - 2, alto - 2);
    const t = escena.add.text(cx + (ancho - 2) / 2, cy + (alto - 2) / 2, num(v, decimales),
      estiloMono(tam, v > 0.55 ? TEXTO.claro : TEXTO.oscuro, { fontStyle: 'bold' })).setOrigin(0.5);
    objetos.push(t);
  }));
  if (etiquetas) {
    filas.forEach((nombre, i) => objetos.push(escena.add.text(x - 6, y + i * alto + (alto - 2) / 2, nombre, estilo(10, TEXTO.claro)).setOrigin(1, 0.5)));
    columnas.forEach((nombre, j) => objetos.push(escena.add.text(x + j * ancho + (ancho - 2) / 2, y - 4, nombre, estilo(10, TEXTO.tenue)).setOrigin(0.5, 1)));
  }
  if (resaltar != null) {
    g.lineStyle(2.5, PANEL.resalte, 1);
    g.strokeRect(x - 2, y + resaltar * alto - 2, columnas.length * ancho + 2, alto + 2);
  }
  return objetos;
}

// Barras agrupadas por categoría con escala de 0 a max y sus valores encima.
// series: [{ valores, color | colores, etiqueta }]. Devuelve los objetos y las barras.
export function barras(escena, x, y, { ancho, alto, categorias, series, max = 1, decimales = 3, tam = 9.5, colorCategoria = null }) {
  const objetos = [];
  const g = escena.add.graphics();
  objetos.push(g);
  // Escala: líneas en 0, 25, 50, 75 y 100 % de max.
  for (let i = 0; i <= 4; i++) {
    const yy = y + alto - (alto * i) / 4;
    g.lineStyle(1, PANEL.rejilla, i === 0 ? 0.55 : 0.12);
    g.lineBetween(x, yy, x + ancho, yy);
    objetos.push(escena.add.text(x - 4, yy, num((max * i) / 4, 2), estilo(8.5, TEXTO.tenue)).setOrigin(1, 0.5));
  }
  const grupo = ancho / categorias.length;
  const anchoBarra = Math.min(34, (grupo - 14) / series.length);
  const rects = [];
  categorias.forEach((categoria, c) => {
    const x0 = x + c * grupo + (grupo - anchoBarra * series.length) / 2;
    series.forEach((serie, s) => {
      const v = serie.valores[c] ?? 0;
      const h = (alto * Math.min(v, max)) / max;
      const color = serie.colores?.[c] ?? serie.color ?? colorCategoria?.(c) ?? PALETA.mantenimiento;
      const rect = escena.add.rectangle(x0 + s * anchoBarra + anchoBarra / 2, y + alto, anchoBarra - 3, Math.max(1, h), color).setOrigin(0.5, 1);
      rect.valorObjetivo = h;
      rects.push(rect);
      objetos.push(rect);
      // Con muchas barras juntas, los valores van más pequeños para no encimarse.
      const tamValor = anchoBarra < 26 ? Math.min(tam, 7.5) : tam;
      objetos.push(escena.add.text(rect.x, y + alto - h - 2, num(v, decimales), estiloMono(tamValor, TEXTO.claro)).setOrigin(0.5, 1));
    });
    objetos.push(escena.add.text(x + c * grupo + grupo / 2, y + alto + 4, categoria, estilo(10, TEXTO.claro)).setOrigin(0.5, 0));
  });
  return { objetos, rects };
}

// Leyenda de series (cuadrito de color y nombre).
export function leyenda(escena, x, y, series) {
  const objetos = [];
  let xx = x;
  for (const serie of series) {
    const g = escena.add.graphics();
    g.fillStyle(serie.color, 1);
    g.fillRect(xx, y - 4, 9, 9);
    const t = escena.add.text(xx + 13, y, serie.etiqueta, estilo(9.5, TEXTO.tenue)).setOrigin(0, 0.5);
    objetos.push(g, t);
    xx += 22 + t.width;
  }
  return objetos;
}

// Chip de estado de una cadena: fondo del color del estado, ícono y nombre.
// fijar(estado) cambia el color con un tween de 300 ms.
export function chipEstado(escena, x, y, cadena, estado, { ancho = 96, alto = 22, tam = 11, resolucion = null } = {}) {
  const fondo = escena.add.graphics();
  const marca = escena.add.graphics();
  const extra = resolucion ? { fontStyle: 'bold', resolution: resolucion } : { fontStyle: 'bold' };
  const texto = escena.add.text(10, 0, '', estilo(tam, TEXTO.oscuro, extra)).setOrigin(0, 0.5);
  const chip = escena.add.container(x, y, [fondo, marca, texto]);
  let actual = null;
  let color = PALETA.acero;
  const pintar = (c) => {
    color = c;
    fondo.clear();
    fondo.fillStyle(c, 1);
    fondo.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, alto / 2);
    fondo.lineStyle(1.5, 0xffffff, 0.45);
    fondo.strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, alto / 2);
  };
  chip.fijar = (nuevo, animar = true) => {
    if (nuevo === actual) return chip;
    actual = nuevo;
    const e = estiloEstado(cadena, nuevo);
    marca.clear();
    icono(marca, e.icono, -ancho / 2 + alto / 2 + 1, 0, sombra(e.color, 0.35));
    texto.setText(e.texto).setX(-ancho / 2 + alto + 5);
    if (animar) tweenColor(escena, color, e.color, 300, pintar);
    else pintar(e.color);
    return chip;
  };
  chip.estadoActual = () => actual;
  chip.color = () => color;
  pintar(color);
  if (estado) chip.fijar(estado, false);
  return chip;
}

// Botón «Exportar Event Log»: reposo, al pasar el mouse (más claro) y al descargar.
export function botonExportar(escena, x, y, alPulsar, { ancho = 150, alto = 30, tam = 11 } = {}) {
  const b = boton(escena, x, y, 'EXPORTAR EVENT LOG', { ancho, alto, tam, color: PALETA.mantenimiento }, () => alPulsar?.(b));
  b.descargando = (texto = 'DESCARGANDO…', ms = 1100) => {
    if (b.ocupado) return b;
    b.ocupado = true;
    const etiqueta = b.texto.text; // cada botón vuelve a su propia etiqueta
    b.fijarColor(PALETA.operacion).fijarTexto(texto);
    escena.time.delayedCall(ms, () => {
      b.ocupado = false;
      if (b.active) b.fijarColor(PALETA.mantenimiento).fijarTexto(etiqueta);
    });
    return b;
  };
  return b;
}

// Texto de un vector de probabilidades: (0,300; 0,413; 0,288).
export function vectorTexto(v, decimales = 3) {
  return `(${v.map((x) => num(x, decimales)).join('; ')})`;
}

export { num as numero, css as colorCSS };
