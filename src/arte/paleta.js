// Paleta y estilos de UniFood Rush (docs/arte.md). 14 colores base.
// Las caras laterales de los objetos usan el mismo color oscurecido.

export const PALETA = {
  fondo: 0x1d2433,
  suelo: 0xd8d0bd,
  muro: 0x8a7968,
  acero: 0x7d8a93,
  madera: 0xb9814d,
  operacion: 0x2e9e5b,      // estado de operación
  espera: 0xe0b21b,         // estado de espera
  fallo: 0xd64545,          // estado de fallo
  mantenimiento: 0x3b7dd8,  // estado de mantenimiento
  bandejaLimpia: 0xf3f1e7,
  bandejaSucia: 0x8b6a3e,
  personal: 0x7a52c7,
  relevo: 0xf08a24,
  piel: 0xe8b98a
};

// Color e ícono de cada estado de cada autómata (uno distinto por estado).
export const ESTADOS = {
  Estudiante: {
    En_Fila: { color: PALETA.espera, icono: 'puntos' },
    Recibiendo_Bandeja: { color: PALETA.mantenimiento, icono: 'bandeja' },
    Buscando_Mesa: { color: PALETA.relevo, icono: 'pregunta' },
    Almorzando: { color: PALETA.operacion, icono: 'cubiertos' },
    Entregando_Menaje: { color: PALETA.bandejaSucia, icono: 'flecha' },
    Salida: { color: PALETA.acero, icono: 'visto' }
  },
  Torniquete: {
    Listo: { color: PALETA.acero, icono: 'raya' },
    Leyendo: { color: PALETA.espera, icono: 'puntos' },
    Acceso: { color: PALETA.operacion, icono: 'visto' },
    Rechazo: { color: PALETA.relevo, icono: 'equis' },
    Bloqueado: { color: PALETA.fallo, icono: 'candado' }
  }
};

// Colores del radar del árbol de cobertura.
export const RADAR = { verde: PALETA.operacion, amarillo: PALETA.espera, rojo: PALETA.fallo };

// Textos: color en formato CSS y familias tipográficas.
export const TEXTO = {
  claro: '#f3f1e7',
  tenue: '#aab3c2',
  oscuro: '#1d2433',
  verde: '#5fd08a',
  amarillo: '#f0c53a',
  rojo: '#ff7a7a',
  azul: '#7fb0f5',
  naranja: '#f6a04d',
  fuente: 'Trebuchet MS, Verdana, sans-serif',
  mono: 'Consolas, "Courier New", monospace'
};

// Número 0xRRGGBB -> cadena CSS "#rrggbb".
export function css(color) {
  return '#' + color.toString(16).padStart(6, '0');
}

// Mezcla lineal de un color con negro (f < 0) o con blanco (f > 0), f en [-1, 1].
export function sombra(color, f) {
  const canal = (c) => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
  const r = canal((color >> 16) & 255);
  const g = canal((color >> 8) & 255);
  const b = canal(color & 255);
  return (r << 16) | (g << 8) | b;
}

// Estilo de texto de Phaser con nitidez doble (el juego escala con FIT).
export function estilo(tamano = 12, color = TEXTO.claro, extra = {}) {
  return { fontFamily: TEXTO.fuente, fontSize: `${tamano}px`, color, resolution: 2, ...extra };
}

export function estiloMono(tamano = 11, color = TEXTO.claro, extra = {}) {
  return { fontFamily: TEXTO.mono, fontSize: `${tamano}px`, color, resolution: 2, ...extra };
}
