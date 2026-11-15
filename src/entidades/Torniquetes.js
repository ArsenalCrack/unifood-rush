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
        if (this.alSeleccionar) this.alSeleccionar(sprite.idEntidad, sprite);
      });
      return sprite;
    });
    comedor.on('torniquete', (e) => this.refrescar(e.linea, e.evento));
    comedor.on('restaurado', () => this.refrescarTodo());
    this.refrescarTodo();
  }

  sprite(idLinea) {
    return this.sprites[idLinea - 1];
  }

  refrescarTodo() {
    this.comedor.lineas.forEach((linea) => cambiar(this.sprites[linea.id - 1], `tor_${linea.torniquete.estado}`));
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
