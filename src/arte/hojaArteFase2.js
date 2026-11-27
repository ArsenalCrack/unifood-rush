// Hoja de arte de la Fase 2 (hoja-arte-fase2.html, guía 5.4): cada entidad estocástica
// una vez por estado de Markov, una maqueta del panel analítico de 640 x 400 (mapa de
// calor de P, barras de pi^(n) con selector de n, pi contra frecuencias y clasificación),
// el indicador de Markov del HUD, el contador del log y el botón «Exportar Event Log» en
// reposo, al pasar el mouse y al descargar. Usa las mismas funciones que el juego.

import * as F from './formas.js';
import { PALETA, TEXTO, estilo, estiloMono, sombra } from './paleta.js';
import { pasosDeTexturas } from './texturas.js';
import { FACTOR } from './resolucion.js';
import { panel, boton } from './ui.js';
import {
  ESTADOS_MARKOV, chipEstado, mapaCalor, barras, leyenda, botonExportar, colorCalor, vectorTexto, numero, PANEL
} from './markov.js';
import { CadenaMarkov } from '../sed/markov.js';
import { Aleatorio } from '../sed/aleatorio.js';
import { MARKOV } from '../sed/modelos/index.js';
import { SEMILLA_MARKOV } from '../config.js';

const ANCHO = 1100;
const ALTO = 1240;
const FACTOR_HOJA = Math.min(FACTOR, 2);

class HojaArteFase2 extends Phaser.Scene {
  constructor() {
    super('HojaArteFase2');
  }

  create() {
    this.cameras.main.setZoom(FACTOR_HOJA).centerOn(ANCHO / 2, ALTO / 2);
    for (const paso of pasosDeTexturas(this)) paso();
    const titulo = (texto, y) => this.add.text(30, y, texto, estilo(15, TEXTO.amarillo, { fontStyle: 'bold' }));
    const nota = (texto, x, y, color = TEXTO.claro) => this.add.text(x, y, texto, estilo(10, color, { align: 'center' })).setOrigin(0.5, 0);
    this.add.text(30, 18, 'UniFood Rush · Hoja de arte de la Fase 2', estilo(26, TEXTO.claro, { fontStyle: 'bold' }));
    this.add.text(32, 52, 'Cadenas de Markov y Event Log · un color e ícono por estado, de menor a mayor riesgo · todo dibujado en código', estilo(12, TEXTO.tenue));

    // --- 1. Oleada: indicador del mapa y tapete de la entrada, una vez por estado ---
    titulo('1. Oleada de llegada (entidad estocástica global): indicador y tapete de la entrada', 84);
    Object.entries(ESTADOS_MARKOV.Oleada).forEach(([estado, e], i) => {
      const x = 130 + i * 190;
      const g = this.add.graphics();
      for (let k = 0; k < 3; k++) F.losa(g, x - 30 + k * 30, 170 + (k % 2) * 6, e.color, 18, 9, 0.6);
      chipEstado(this, x, 136, 'Oleada', estado, { ancho: 96, alto: 22 });
      nota(`${estado}\n${e.detalle}`, x, 186);
    });
    nota('Al cambiar de estado: tween de color de 300 ms,\netiqueta flotante y, en Alta, temblor y destello.', 820, 128, TEXTO.tenue);

    // --- 2. Mesas: indicador por cuartos ---
    titulo('2. Ocupación de mesas (cadena de referencia, observada en la red de Petri)', 236);
    Object.entries(ESTADOS_MARKOV.Mesas).forEach(([estado, e], i) => {
      const x = 120 + i * 170;
      chipEstado(this, x, 282, 'Mesas', estado, { ancho: 96, alto: 22 });
      nota(e.detalle, x, 298);
    });

    // --- 3. Maqueta del panel analítico (640 x 400) ---
    titulo('3. Panel de Markov · maqueta de 640 × 400 (mismas funciones que src/escenas/PanelMarkov.js)', 330);
    this.maquetaPanel(30, 356);

    // --- 4. Indicador del HUD y contador del log ---
    titulo('4. HUD: indicador de Markov junto al reloj y contador del log junto a las alertas', 780);
    this.maquetaHUD(30, 806);

    // --- 5. Botón de exportación ---
    titulo('5. Botón «Exportar Event Log»: reposo, al pasar el mouse y al descargar', 920);
    botonExportar(this, 140, 970, null, { ancho: 190, alto: 32 });
    nota('reposo', 140, 992);
    const encima = botonExportar(this, 380, 970, null, { ancho: 190, alto: 32 });
    encima.fijarColor(sombra(PALETA.mantenimiento, 0.22));
    nota('al pasar el mouse', 380, 992);
    const bajando = botonExportar(this, 620, 970, null, { ancho: 190, alto: 32 });
    bajando.fijarColor(PALETA.operacion).fijarTexto('DESCARGANDO…');
    nota('al descargar (1,1 s)', 620, 992);

    // --- 6. Mapa de calor de las esperas ---
    titulo('6. Mapa de calor sobre el piso (tecla H): espera acumulada por zona', 1030);
    const g = this.add.graphics();
    for (let i = 0; i < 12; i++) {
      const v = i / 11;
      F.losa(g, 70 + i * 66, 1090, colorCalor(v), 31, 15.5, 0.85);
      if (i % 3 === 0 || i === 11) this.add.text(70 + i * 66, 1110, `${Math.round(v * 100)} %`, estilo(9, TEXTO.tenue)).setOrigin(0.5, 0);
    }
    nota('de blanco a rojo según la espera de la zona dividida por la mayor', 430, 1136, TEXTO.tenue);
    this.add.text(30, 1180, 'Revisión: dos estados de una cadena nunca comparten color; los números del mapa de calor se leen con dos decimales; las barras tienen escala.', estilo(10.5, TEXTO.tenue, { wordWrap: { width: 1040 } }));
  }

  maquetaPanel(x0, y0) {
    const X = x0;
    const Y = y0;
    const cadena = new CadenaMarkov(MARKOV.oleada, (() => { const g = new Aleatorio(SEMILLA_MARKOV); return () => g.siguiente(); })());
    for (let i = 0; i < 120; i++) cadena.paso();
    panel(this, X, Y, 640, 400, { alfa: 0.97, borde: PALETA.mantenimiento, alfaBorde: 0.75 });
    this.add.text(X + 14, Y + 9, 'PANEL DE MARKOV · OLEADA', estilo(14, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.add.text(X + 14, Y + 28, `paso k = ${cadena.k} · estado actual ${cadena.estado} · la simulación sigue`, estilo(9.5, TEXTO.tenue));
    ['Matriz', 'Transitorio', 'Chapman-Kolmogorov', 'Largo plazo', 'Datos de la partida'].forEach((n, i) => {
      boton(this, X + 70 + i * 118, Y + 58, n, { ancho: 112, alto: 22, tam: 9.5, color: i === 0 ? PALETA.mantenimiento : 0x2a3347 });
    });
    // Mapa de calor de P con la fila del estado actual.
    mapaCalor(this, X + 70, Y + 110, { M: cadena.P, filas: cadena.estados, ancho: 58, alto: 32, decimales: 2, resaltar: cadena.iEstado, tam: 11 });
    // Barras de pi^(n) con selector de n.
    const n = 3;
    const pin = cadena.distribucion(n, cadena.vectorDe());
    this.add.text(X + 300, Y + 88, `π^(n) desde ${cadena.estado}, n = 0..10`, estilo(10, TEXTO.claro, { fontStyle: 'bold' }));
    const g = this.add.graphics();
    g.lineStyle(3, 0xffffff, 0.25).lineBetween(X + 310, Y + 116, X + 560, Y + 116);
    for (let k = 0; k <= 10; k++) g.fillStyle(0xffffff, 0.35).fillCircle(X + 310 + k * 25, Y + 116, 2);
    this.add.circle(X + 310 + n * 25, Y + 116, 7, PALETA.espera).setStrokeStyle(2, 0xffffff, 0.8);
    this.add.text(X + 575, Y + 108, `n = ${n}`, estiloMono(12, TEXTO.amarillo, { fontStyle: 'bold' }));
    const colores = cadena.estados.map((e) => ESTADOS_MARKOV.Oleada[e].color);
    barras(this, X + 330, Y + 136, { ancho: 260, alto: 90, categorias: cadena.estados, series: [{ valores: pin, colores }], max: 1, decimales: 3 });
    this.add.text(X + 300, Y + 252, `π^(${n}) = ${vectorTexto(pin, 3)}`, estiloMono(9.5, TEXTO.claro));
    // pi teórico contra frecuencias y clasificación.
    const series = [
      { valores: cadena.estacionaria(), color: PANEL.serieTeorica, etiqueta: 'π teórico' },
      { valores: cadena.frecuencias(), color: PANEL.serieObservada, etiqueta: `frecuencia en ${cadena.k} pasos` }
    ];
    barras(this, X + 70, Y + 262, { ancho: 230, alto: 90, categorias: cadena.estados, series, max: 0.6, decimales: 2, tam: 8.5 });
    leyenda(this, X + 60, Y + 386, series);
    const c = cadena.clasificar();
    this.add.text(X + 330, Y + 280, 'Estado   Tipo         Periodo  1/π', estiloMono(9.5, TEXTO.tenue));
    const retorno = cadena.tiemposRetorno();
    c.estados.forEach((e, i) => this.add.text(X + 330, Y + 296 + i * 15, `${e.nombre.padEnd(8)} ${e.tipo.padEnd(12)} ${String(e.periodo).padEnd(8)} ${numero(retorno[i], 2)}`, estiloMono(9.5, TEXTO.claro)));
    this.add.text(X + 330, Y + 346, c.ergodica ? 'Irreducible y aperiódica: ergódica.' : 'No ergódica.', estilo(9.5, TEXTO.verde, { fontStyle: 'bold' }));
    this.add.text(X + 660, Y + 10, 'Colores del panel', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    [['Fondo del panel', PANEL.fondo], ['Fila del estado actual', PANEL.resalte], ['π teórico', PANEL.serieTeorica], ['Frecuencia observada', PANEL.serieObservada], ['Borde del panel', PALETA.mantenimiento]]
      .forEach(([nombre, color], i) => {
        const gg = this.add.graphics();
        gg.fillStyle(color, 1).fillRoundedRect(X + 662, Y + 34 + i * 26, 18, 18, 4);
        gg.lineStyle(1, 0xffffff, 0.35).strokeRoundedRect(X + 662, Y + 34 + i * 26, 18, 18, 4);
        this.add.text(X + 688, Y + 36 + i * 26, nombre, estilo(10.5, TEXTO.claro));
      });
    this.add.text(X + 660, Y + 172, 'Mapa de calor de P', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    const gc = this.add.graphics();
    for (let s = 0; s < 100; s++) { gc.fillStyle(colorCalor(s / 99), 1); gc.fillRect(X + 662 + s * 3.4, Y + 196, 3.5, 14); }
    this.add.text(X + 662, Y + 214, '0', estilo(9, TEXTO.tenue));
    this.add.text(X + 1002, Y + 214, '1', estilo(9, TEXTO.tenue)).setOrigin(1, 0);
    this.add.text(X + 660, Y + 236, 'Valores con dos decimales; texto oscuro\nsobre celdas claras y claro sobre las oscuras.', estilo(10, TEXTO.tenue));
  }

  maquetaHUD(x, y) {
    panel(this, x, y, 210, 58);
    this.add.text(x + 10, y + 5, 'Turno 3 · Hora pico', estilo(12, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.add.text(x + 10, y + 21, '2:14 / 8:00  ×4', estiloMono(14, TEXTO.claro, { fontStyle: 'bold' }));
    this.add.text(x + 10, y + 40, 'Cambio de turno del personal en 106 s', estilo(10, TEXTO.tenue));
    panel(this, x + 216, y, 142, 58);
    this.add.text(x + 224, y + 4, 'PASO k', estilo(9, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.add.text(x + 350, y + 4, 'de 13 pasos', estilo(9, TEXTO.tenue)).setOrigin(1, 0);
    this.add.text(x + 223, y + 14, '4', estiloMono(19, TEXTO.claro, { fontStyle: 'bold' }));
    chipEstado(this, x + 314, y + 25, 'Oleada', 'Media', { ancho: 78, alto: 20, tam: 10 });
    this.add.text(x + 224, y + 41, 'Alta≤3: 51 %', estilo(9, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.add.text(x + 350, y + 41, 'mesas 50-75 %', estilo(9, TEXTO.tenue)).setOrigin(1, 0);
    this.add.text(x + 380, y + 4, '← parpadea en amarillo cuando P(Alta en ≤ 3 pasos) ≥ 0,5', estilo(10, TEXTO.tenue));
    panel(this, x + 380, y + 26, 300, 40);
    this.add.text(x + 388, y + 30, 'ALERTAS', estilo(9, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.add.text(x + 672, y + 30, 'Casos abiertos 12 · cerrados 48 · eventos 310', estilo(9, TEXTO.azul, { fontStyle: 'bold' })).setOrigin(1, 0);
    this.add.text(x + 388, y + 46, '2:00 Paso k = 4: oleada Baja → Media (10 llegan)', estilo(9.5, TEXTO.amarillo));
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'hoja',
  width: ANCHO * FACTOR_HOJA,
  height: ALTO * FACTOR_HOJA,
  backgroundColor: '#1d2433',
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / FACTOR_HOJA },
  scene: [HojaArteFase2]
});
