// Escena de arranque: genera las texturas dibujadas en código y muestra una
// barra de progreso. Phaser llega como objeto global desde la CDN.

import { ANCHO, ALTO } from '../config.js';
import { PALETA, TEXTO, estilo } from '../arte/paleta.js';
import { pasosDeTexturas } from '../arte/texturas.js';

export class Arranque extends Phaser.Scene {
  constructor() {
    super('Arranque');
  }

  create() {
    this.add.text(ANCHO / 2, ALTO / 2 - 46, 'UniFood Rush', estilo(34, TEXTO.claro, { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(ANCHO / 2, ALTO / 2 + 34, 'Preparando el comedor…', estilo(13, TEXTO.tenue)).setOrigin(0.5);
    const barra = this.add.graphics();
    const pasos = pasosDeTexturas(this);
    let hechos = 0;

    const pintar = () => {
      const ancho = 320;
      const x = ANCHO / 2 - ancho / 2;
      barra.clear();
      barra.fillStyle(0xffffff, 0.12);
      barra.fillRoundedRect(x, ALTO / 2, ancho, 14, 7);
      barra.fillStyle(PALETA.operacion, 1);
      barra.fillRoundedRect(x, ALTO / 2, Math.max(14, ancho * (hechos / pasos.length)), 14, 7);
    };
    pintar();

    // Un paso por cuadro para que la barra avance de verdad.
    this.time.addEvent({
      delay: 10,
      repeat: pasos.length - 1,
      callback: () => {
        pasos[hechos]();
        hechos++;
        pintar();
        if (hechos === pasos.length) this.time.delayedCall(200, () => this.scene.start('Titulo'));
      }
    });
  }
}
