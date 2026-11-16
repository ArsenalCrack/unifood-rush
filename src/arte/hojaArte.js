// Hoja de arte (hoja-arte.html): muestra la paleta, cada máquina dibujada en
// código una vez por estado de su autómata, cada tipo de token en grupos de
// 1, 5 y k unidades, un trozo de planta de 8 x 8 celdas y una maqueta del HUD
// de máquina y del radar. Usa las mismas funciones de dibujo que el juego.

import * as F from './formas.js';
import { PALETA, ESTADOS, RADAR, TEXTO, estilo, css, sombra } from './paleta.js';
import { pasosDeTexturas, poner } from './texturas.js';
import { crearGrafo } from './grafo.js';
import { boton, panel } from './ui.js';
import { MODELOS } from '../sed/modelos/index.js';

const ANCHO = 1100;
const ALTO = 1710;

class HojaArte extends Phaser.Scene {
  constructor() {
    super('HojaArte');
  }

  create() {
    for (const paso of pasosDeTexturas(this)) paso();
    const titulo = (texto, y) => this.add.text(30, y, texto, estilo(15, TEXTO.amarillo, { fontStyle: 'bold' }));
    const nota = (texto, x, y) => this.add.text(x, y, texto, estilo(10, TEXTO.claro, { align: 'center' })).setOrigin(0.5, 0);
    this.add.text(30, 18, 'UniFood Rush · Hoja de arte', estilo(26, TEXTO.claro, { fontStyle: 'bold' }));
    this.add.text(32, 52, 'Rejilla isométrica 2:1 de 64 × 32 px · luz desde arriba a la izquierda · todo dibujado en código', estilo(12, TEXTO.tenue));

    // --- 1. Paleta con su código hexadecimal ---
    titulo('1. Paleta (14 colores)', 84);
    Object.entries(PALETA).forEach(([nombre, color], i) => {
      const x = 34 + (i % 7) * 150;
      const y = 112 + Math.floor(i / 7) * 46;
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRoundedRect(x, y, 34, 34, 6);
      g.lineStyle(1, 0xffffff, 0.35);
      g.strokeRoundedRect(x, y, 34, 34, 6);
      this.add.text(x + 42, y + 2, nombre, estilo(11, TEXTO.claro, { fontStyle: 'bold' }));
      this.add.text(x + 42, y + 18, css(color), estilo(10, TEXTO.tenue));
    });

    // --- 2 y 3. Una apariencia por estado de cada autómata ---
    titulo('2. Estudiante: un color e ícono por estado', 214);
    Object.keys(ESTADOS.Estudiante).forEach((estado, i) => {
      poner(this, `est_${estado}`, 90 + i * 150, 304);
      nota(estado, 90 + i * 150, 310);
    });
    poner(this, 'est_espera_carro', 990, 304);
    nota('Almorzando\n(espera carro)', 990, 310);

    titulo('3. Torniquete: un color e ícono por estado', 348);
    Object.keys(ESTADOS.Torniquete).forEach((estado, i) => {
      poner(this, `tor_${estado}`, 100 + i * 170, 448);
      nota(estado, 100 + i * 170, 454);
    });

    // --- 4. Estaciones y lugares de la red ---
    titulo('4. Estaciones y lugares', 492);
    const piezas = [
      ['personal_linea', 'Personal_linea'], ['personal_lavado', 'Personal_lavado'], ['mesa_libre', 'Mesa_libre'],
      ['mesa_ocupada', 'Mesa ocupada'], ['carro', 'Carro de menaje'], ['fregadero', 'Lavado (t_lavar)'], ['tablero', 'Tablero de relevo']
    ];
    piezas.forEach(([clave, nombre], i) => {
      poner(this, clave, 90 + i * 150, 592);
      nota(nombre, 90 + i * 150, 604);
    });

    // --- 5. Tokens a tamaño real, en grupos de 1, 5 y k ---
    titulo('5. Tokens: 1, 5 y k unidades', 640);
    const tokens = [
      ['Bandeja_limpia', 'bandeja_limpia', 30, 22, 9],
      ['Bandeja_sucia', 'bandeja_sucia', 10, 22, 9],
      ['Estudiante (En_fila)', 'est_En_Fila', 16, 17, 0],
      ['Mesa_libre', 'mesa_libre', 20, 26, 0],
      ['Personal', 'personal_linea', 4, 20, 0],
      ['Relevo', 'ficha_relevo', 2, 20, 0],
      ['Monitor', 'escudo', 3, 18, 0]
    ];
    tokens.forEach(([nombre, clave, k, paso, apilado], fila) => {
      const y = 706 + fila * 62;
      this.add.text(34, y - 28, nombre, estilo(11, TEXTO.claro, { fontStyle: 'bold' }));
      let x = 190;
      for (const cantidad of [1, Math.min(5, k), k]) {
        for (let i = 0; i < cantidad; i++) {
          // Las bandejas se apilan; lo demás se pone en hilera.
          if (apilado) poner(this, clave, x + (i % 3) * 26, y - Math.floor(i / 3) * 3);
          else poner(this, clave, x + i * paso, y);
        }
        const ancho = apilado ? 78 : cantidad * paso;
        nota(`${cantidad}`, x + ancho / 2 - (apilado ? 0 : paso / 2), y + 4);
        x += ancho + 70;
      }
    });

    // --- 6. Trozo de planta de 8 x 8 celdas con orden de profundidad ---
    titulo('6. Planta de 8 × 8 celdas: suelo, muros, mostradores y orden de profundidad por (x + y)', 1146);
    const origen = { x: 330, y: 1236 };
    const centro = (x, y) => ({ x: origen.x + (x - y) * 32, y: origen.y + (x + y) * 16 });
    const suelo = this.add.graphics().setDepth(-10);
    F.suelo(suelo, 8, 8, centro);
    F.muro(suelo, centro(-0.5, -0.5), centro(7.5, -0.5), 44, sombra(PALETA.muro, 0.1));    // muro con luz
    F.muro(suelo, centro(-0.5, 7.5), centro(-0.5, -0.5), 44, sombra(PALETA.muro, -0.14));  // muro en sombra
    const enCelda = (clave, x, y) => {
      const p = centro(x, y);
      return poner(this, clave, p.x, p.y).setDepth((x + y) * 10);
    };
    for (const cx of [2, 3]) {
      const g = this.add.graphics().setDepth((cx + 1.5) * 10);
      F.prisma(g, centro, cx - 0.5, 1.42, cx + 0.5, 1.6, 18, PALETA.acero);
    }
    enCelda('tor_Acceso', 1, 1);
    enCelda('est_En_Fila', 0, 1);
    enCelda('est_Recibiendo_Bandeja', 2, 1);
    enCelda('personal_linea', 2.5, 2);
    enCelda('mesa_libre', 5, 2);
    enCelda('mesa_ocupada', 6, 4);
    enCelda('est_Almorzando', 5.6, 3.6).setDepth((6 + 4) * 10 - 3);
    enCelda('mesa_libre', 4, 5);
    enCelda('est_Buscando_Mesa', 4, 3);
    enCelda('carro', 2, 5);
    enCelda('fregadero', 1, 6);
    enCelda('personal_lavado', 2, 6.6);
    enCelda('est_Entregando_Menaje', 3, 5.4);
    this.add.text(640, 1220, 'El objeto con mayor (x + y) está más cerca y tapa\nal lejano: el estudiante sentado queda detrás de su\nmesa y delante de los muros.', estilo(12, TEXTO.claro, { lineSpacing: 4 }));

    // --- 7. Maqueta del HUD de máquina y del radar ---
    titulo('7. HUD de máquina y Radar del Árbol de Cobertura', 1504);
    panel(this, 30, 1530, 640, 160);
    const grafo = crearGrafo(this, MODELOS.torniquete, { x: 36, y: 1534, w: 628, h: 124 });
    grafo.actualizar('Bloqueado');
    boton(this, 560, 1672, 's · servir (deshabilitado)', { ancho: 190, alto: 22, tam: 10, color: PALETA.fallo });
    this.add.text(40, 1666, 'Estado actual iluminado · evento deshabilitado por el supervisor en rojo', estilo(10, TEXTO.tenue));
    Object.entries(RADAR).forEach(([estado, color], i) => {
      const x = 760 + i * 110;
      panel(this, x - 44, 1540, 96, 110);
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillCircle(x + 4, 1584, 22);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeCircle(x + 4, 1584, 22);
      nota(estado.toUpperCase(), x + 4, 1616);
      if (estado === 'amarillo') this.tweens.add({ targets: g, alpha: 0.25, duration: 260, yoyo: true, repeat: -1 });
    });
    this.add.text(716, 1664, 'Verde: sin bloqueo a 3 disparos · amarillo (parpadea): bloqueo cercano · rojo: marcado muerto', estilo(9.5, TEXTO.tenue, { wordWrap: { width: 350 } }));
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'hoja',
  width: ANCHO,
  height: ALTO,
  backgroundColor: '#1d2433',
  scale: { mode: Phaser.Scale.NONE },
  scene: [HojaArte]
});
