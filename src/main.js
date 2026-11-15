// Entrada del juego. Phaser 4.2.1 llega como objeto global desde la CDN
// (index.html): aquí NO se importa 'phaser'.

import { ANCHO, ALTO } from './config.js';
import { Arranque } from './escenas/Arranque.js';
import { Titulo } from './escenas/Titulo.js';
import { Planta } from './escenas/Planta.js';
import { HUDPartida } from './escenas/HUDPartida.js';
import { HUDMaquina } from './escenas/HUDMaquina.js';
import { Inspector } from './escenas/Inspector.js';
import { Resultados } from './escenas/Resultados.js';

const juego = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-container',
  width: ANCHO,
  height: ALTO,
  backgroundColor: '#1d2433',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  // Planta dibuja el mundo; HUDPartida, HUDMaquina e Inspector son escenas superpuestas.
  scene: [Arranque, Titulo, Planta, HUDPartida, HUDMaquina, Inspector, Resultados]
});

// Referencia para depurar desde la consola del navegador (F12).
window.unifood = juego;
