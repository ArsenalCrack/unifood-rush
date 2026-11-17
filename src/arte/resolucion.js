// Resolución de dibujo del juego.
// El mundo mide 960 x 540 unidades (config.js) y todas las escenas se diseñan en
// esas unidades. El lienzo, en cambio, se crea FACTOR veces más grande, con los
// píxeles reales de la pantalla, y cada cámara amplía FACTOR veces. Así el
// navegador no estira la imagen: textos, líneas y texturas se ven nítidos aunque
// el juego ocupe toda la ventana.
// Se puede forzar con ?resolucion=1 (más liviano) hasta ?resolucion=4 en la dirección.

import { ANCHO, ALTO } from '../config.js';

// Factor entero para una pantalla de anchoPx x altoPx píxeles CSS y devicePixelRatio dpr.
// Celulares y tabletas tienen tope 2 para cuidar la batería; los computadores, tope 3.
export function factorPara({ anchoPx, altoPx, dpr = 1, tactil = false, forzado = null }) {
  if (Number.isInteger(forzado) && forzado >= 1 && forzado <= 4) return forzado;
  const largo = Math.max(anchoPx, altoPx) * dpr;
  const corto = Math.min(anchoPx, altoPx) * dpr;
  const necesario = Math.min(largo / ANCHO, corto / ALTO);
  const tope = tactil ? 2 : 3;
  return Math.min(tope, Math.max(1, Math.ceil(necesario - 0.05)));
}

function factorDelNavegador() {
  if (typeof window === 'undefined') return 1; // pruebas de Node
  const parametro = new URLSearchParams(window.location.search).get('resolucion');
  return factorPara({
    anchoPx: window.screen.width,
    altoPx: window.screen.height,
    dpr: window.devicePixelRatio || 1,
    tactil: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    forzado: parametro === null ? null : Number(parametro)
  });
}

export const FACTOR = factorDelNavegador();

// Las texturas dibujadas en código se generan al doble del lienzo para que sigan
// nítidas cuando el jugador acerca la cámara de la planta (hasta 2,4 veces).
export const RES_TEXTURA = FACTOR * 2;
export const ESCALA_TEXTURA = 1 / RES_TEXTURA;

// Textos del HUD (cámara fija) y textos que viven en la planta (su cámara se acerca).
export const RES_TEXTO = Math.max(2, FACTOR);
export const RES_TEXTO_MUNDO = FACTOR * 2;

// Desplazamiento de una cámara ampliada FACTOR veces que muestra el mundo completo.
export const DESFASE = { x: (ANCHO / 2) * (1 - FACTOR), y: (ALTO / 2) * (1 - FACTOR) };

// Cámara principal de una escena: amplía FACTOR veces y centra el mundo de 960 x 540.
export function prepararCamara(escena) {
  return escena.cameras.main.setZoom(FACTOR).centerOn(ANCHO / 2, ALTO / 2);
}
