// Pruebas del factor de resolución: el lienzo tiene los píxeles reales de la
// pantalla para que el juego se vea nítido a cualquier tamaño de ventana.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { factorPara, FACTOR, DESFASE } from '../src/arte/resolucion.js';

test('el factor de resolución sigue los píxeles reales de la pantalla, con tope', () => {
  assert.equal(factorPara({ anchoPx: 1920, altoPx: 1080 }), 2);                   // Full HD
  assert.equal(factorPara({ anchoPx: 1366, altoPx: 768 }), 2);                    // portátil común
  assert.equal(factorPara({ anchoPx: 1536, altoPx: 864, dpr: 1.25 }), 2);         // Full HD con Windows al 125 %
  assert.equal(factorPara({ anchoPx: 2560, altoPx: 1440 }), 3);                   // QHD
  assert.equal(factorPara({ anchoPx: 3840, altoPx: 2160 }), 3);                   // 4K: tope de 3 en computador
  assert.equal(factorPara({ anchoPx: 390, altoPx: 844, dpr: 3, tactil: true }), 2); // celular: tope de 2
  assert.equal(factorPara({ anchoPx: 800, altoPx: 450 }), 1);                     // pantalla pequeña
  assert.equal(factorPara({ anchoPx: 1920, altoPx: 1080, forzado: 1 }), 1);       // ?resolucion=1
  assert.equal(factorPara({ anchoPx: 1920, altoPx: 1080, forzado: 9 }), 2);       // fuera de rango: se ignora
});

test('sin navegador (Node) el factor es 1 y la cámara no se desplaza', () => {
  assert.equal(FACTOR, 1);
  assert.deepEqual(DESFASE, { x: 0, y: 0 });
});
