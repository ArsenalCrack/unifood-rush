// Simulación acelerada «Generar log» (guía 5.7.6): corre solo el núcleo, sin dibujar
// la planta, con la política automática del GDD (16.7) hasta N casos cerrados, con una
// barra de progreso, y descarga el Event Log en CSV y XES al terminar.

import { LOGROS, META_LOGRO_REGISTRO, PROYECTO_LOG } from '../config.js';
import { PALETA, TEXTO, estilo, estiloMono } from '../arte/paleta.js';
import { prepararCamara } from '../arte/resolucion.js';
import { panel, boton } from '../arte/ui.js';
import { barras, leyenda, numero, PANEL } from '../arte/markov.js';
import { crearSimulacionAcelerada } from '../simulacion/acelerada.js';
import { descargar, nombreArchivo, TIPOS } from '../telemetria/descarga.js';
import { sesion } from '../sesion.js';
import { sonido } from '../audio/sonido.js';

const CASOS = [200, 300, 500];

export class GenerarLog extends Phaser.Scene {
  constructor() {
    super('GenerarLog');
  }

  create() {
    prepararCamara(this);
    this.cameras.main.fadeIn(300, 29, 36, 51);
    this.casos = 300;
    this.politica = 'base';
    this.semilla = sesion.semilla;
    this.simulacion = null;
    this.resultado = null;
    this.resumenObjetos = [];

    this.add.text(40, 26, 'Generar Event Log', estilo(32, TEXTO.claro, { fontStyle: 'bold' }));
    this.add.text(42, 68, 'Simulación acelerada: solo el núcleo (autómatas, red de Petri y cadenas de Markov), sin dibujar la planta.', estilo(12.5, TEXTO.tenue));

    panel(this, 36, 100, 420, 300);
    this.add.text(52, 110, 'OPCIONES', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.add.text(52, 136, 'Casos cerrados', estilo(12, TEXTO.claro));
    this.botonesCasos = CASOS.map((n, i) => boton(this, 238 + i * 72, 144, String(n), { ancho: 64, alto: 26, tam: 12 }, () => { this.casos = n; this.refrescar(); }));
    this.add.text(52, 178, 'Política (GDD 16.7)', estilo(12, TEXTO.claro));
    this.botonBase = boton(this, 270, 186, 'Base: línea 3 cerrada', { ancho: 200, alto: 26, tam: 11 }, () => { this.politica = 'base'; this.refrescar(); });
    this.botonMejorada = boton(this, 270, 218, 'Mejorada: línea 3 anticipada', { ancho: 200, alto: 26, tam: 11 }, () => { this.politica = 'mejorada'; this.refrescar(); });
    this.add.text(52, 252, 'Semilla', estilo(12, TEXTO.claro));
    this.textoSemilla = this.add.text(238, 252, '', estiloMono(13, TEXTO.amarillo, { fontStyle: 'bold' })).setOrigin(0.5, 0);
    boton(this, 300, 260, '−', { ancho: 28, alto: 24, tam: 13, color: 0x2a3347 }, () => { this.semilla = Math.max(1, this.semilla - 1); this.refrescar(); });
    boton(this, 334, 260, '+', { ancho: 28, alto: 24, tam: 13, color: 0x2a3347 }, () => { this.semilla += 1; this.refrescar(); });
    this.add.text(52, 286, 'El piloto sirve, un torniquete bloqueado se repara a los 6 s con RS1S2K y los monitores están activos. Con la misma semilla, base y mejorada reciben las mismas oleadas y llegadas.',
      estilo(10, TEXTO.tenue, { wordWrap: { width: 388 } }));
    this.botonGenerar = boton(this, 246, 370, 'GENERAR Y DESCARGAR', { ancho: 380, alto: 40, tam: 15, color: PALETA.operacion }, () => this.generar());

    // Progreso y resumen.
    panel(this, 476, 100, 448, 400);
    this.add.text(492, 110, 'PROGRESO', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.barra = this.add.graphics();
    this.textoProgreso = this.add.text(700, 160, 'Elige las opciones y pulsa GENERAR.', estilo(11, TEXTO.tenue)).setOrigin(0.5, 0);
    boton(this, 246, 470, 'Volver al título', { ancho: 200, alto: 34, tam: 13, color: 0x2a3347 }, () => this.volver());
    this.input.keyboard.on('keydown-ESC', () => this.volver());
    this.pintarBarra(0);
    this.refrescar();
  }

  refrescar() {
    this.botonesCasos.forEach((b, i) => b.fijarColor(CASOS[i] === this.casos ? PALETA.mantenimiento : 0x2a3347));
    this.botonBase.fijarColor(this.politica === 'base' ? PALETA.mantenimiento : 0x2a3347);
    this.botonMejorada.fijarColor(this.politica === 'mejorada' ? PALETA.mantenimiento : 0x2a3347);
    this.textoSemilla.setText(String(this.semilla));
  }

  pintarBarra(fraccion) {
    this.barra.clear();
    this.barra.fillStyle(0xffffff, 0.12);
    this.barra.fillRoundedRect(500, 134, 400, 16, 8);
    this.barra.fillStyle(PALETA.operacion, 1);
    this.barra.fillRoundedRect(500, 134, Math.max(16, 400 * fraccion), 16, 8);
  }

  generar() {
    if (this.simulacion && !this.resultado) return; // ya está corriendo
    sonido.activar();
    sonido.clic();
    for (const o of this.resumenObjetos) o.destroy();
    this.resumenObjetos = [];
    this.resultado = null;
    this.simulacion = crearSimulacionAcelerada({ semilla: this.semilla, casos: this.casos, politica: this.politica });
    this.botonGenerar.activar(false);
  }

  // Un tramo de simulación por cuadro para que la barra avance.
  update() {
    const sim = this.simulacion;
    if (!sim || this.resultado) return;
    const progreso = sim.avanzar(45);
    this.pintarBarra(progreso);
    const r = sim.registrador.resumen();
    this.textoProgreso.setText(`${r.cerrados} de ${this.casos} casos cerrados · paso k = ${sim.comedor.k} · ${Math.round(sim.comedor.reloj.tiempo)} s de simulación`);
    if (sim.listo()) this.terminar();
  }

  terminar() {
    this.resultado = this.simulacion.resultado();
    const { csv, xes, resumen: r } = this.resultado;
    const proyecto = `${PROYECTO_LOG}_${this.politica}`;
    descargar(nombreArchivo(proyecto, this.semilla, 'csv'), csv, TIPOS.csv);
    descargar(nombreArchivo(proyecto, this.semilla, 'xes'), xes, TIPOS.xes);
    sonido.exportar();
    if (r.casosCerrados >= META_LOGRO_REGISTRO && !sesion.logros.has('registro_completo')) {
      sesion.guardarLogro('registro_completo');
      sonido.logro();
    }
    this.botonGenerar.activar(true).fijarTexto('GENERAR OTRA VEZ');
    this.pintarBarra(1);
    this.textoProgreso.setText(r.interbloqueo ? 'Terminó por interbloqueo.' : 'Listo: se descargaron el CSV y el XES.');
    this.pintarResumen(r);
  }

  pintarResumen(r) {
    const t = (x, y, texto, formato) => { const o = this.add.text(x, y, texto, formato); this.resumenObjetos.push(o); return o; };
    const filas = [
      ['Casos cerrados en el log', String(r.casosCerrados)],
      ['Eventos (filas del CSV)', String(r.eventos)],
      ['Casos incompletos que no entran', String(r.casosIncompletos)],
      ['Pasos k · tiempo de simulación', `${r.pasos} · ${Math.round(r.tiempo)} s`],
      ['Tiempo medio de ciclo', `${numero(r.tiempoCicloMedio, 1)} s`],
      ['Desbordes de En_fila', String(r.desbordes)],
      ['Pasos con la línea 3 abierta', String(r.pasosLinea3)],
      ['χ² de la oleada (gl, valor p)', `${numero(r.chi.estadistico, 2)} (${r.chi.gl}, ${numero(r.chi.valorP, 3)})`]
    ];
    filas.forEach(([nombre, valor], i) => {
      t(496, 186 + i * 19, nombre, estilo(11, TEXTO.claro));
      t(904, 186 + i * 19, valor, estiloMono(11, TEXTO.amarillo)).setOrigin(1, 0);
    });
    t(496, 344, 'Oleada: π teórico y frecuencias de la simulación', estilo(10, TEXTO.claro, { fontStyle: 'bold' }));
    const series = [
      { valores: r.pi, color: PANEL.serieTeorica, etiqueta: 'π teórico' },
      { valores: r.frecuencias, color: PANEL.serieObservada, etiqueta: 'simulación' }
    ];
    const { objetos } = barras(this, 540, 364, { ancho: 340, alto: 90, categorias: r.estados, series, max: 0.6, decimales: 2, tam: 8.5 });
    this.resumenObjetos.push(...objetos, ...leyenda(this, 700, 488, series));
    if (sesion.logros.has('registro_completo')) {
      const logro = LOGROS.find((l) => l.id === 'registro_completo');
      t(496, 486, `Logro: ${logro.nombre}`, estilo(10, TEXTO.verde, { fontStyle: 'bold' }));
    }
  }

  volver() {
    if (this.simulacion && !this.resultado) return; // espera a que termine
    this.cameras.main.fadeOut(250, 29, 36, 51);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Titulo'));
  }
}
