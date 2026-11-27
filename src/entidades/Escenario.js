// Escenario de la planta: suelo, muros, mobiliario y los lugares de la red de
// Petri como objetos del mapa, con sus tokens físicos y su contador m/k.
// Solo lee el marcado del núcleo; nunca lo cambia.

import { MAPA, PLANTA } from '../config.js';
import { aPantalla, profundidad } from '../iso/proyeccion.js';
import * as F from '../arte/formas.js';
import { PALETA, TEXTO, estilo, sombra } from '../arte/paleta.js';
import { poner, cambiar } from '../arte/texturas.js';
import { RES_TEXTO_MUNDO } from '../arte/resolucion.js';
import { chipEstado, estiloEstado, tweenColor } from '../arte/markov.js';
import { celdaMesa } from './Multitud.js';

const centro = (x, y) => aPantalla(x, y);
const prof = (x, y) => profundidad(x, y) * 10;

export class Escenario {
  constructor(escena, comedor) {
    this.escena = escena;
    this.comedor = comedor;
    this.rotulos = {};
    this.dibujarSuelo();
    this.dibujarMuros();
    this.dibujarMobiliario();
    this.crearRotulos();
    this.crearIndicadoresMarkov();
    this.sucio = true;
    for (const tipo of ['red', 'torniquete', 'estudiante']) comedor.on(tipo, () => { this.sucio = true; });
    comedor.on('red_cambiada', () => { this.sucio = true; });
    comedor.on('restaurado', () => { this.sucio = true; this.pintarLinea3(false); this.pintarMarkov(false); });
    comedor.on('linea3', () => this.pintarLinea3(true));
    comedor.on('markov', () => this.pintarMarkov(true));
    this.pintarLinea3(false);
  }

  dibujarSuelo() {
    const g = this.escena.add.graphics().setDepth(-1000);
    // Acera exterior frente a la entrada y a la salida.
    for (let x = -9; x <= -1; x++) {
      for (const y of [0, 1, 2, 3, 4, 5, 6, 7]) {
        const c = centro(x, y);
        F.losa(g, c.x, c.y, sombra(PALETA.acero, (x + y) % 2 === 0 ? -0.5 : -0.56));
      }
    }
    F.suelo(g, PLANTA.columnas, PLANTA.filas, centro);
    // Carriles de las filas (color de espera) y zona de lavado (color de mantenimiento).
    // La línea 3 (Fase 2) tiene su propio dibujo para atenuarlo mientras está cerrada.
    this.carril3 = this.escena.add.graphics().setDepth(-999.5);
    for (const linea of MAPA.lineas) {
      for (let x = -2; x <= MAPA.cabezaFila; x++) {
        const c = centro(x, linea.y);
        F.losa(linea.id === 3 ? this.carril3 : g, c.x, c.y, PALETA.espera, 27, 13.5, 0.3);
      }
    }
    // Tapete de la entrada: toma el color del estado de la cadena Oleada.
    this.tapeteOleada = this.escena.add.graphics().setDepth(-999.4).setAlpha(0.6);
    for (let x = 1; x <= 5; x++) {
      for (let y = 8; y <= 10; y++) {
        const c = centro(x, y);
        F.losa(g, c.x, c.y, PALETA.mantenimiento, 32, 16, 0.18);
      }
    }
    // Capa que parpadea en rojo cuando En_fila se desborda (supera k).
    this.capaDesborde = this.escena.add.graphics().setDepth(-999).setAlpha(0);
    for (const linea of MAPA.lineas) {
      for (let x = -2; x <= MAPA.cabezaFila; x++) {
        const c = centro(x, linea.y);
        F.losa(this.capaDesborde, c.x, c.y, PALETA.fallo, 30, 15, 0.75);
      }
    }
  }

  dibujarMuros() {
    const g = this.escena.add.graphics().setDepth(-900);
    // Muro del fondo a la derecha (y = -0.5): recibe la luz.
    F.muro(g, centro(-0.5, -0.5), centro(15.5, -0.5), 46, sombra(PALETA.muro, 0.1));
    // Muro del fondo a la izquierda (x = -0.5): en sombra, con la entrada (3 filas) y la salida.
    for (const [y0, y1] of [[-0.5, 0.35], [5.62, 5.85], [7.15, 11.5]]) {
      F.muro(g, centro(-0.5, y1), centro(-0.5, y0), 46, sombra(PALETA.muro, -0.14));
    }
    const letrero = (texto, x, y, color) => {
      const p = centro(x, y);
      this.escena.add.text(p.x, p.y - 58, texto, estilo(9, color, { fontStyle: 'bold', backgroundColor: '#0f1524', padding: { x: 4, y: 2 }, resolution: RES_TEXTO_MUNDO }))
        .setOrigin(0.5).setDepth(-890);
    };
    letrero('ENTRADA', -0.5, 2, TEXTO.amarillo);
    letrero('SALIDA', -0.5, 6.5, TEXTO.tenue);
  }

  dibujarMobiliario() {
    const escena = this.escena;
    // Mostradores delgados: el personal de las líneas 1 y 2 trabaja en el pasillo del medio
    // (y = 2); el de la línea 3 (Fase 2), en el pasillo y = 4.
    this.mostrador3 = [];
    for (const cx of [8, 9]) {
      for (const [y0, y1] of [[1.42, 1.6], [2.4, 2.58], [4.42, 4.6]]) {
        const g = escena.add.graphics().setDepth(prof(cx, (y0 + y1) / 2));
        F.prisma(g, centro, cx - 0.5, y0, cx + 0.5, y1, 18, PALETA.acero);
        const comida = centro(cx, (y0 + y1) / 2);
        F.losa(g, comida.x, comida.y - 18, cx === 8 ? PALETA.relevo : PALETA.operacion, 9, 2.6);
        if (y0 > 4) this.mostrador3.push(g);
      }
    }
    // Persona de refuerzo de la línea 3: aparece cuando el jugador la abre.
    const ref = centro(MAPA.refuerzoLinea3.x, MAPA.refuerzoLinea3.y);
    this.refuerzo = poner(escena, 'personal_linea', ref.x, ref.y).setDepth(prof(MAPA.refuerzoLinea3.x, MAPA.refuerzoLinea3.y) + 1);
    const l3 = centro(4.6, 5.6);
    this.letreroLinea3 = escena.add.text(l3.x, l3.y - 22, 'LÍNEA 3 CERRADA · tecla 3', estilo(9, TEXTO.tenue, {
      fontStyle: 'bold', backgroundColor: '#0f1524cc', padding: { x: 4, y: 2 }, resolution: RES_TEXTO_MUNDO
    })).setOrigin(0.5).setDepth(8800);
    // Estante de bandejas limpias en el muro del fondo (lugar Bandeja_limpia, k = 30):
    // 3 repisas de 10 casillas. Va en el muro para que nada lo tape.
    const gEstante = escena.add.graphics().setDepth(-880);
    const e0 = centro(MAPA.pilaLimpias.x - 1.55, -0.5);
    const e1 = centro(MAPA.pilaLimpias.x + 1.4, -0.5);
    gEstante.fillStyle(sombra(PALETA.fondo, 0.08), 0.92);
    gEstante.fillPoints([{ x: e0.x, y: e0.y - 4 }, { x: e1.x, y: e1.y - 4 }, { x: e1.x, y: e1.y - 40 }, { x: e0.x, y: e0.y - 40 }], true);
    gEstante.lineStyle(2, sombra(PALETA.madera, -0.2), 1);
    for (const alto of [7, 18, 29]) gEstante.lineBetween(e0.x, e0.y - alto, e1.x, e1.y - alto);
    this.gPila = escena.add.graphics().setDepth(-870);

    // 20 mesas: la marca verde es el token de Mesa_libre.
    this.mesas = [];
    for (let i = 0; i < this.comedor.mesas.length; i++) {
      const celda = celdaMesa(i);
      const px = centro(celda.x, celda.y);
      this.mesas.push(poner(escena, 'mesa_libre', px.x, px.y).setDepth(prof(celda.x, celda.y)));
    }

    // Carro de menaje: huecos (Espacio_carro) y bandejas sucias (Bandeja_sucia).
    const c = centro(MAPA.carro.x, MAPA.carro.y);
    this.carro = poner(escena, 'carro', c.x, c.y).setDepth(prof(MAPA.carro.x, MAPA.carro.y));
    this.gCarro = escena.add.graphics().setDepth(prof(MAPA.carro.x, MAPA.carro.y) + 1);

    // Estación de lavado (t_lavar) y tablero de relevo (lugar Relevo y monitores).
    const l = centro(MAPA.lavado.x, MAPA.lavado.y);
    this.lavado = poner(escena, 'fregadero', l.x, l.y).setDepth(prof(MAPA.lavado.x, MAPA.lavado.y));
    const r = centro(MAPA.relevo.x, MAPA.relevo.y);
    this.tablero = poner(escena, 'tablero', r.x, r.y).setDepth(prof(MAPA.relevo.x, MAPA.relevo.y));
    this.gTablero = escena.add.graphics().setDepth(prof(MAPA.relevo.x, MAPA.relevo.y) + 1);

    // Anillo del mostrador: se enciende cuando el estudiante en cabeza ya tiene acceso_ok.
    this.anillos = MAPA.lineas.map((linea) => {
      const m = centro(linea.mostrador.x, linea.mostrador.y);
      const g = escena.add.graphics().setDepth(8500);
      g.lineStyle(3, PALETA.operacion, 1);
      g.strokeRoundedRect(m.x + 2 - 31, m.y - 20 - 28, 62, 56, 8);
      escena.tweens.add({ targets: g, alpha: { from: 1, to: 0.35 }, duration: 420, yoyo: true, repeat: -1 });
      return g.setVisible(false);
    });
  }

  // ---------- Fase 2: entidades estocásticas en el mapa ----------

  // Indicador de la cadena Oleada junto a la entrada (con el tapete de la entrada) e
  // indicador de la ocupación observada de las mesas (cadena Mesas) junto a su rótulo.
  crearIndicadoresMarkov() {
    if (!this.comedor.markov) return;
    const escena = this.escena;
    const opciones = { ancho: 92, alto: 20, tam: 10, resolucion: RES_TEXTO_MUNDO };
    const o = centro(MAPA.oleada.x, MAPA.oleada.y);
    this.chipOleada = chipEstado(escena, o.x, o.y - 30, 'Oleada', null, opciones).setDepth(8700);
    this.etiquetaOleada = escena.add.text(o.x, o.y - 46, 'OLEADA', estilo(8, TEXTO.tenue, { fontStyle: 'bold', resolution: RES_TEXTO_MUNDO }))
      .setOrigin(0.5).setDepth(8700);
    const m = centro(12, -0.5);
    this.chipMesas = chipEstado(escena, m.x, m.y - 6, 'Mesas', null, { ...opciones, ancho: 86 }).setDepth(9000);
    this.pintarMarkov(false);
  }

  pintarMarkov(animar) {
    if (!this.chipOleada) return;
    const { oleada, mesas } = this.comedor.markov;
    const previo = this.chipOleada.estadoActual();
    this.chipOleada.fijar(oleada.estado, animar);
    this.chipMesas.fijar(mesas.estado, animar);
    const color = estiloEstado('Oleada', oleada.estado).color;
    tweenColor(this.escena, this.colorTapete ?? color, color, animar ? 300 : 0, (c) => {
      this.colorTapete = c;
      this.tapeteOleada.clear();
      for (let y = 0.5; y <= 5.5; y += 1) {
        const p = centro(-0.2, y);
        F.losa(this.tapeteOleada, p.x, p.y, c, 18, 9, 1);
      }
    });
    if (animar && previo && previo !== oleada.estado) {
      // Etiqueta flotante con el estado nuevo y un pulso breve del indicador.
      const texto = `Oleada ${previo} → ${oleada.estado}`;
      this.escena.aviso?.(texto, { x: MAPA.oleada.x, y: MAPA.oleada.y - 0.6 }, oleada.estado === 'Alta' ? TEXTO.rojo : TEXTO.claro, 1700);
      this.escena.tweens.add({ targets: this.chipOleada, scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    }
  }

  // La línea 3 se ve atenuada mientras está cerrada; abierta, con su persona de refuerzo.
  pintarLinea3(animar) {
    const visible = Boolean(this.comedor.markov);
    const abierta = this.comedor.lineas[2].abierta;
    const alfa = (objeto, valor) => (animar ? this.escena.tweens.add({ targets: objeto, alpha: valor, duration: 300 }) : objeto.setAlpha(valor));
    this.carril3.setVisible(visible);
    for (const g of this.mostrador3) { g.setVisible(visible); alfa(g, abierta ? 1 : 0.4); }
    alfa(this.carril3, abierta ? 1 : 0.25);
    this.refuerzo.setVisible(visible && abierta);
    this.letreroLinea3.setVisible(visible)
      .setText(abierta ? 'LÍNEA 3 ABIERTA' : 'LÍNEA 3 CERRADA · tecla 3')
      .setColor(abierta ? TEXTO.verde : TEXTO.tenue);
  }

  // Un rótulo por lugar: nombre corto y contador m/k.
  crearRotulos() {
    const rotulo = (clave, x, y, dy, color) => {
      const p = centro(x, y);
      this.rotulos[clave] = this.escena.add.text(p.x, p.y + dy, '', estilo(9, color, {
        fontStyle: 'bold', backgroundColor: '#0f1524cc', padding: { x: 4, y: 2 }, align: 'center', resolution: RES_TEXTO_MUNDO
      })).setOrigin(0.5).setDepth(9000);
    };
    rotulo('En_fila', 2.2, 2, 0, TEXTO.amarillo);
    rotulo('Bandeja_limpia', MAPA.pilaLimpias.x, MAPA.pilaLimpias.y, -50, TEXTO.claro);
    rotulo('Personal_linea', 10.3, 2.2, -8, '#c9b2ff');
    rotulo('Con_bandeja', 9.2, 5.6, 14, TEXTO.naranja);
    rotulo('Mesas', 12, -0.5, -30, TEXTO.verde);
    rotulo('Carro', MAPA.carro.x, MAPA.carro.y, 30, '#d9b991');
    rotulo('Personal_lavado', MAPA.lavado.x, MAPA.lavado.y, -62, '#c9b2ff');
    rotulo('Relevo', MAPA.relevo.x, MAPA.relevo.y, -64, TEXTO.naranja);
    rotulo('Salida', -0.5, 6.5, -40, TEXTO.tenue);
  }

  // Redibuja los tokens de cada lugar desde el marcado actual.
  actualizar() {
    if (!this.sucio) return;
    this.sucio = false;
    const red = this.comedor.red;
    const m = (lugar) => red.tokens(lugar);
    const k = (lugar) => red.lugares[red.iP(lugar)].k;

    // Bandeja_limpia: estante de 30 casillas; cada bandeja es un token.
    this.gPila.clear();
    const limpias = m('Bandeja_limpia');
    for (let i = 0; i < k('Bandeja_limpia'); i++) {
      const p = centro(MAPA.pilaLimpias.x - 1.3 + (i % 10) * 0.28, -0.5);
      const y = p.y - 11 - Math.floor(i / 10) * 11;
      if (i < limpias) F.bandeja(this.gPila, p.x, y, false, 0.55);
      else {
        this.gPila.lineStyle(1, 0xffffff, 0.22);
        this.gPila.strokePoints([{ x: p.x, y: y - 3 }, { x: p.x + 6, y }, { x: p.x, y: y + 3 }, { x: p.x - 6, y }], true);
      }
    }

    // Carro: 10 posiciones en 2 hileras; bandeja sucia o hueco libre.
    const c = centro(MAPA.carro.x, MAPA.carro.y);
    this.gCarro.clear();
    const sucias = m('Bandeja_sucia');
    for (let i = 0; i < k('Bandeja_sucia'); i++) {
      const columna = i % 5;
      const hilera = Math.floor(i / 5);
      const x = c.x - 16 + columna * 8 - hilera * 9;
      const y = c.y - 14 + columna * 4 + hilera * 4.5;
      if (i < sucias) F.bandeja(this.gCarro, x, y, true, 0.5);
      else {
        this.gCarro.lineStyle(1, 0xffffff, 0.45);
        this.gCarro.strokePoints([{ x, y: y - 2.6 }, { x: x + 5.2, y }, { x, y: y + 2.6 }, { x: x - 5.2, y }], true);
      }
    }

    // Mesas: libre (con marca verde) u ocupada.
    this.comedor.mesas.forEach((ocupante, i) => cambiar(this.mesas[i], ocupante === null ? 'mesa_libre' : 'mesa_ocupada'));

    // Tablero: fichas de Relevo y escudos de los monitores.
    const t = centro(MAPA.relevo.x, MAPA.relevo.y);
    this.gTablero.clear();
    for (let i = 0; i < m('Relevo'); i++) F.fichaRelevo(this.gTablero, t.x - 9 + i * 15, t.y - 33 + i * 3.6, 6);
    if (this.comedor.monitor) {
      for (let i = 0; i < m('Minimo_lavado') + m('Minimo_linea'); i++) F.escudo(this.gTablero, t.x - 13 + i * 9, t.y - 15 + i * 2.2, 0.6);
    }

    // Rótulos con el contador m/k de cada lugar.
    const fila = m('En_fila');
    this.rotulos.En_fila.setText(`En_fila ${fila}/${k('En_fila')}`).setColor(fila > k('En_fila') ? TEXTO.rojo : TEXTO.amarillo);
    this.rotulos.Bandeja_limpia.setText(`Bandeja_limpia ${m('Bandeja_limpia')}/${k('Bandeja_limpia')}`);
    this.rotulos.Personal_linea.setText(`Personal_linea ${m('Personal_linea')}`);
    this.rotulos.Con_bandeja.setText(`Con_bandeja ${m('Con_bandeja')}`);
    this.rotulos.Mesas.setText(`Mesa_libre ${m('Mesa_libre')}/${k('Mesa_libre')} · Almorzando ${m('Almorzando')}`);
    this.rotulos.Carro.setText(`Bandeja_sucia ${sucias}/${k('Bandeja_sucia')} · Espacio_carro ${m('Espacio_carro')}`)
      .setColor(m('Espacio_carro') === 0 ? TEXTO.rojo : '#d9b991');
    this.rotulos.Personal_lavado.setText(`Personal_lavado ${m('Personal_lavado')}`)
      .setColor(m('Personal_lavado') === 0 ? TEXTO.rojo : '#c9b2ff');
    this.rotulos.Relevo.setText(this.comedor.monitor
      ? `Relevo ${m('Relevo')}/2\nMín_lavado ${m('Minimo_lavado')} · Mín_línea ${m('Minimo_linea')}`
      : `Relevo ${m('Relevo')}/2\nsin monitores`);
    this.rotulos.Salida.setText(`Salida ${m('Salida')}`);

    // Desborde de En_fila: la zona de filas parpadea en rojo.
    const desbordado = fila > k('En_fila');
    if (desbordado && !this.parpadeo) {
      this.parpadeo = this.escena.tweens.add({ targets: this.capaDesborde, alpha: { from: 0.15, to: 0.7 }, duration: 320, yoyo: true, repeat: -1 });
    } else if (!desbordado && this.parpadeo) {
      this.parpadeo.stop();
      this.parpadeo = null;
      this.capaDesborde.setAlpha(0);
    }

    // Anillo "listo para servir" en cada mostrador.
    this.comedor.lineas.forEach((linea, i) => {
      const cabeza = this.comedor.cabeza(linea.id);
      this.anillos[i].setVisible(Boolean(cabeza) && this.comedor.eventosDeshabilitados(cabeza).length === 0);
    });
  }
}
