// Personal del comedor: 4 personas que son los tokens de Personal_linea y
// Personal_lavado. Un sprite solo cambia de puesto cuando el núcleo dispara
// t_a_linea o t_a_lavado (el jugador las solicita con las flechas del tablero).

import { MAPA } from '../config.js';
import { poner, cambiar } from '../arte/texturas.js';
import { colocar, caminar, duracionRuta, volar } from './movimiento.js';

const PUESTOS = {
  linea: { ranuras: MAPA.personalLinea, textura: 'personal_linea', lugar: 'Personal_linea' },
  lavado: { ranuras: MAPA.personalLavado, textura: 'personal_lavado', lugar: 'Personal_lavado' }
};

export class Personal {
  constructor(escena, comedor) {
    this.escena = escena;
    this.comedor = comedor;
    this.sprites = [0, 1, 2, 3].map(() => {
      const sprite = poner(escena, 'personal_linea', 0, 0);
      sprite.celda = { x: 0, y: 0 };
      return sprite;
    });
    this.reconstruir();
    comedor.on('personal', (e) => this.mover(e.transicion));
    comedor.on('restaurado', () => this.reconstruir());
    comedor.on('red_cambiada', () => this.reconstruir());
    comedor.on('lavado', () => this.animarLavado());
  }

  enPuesto(puesto) {
    return this.sprites.filter((s) => s.puesto === puesto);
  }

  ranuraLibre(puesto) {
    const ocupadas = new Set(this.enPuesto(puesto).map((s) => s.ranura));
    return [0, 1, 2, 3].find((i) => !ocupadas.has(i));
  }

  // Coloca a cada persona según el marcado actual, sin animación.
  reconstruir() {
    const enLinea = this.comedor.red.tokens('Personal_linea');
    this.sprites.forEach((sprite, i) => {
      if (sprite.caminata) { sprite.caminata.stop(); sprite.caminata = null; }
      sprite.puesto = i < enLinea ? 'linea' : 'lavado';
      sprite.ranura = i < enLinea ? i : i - enLinea;
      sprite.celda = { ...PUESTOS[sprite.puesto].ranuras[sprite.ranura] };
      cambiar(sprite, PUESTOS[sprite.puesto].textura);
      colocar(sprite);
    });
    this.animarLavado();
  }

  // Se disparó t_a_linea o t_a_lavado: una persona cambia de puesto.
  mover(transicion) {
    const origen = transicion === 't_a_linea' ? 'lavado' : 'linea';
    const destino = transicion === 't_a_linea' ? 'linea' : 'lavado';
    const candidatas = this.enPuesto(origen);
    if (candidatas.length === 0) { this.reconstruir(); return; }
    const sprite = candidatas.reduce((a, b) => (a.ranura > b.ranura ? a : b));
    sprite.ranura = this.ranuraLibre(destino);
    sprite.puesto = destino;
    const meta = PUESTOS[destino].ranuras[sprite.ranura];
    // Camina por el pasillo y entra a la línea por el extremo abierto de los mostradores.
    const ruta = destino === 'linea'
      ? [{ x: 6.4, y: 6.6 }, { x: 7, y: 4.3 }, { x: 7, y: 2 }, meta]
      : [{ x: 7, y: 2 }, { x: 7, y: 4.3 }, { x: 6.4, y: 6.6 }, meta];
    // El permiso de Relevo consumido viaja del tablero a la persona.
    volar(this.escena, 'ficha_relevo', { ...MAPA.relevo, z: 1.1 }, { ...sprite.celda, z: 0.9 }, 350);
    this.escena.tweens.killTweensOf(sprite);
    sprite.setScale(1);
    caminar(this.escena, sprite, ruta, duracionRuta(sprite.celda, ruta, 6), () => {
      cambiar(sprite, PUESTOS[destino].textura);
      this.animarLavado();
    });
  }

  // Las personas de lavado se mueven mientras hay un lavado en curso (t_lavar habilitada).
  animarLavado() {
    const enCurso = this.comedor.lavados.length;
    this.enPuesto('lavado').forEach((sprite, i) => {
      const lavando = i < enCurso && !sprite.caminata;
      if (lavando && !sprite.vaiven) {
        sprite.vaiven = this.escena.tweens.add({ targets: sprite, scaleY: 0.9, duration: 260, yoyo: true, repeat: -1 });
      } else if (!lavando && sprite.vaiven) {
        sprite.vaiven.stop();
        sprite.vaiven = null;
        sprite.setScale(1);
      }
    });
    this.enPuesto('linea').forEach((sprite) => {
      if (sprite.vaiven) { sprite.vaiven.stop(); sprite.vaiven = null; sprite.setScale(1); }
    });
  }
}
