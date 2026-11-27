// Los dos torniquetes: cada sprite muestra el estado del autómata Torniquete
// de su línea y cambia de textura solo cuando el núcleo ejecuta un evento.

import { MAPA } from '../config.js';
import { aPantalla, profundidad } from '../iso/proyeccion.js';
import { poner, cambiar } from '../arte/texturas.js';

export class Torniquetes {
  constructor(escena, comedor) {
    this.escena = escena;
    this.comedor = comedor;
    this.alSeleccionar = null; // (idEntidad, sprite) => ...; lo fija la escena
    this.sprites = MAPA.lineas.map((linea) => {
      const p = aPantalla(linea.torniquete.x, linea.torniquete.y);
      const sprite = poner(escena, 'tor_Listo', p.x, p.y);
      sprite.setDepth(profundidad(linea.torniquete.x, linea.torniquete.y) * 10 + 2);
      sprite.idEntidad = `T${linea.id}`;
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', (puntero, lx, ly, evento) => {
        evento.stopPropagation();
        if (this.alSeleccionar) this.alSeleccionar(sprite.idEntidad, sprite, puntero);
      });
      return sprite;
    });
    comedor.on('torniquete', (e) => this.refrescar(e.linea, e.evento));
    comedor.on('restaurado', () => this.refrescarTodo());
    comedor.on('linea3', () => this.pintarLinea3(true));
    this.refrescarTodo();
    this.pintarLinea3(false);
  }

  // El torniquete T3 (Fase 2) se ve atenuado mientras la línea 3 está cerrada.
  pintarLinea3(animar) {
    const sprite = this.sprites[2];
    sprite.setVisible(Boolean(this.comedor.markov));
    const alfa = this.comedor.lineas[2].abierta ? 1 : 0.4;
    if (animar) this.escena.tweens.add({ targets: sprite, alpha: alfa, duration: 300 });
    else sprite.setAlpha(alfa);
  }

  sprite(idLinea) {
    return this.sprites[idLinea - 1];
  }

  refrescarTodo() {
    this.comedor.lineas.forEach((linea) => cambiar(this.sprites[linea.id - 1], `tor_${linea.torniquete.estado}`));
    if (this.sprites.length > 2) this.pintarLinea3(false);
  }

  refrescar(idLinea, evento) {
    const sprite = this.sprites[idLinea - 1];
    cambiar(sprite, `tor_${this.comedor.linea(idLinea).torniquete.estado}`);
    if (evento === 'rechazo' || evento === 'bloqueo') {
      // Sacudida corta del torniquete al rechazar o bloquearse.
      const x = aPantalla(MAPA.lineas[idLinea - 1].torniquete.x, MAPA.lineas[idLinea - 1].torniquete.y).x;
      this.escena.tweens.add({ targets: sprite, x: x + 3, duration: 45, yoyo: true, repeat: 2, onComplete: () => sprite.setX(x) });
    }
  }
}
