// HUD de la red de Petri (tecla R o clic en «Tokens por lugar»): escena superpuesta
// que no pausa la simulación, como el HUD de máquina con los autómatas. Dibuja en
// vivo la red del comedor desde su JSON, con la misma distribución que PIPE2: los
// tokens de cada lugar, las transiciones habilitadas (M ≥ Pre) en verde y el último
// disparo en amarillo. Va a la izquierda para poder abrirla junto al HUD de máquina.
// Al activar o quitar los monitores (N) se dibuja la otra red.

import { TEXTO, estilo } from '../arte/paleta.js';
import { prepararCamara } from '../arte/resolucion.js';
import { panel, boton } from '../arte/ui.js';
import { crearGrafoRed } from '../arte/grafoRed.js';
import { entrada } from '../entrada/gestorEntrada.js';

const X = 8;
const Y = 74;
const W = 388;
const H = 342;

export class HUDRed extends Phaser.Scene {
  constructor() {
    super('HUDRed');
  }

  create() {
    prepararCamara(this);
    this.planta = this.scene.get('Planta');
    this.comedor = this.planta.comedor;
    this.grafo = null;

    this.add.zone(X + W / 2, Y + H / 2, W, H).setInteractive(); // el panel absorbe los clics
    panel(this, X, Y, W, H, { alfa: 1 }); // opaco: detrás están las etiquetas del mapa
    this.add.text(X + 12, Y + 7, 'RED DE PETRI · EN VIVO', estilo(13, TEXTO.claro, { fontStyle: 'bold' }));
    boton(this, X + W - 18, Y + 17, 'X', { ancho: 24, alto: 22, tam: 11, color: 0x2a3347 }, () => entrada.red());
    this.subtitulo = this.add.text(X + 12, Y + 26, '', estilo(9, TEXTO.tenue));
    this.add.text(X + 12, Y + H - 31, 'Barra verde: habilitada (M ≥ Pre) · amarilla: último disparo · borde blanco: la dispara el jugador. '
      + 'Lugar con borde naranja: recibe eventos externos (llegadas, relevo) · azul: monitor. Arco sin número: peso 1.',
    estilo(8, TEXTO.tenue, { wordWrap: { width: W - 24 } }));

    this.events.once('shutdown', () => { if (this.grafo) this.grafo.destruir(); });
    this.dibujar();
  }

  // Dibuja la red que tiene el núcleo ahora (cambia con los monitores).
  dibujar() {
    if (this.grafo) this.grafo.destruir();
    this.red = this.comedor.red;
    this.grafo = crearGrafoRed(this, this.red.json, { x: X + 4, y: Y + 40, w: W - 8, h: H - 76 });
    this.subtitulo.setText(`Red ${this.comedor.monitor ? 'con monitores' : 'de la ficha'}: |P| = ${this.red.nP}, |T| = ${this.red.nT}. `
      + 'Misma distribución que PIPE2; la simulación sigue.');
    this.disparos = this.red.secuencia.length;
    this.firma = null;
    this.refrescar();
  }

  update() {
    if (this.comedor.red !== this.red) this.dibujar();
    else this.refrescar();
  }

  // Destello en cada disparo; tokens y barras cuando cambia el marcado.
  refrescar() {
    const red = this.red;
    if (red.secuencia.length > this.disparos && red.ultimo) this.grafo.parpadear(red.ultimo.t);
    this.disparos = red.secuencia.length;
    const firma = red.M.join(',');
    if (firma === this.firma) return;
    this.firma = firma;
    this.grafo.actualizar(red.M, new Set(red.habilitadas()));
  }
}
