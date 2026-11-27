// Entrada del juego. Phaser 4.2.1 llega como objeto global desde la CDN
// (index.html): aquí NO se importa 'phaser'.

import { ANCHO, ALTO } from './config.js';
import { FACTOR } from './arte/resolucion.js';
import { Arranque } from './escenas/Arranque.js';
import { Titulo } from './escenas/Titulo.js';
import { Planta } from './escenas/Planta.js';
import { HUDPartida } from './escenas/HUDPartida.js';
import { HUDMaquina } from './escenas/HUDMaquina.js';
import { HUDRed } from './escenas/HUDRed.js';
import { Inspector } from './escenas/Inspector.js';
import { Resultados } from './escenas/Resultados.js';
import { PanelMarkov } from './escenas/PanelMarkov.js';
import { GenerarLog } from './escenas/GenerarLog.js';

const juego = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-container',
  // Lienzo con los píxeles reales de la pantalla; las cámaras amplían FACTOR veces
  // y el mundo sigue midiendo 960 x 540 (src/arte/resolucion.js).
  width: ANCHO * FACTOR,
  height: ALTO * FACTOR,
  backgroundColor: '#1d2433',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  // Planta dibuja el mundo; HUDPartida, HUDMaquina, HUDRed, Inspector y PanelMarkov son escenas superpuestas.
  scene: [Arranque, Titulo, Planta, HUDPartida, HUDMaquina, HUDRed, Inspector, PanelMarkov, Resultados, GenerarLog]
});

// Referencia para depurar desde la consola del navegador (F12).
window.unifood = juego;
