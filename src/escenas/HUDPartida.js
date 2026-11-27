// HUD de partida (escena superpuesta, fija sobre la planta). Zonas del GDD:
// reloj y turno arriba a la izquierda, puntaje arriba al centro, Radar del
// Árbol de Cobertura arriba a la derecha, tokens por lugar abajo a la
// izquierda, alertas abajo a la derecha y botones táctiles abajo al centro.
// Solo lee el modelo; las acciones salen por el gestor de entrada.

import { ANCHO, ALTO, LOGROS, TIEMPOS, VELOCIDADES, UMBRAL_RIESGO, PASOS_RIESGO, PROYECTO_LOG, FECHA_BASE_LOG, META_LOGRO_REGISTRO } from '../config.js';
import { PALETA, TEXTO, RADAR, estilo, estiloMono, css } from '../arte/paleta.js';
import { prepararCamara } from '../arte/resolucion.js';
import { panel, boton } from '../arte/ui.js';
import { chipEstado, estiloEstado, botonExportar } from '../arte/markov.js';
import { entrada } from '../entrada/gestorEntrada.js';
import { PASO_K_S } from '../simulacion/flujo.js';
import { aCSV } from '../telemetria/exportarCSV.js';
import { aXES } from '../telemetria/exportarXES.js';
import { descargar, nombreArchivo, TIPOS } from '../telemetria/descarga.js';
import { sonido } from '../audio/sonido.js';

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const CORTO = { t_servir: 'serv', t_sentarse: 'sent', t_terminar: 'term', t_lavar: 'lava', t_a_linea: '→lín', t_a_lavado: '→lav' };
const COLOR_NIVEL = { info: TEXTO.claro, aviso: TEXTO.amarillo, fallo: TEXTO.rojo, ok: TEXTO.verde };

export class HUDPartida extends Phaser.Scene {
  constructor() {
    super('HUDPartida');
  }

  create() {
    prepararCamara(this);
    this.planta = this.scene.get('Planta');
    this.comedor = this.planta.comedor;
    const c = this.comedor;
    entrada.conectarTeclado(this);

    // --- Arriba a la izquierda: reloj de simulación y turno ---
    panel(this, 8, 8, 210, 58);
    this.add.text(18, 13, `Turno ${c.turno.id} · ${c.turno.nombre}`, estilo(12, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.textoReloj = this.add.text(18, 29, '', estiloMono(14, TEXTO.claro, { fontStyle: 'bold' }));
    this.textoRelevo = this.add.text(18, 48, '', estilo(10, TEXTO.tenue));

    // --- Arriba a la izquierda, junto al reloj: cadena de Markov (Fase 2) ---
    this.crearIndicadorMarkov();

    // --- Arriba al centro: puntaje ---
    panel(this, 372, 8, 216, 50);
    this.textoPuntaje = this.add.text(ANCHO / 2, 22, '0', estilo(22, TEXTO.claro, { fontStyle: 'bold' })).setOrigin(0.5);
    this.textoSalida = this.add.text(ANCHO / 2, 46, '', estilo(10, TEXTO.tenue)).setOrigin(0.5);

    // --- Arriba a la derecha: Radar del Árbol de Cobertura ---
    panel(this, 742, 8, 210, 98);
    this.luzRadar = this.add.graphics();
    this.textoRadar = this.add.text(784, 14, '', estilo(12, TEXTO.verde, { fontStyle: 'bold' }));
    this.detalleRadar = this.add.text(784, 30, '', estilo(9, TEXTO.tenue, { wordWrap: { width: 162 }, lineSpacing: -1 }));
    this.grafoRadar = this.add.graphics();
    this.etiquetasRadar = Array.from({ length: 6 }, () => this.add.text(0, 0, '', estiloMono(8, TEXTO.tenue)).setOrigin(0.5, 0));
    this.parpadeoRadar = this.tweens.add({ targets: this.luzRadar, alpha: 0.25, duration: 260, yoyo: true, repeat: -1, paused: true });

    // --- Abajo a la izquierda: tokens por lugar ---
    panel(this, 8, 422, 264, 110);
    this.add.text(16, 426, 'TOKENS POR LUGAR  m/k', estilo(9, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.textosTokens = Array.from({ length: 14 }, (v, i) =>
      this.add.text(16 + Math.floor(i / 7) * 132, 440 + (i % 7) * 13, '', estiloMono(10, TEXTO.claro)));

    // --- Abajo a la derecha: alertas ---
    panel(this, 652, 422, 300, 110);
    this.add.text(660, 426, 'ALERTAS', estilo(9, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.textosAlertas = Array.from({ length: 6 }, (v, i) => this.add.text(660, 440 + i * 15, '', estilo(9.5, TEXTO.claro)));
    this.planta.events.on('alerta', () => this.pintarAlertas());
    // Fase 2: contador del Event Log junto a las alertas (GDD 16.9).
    this.textoLog = this.add.text(944, 426, '', estilo(9, TEXTO.azul, { fontStyle: 'bold' })).setOrigin(1, 0);

    // --- Abajo al centro: botones táctiles (las mismas acciones que el teclado) ---
    const anchos = [50, 44, 36, 46, 44, 50, 50];
    let x = 281;
    const poner = (i, etiqueta, color, accion) => {
      const b = boton(this, x + anchos[i] / 2, 517, etiqueta, { ancho: anchos[i], alto: 28, tam: 10, color }, accion);
      x += anchos[i] + 4;
      return b;
    };
    const siguienteVelocidad = () => VELOCIDADES[(VELOCIDADES.indexOf(c.reloj.velocidad) + 1) % VELOCIDADES.length];
    this.botonPausa = poner(0, 'PAUSA', 0x2a3347, () => entrada.pausa());
    poner(1, 'INSP', 0x2a3347, () => entrada.inspector());
    this.botonVelocidad = poner(2, '×1', 0x2a3347, () => entrada.velocidad(siguienteVelocidad()));
    this.botonPiloto = poner(3, 'AUTO', 0x2a3347, () => entrada.piloto());
    this.botonMonitor = poner(4, 'MON', PALETA.mantenimiento, () => entrada.monitor());
    this.botonALinea = poner(5, '→LÍN', PALETA.relevo, () => entrada.solicitarDisparo('t_a_linea'));
    this.botonALavado = poner(6, '→LAV', PALETA.relevo, () => entrada.solicitarDisparo('t_a_lavado'));

    // --- Fase 2: segunda fila de botones (M, L, E, 3, H y FIN en el turno 4) ---
    this.crearBotonesFase2();
    this.crearListaEventos();
    this.crearMenuExportar();

    // --- fps y tiempo de simulación (F1) ---
    this.textoFps = this.add.text(8, 70, '', estiloMono(10, TEXTO.verde, { backgroundColor: '#0f1524', padding: { x: 4, y: 2 } })).setVisible(false);
    entrada.on('fps', () => this.textoFps.setVisible(!this.textoFps.visible));

    // --- avisos del núcleo ---
    this.colaLogros = [];
    c.on('logro', (e) => { this.colaLogros.push(e.id); if (this.colaLogros.length === 1) this.mostrarLogro(); });
    c.on('puntaje', (e) => this.flotarPuntos(e.delta));
    c.on('game_over', (g) => this.mostrarInterbloqueo(g));
    c.on('restaurado', () => this.ocultarInterbloqueo());
    c.on('red', () => { this.tokensSucios = true; });
    c.on('red_cambiada', () => { this.tokensSucios = true; });
    this.tokensSucios = true;
    this.radarPintado = null;
    this.pintarAlertas();
  }

  update() {
    const c = this.comedor;
    const reloj = c.reloj;
    const llegadas = c.modoMarkov ? c.pasosTurno * PASO_K_S : c.turno.llegadas;
    const total = Number.isFinite(llegadas) ? mmss(llegadas + TIEMPOS.margenFinal) : '∞';
    this.textoReloj.setText(`${mmss(reloj.tiempo)} / ${total}  ×${reloj.velocidad}${reloj.pausado ? '  PAUSA' : ''}`);
    this.textoRelevo.setText(`Cambio de turno del personal en ${Math.ceil(TIEMPOS.relevo - (reloj.tiempo % TIEMPOS.relevo))} s`);
    this.textoPuntaje.setText(String(c.puntaje));
    this.textoSalida.setText(c.modoMarkov
      ? `Salida ${c.stats.completados} de ${c.stats.llegadas} que llegaron · servidos ${c.stats.servidos}`
      : `Salida ${c.stats.completados}/${c.turno.estudiantes} · servidos ${c.stats.servidos}`);
    this.pintarMarkov();
    this.botonPausa.fijarTexto(reloj.pausado ? 'SEGUIR' : 'PAUSA');
    this.botonVelocidad.fijarTexto(`×${reloj.velocidad}`);
    if (this.pilotoPintado !== c.piloto) { this.pilotoPintado = c.piloto; this.botonPiloto.fijarColor(c.piloto ? PALETA.operacion : 0x2a3347); }
    if (this.monitorPintado !== c.monitor) { this.monitorPintado = c.monitor; this.botonMonitor.fijarColor(c.monitor ? PALETA.mantenimiento : PALETA.fallo); }
    if (this.tokensSucios) this.pintarTokens();
    if (this.radarPintado !== c.radar) this.pintarRadar();
    if (this.listaSucia) this.pintarLista();
    if (this.textoFps.visible) {
      this.textoFps.setText(`fps ${this.game.loop.actualFps.toFixed(0)} · t sim ${reloj.tiempo.toFixed(1)} s · estudiantes ${c.estudiantes.size} · eventos en cola ${reloj.cola.length}`);
    }
  }

  // ---------- Fase 2: indicador de Markov junto al reloj (GDD 16.9) ----------

  crearIndicadorMarkov() {
    const c = this.comedor;
    panel(this, 224, 8, 142, 58);
    if (!c.markov) {
      this.add.text(232, 14, 'LLEGADAS', estilo(9, TEXTO.amarillo, { fontStyle: 'bold' }));
      this.add.text(232, 29, 'ola fija', estilo(13, TEXTO.claro, { fontStyle: 'bold' }));
      this.add.text(232, 48, 'modo de la Fase 1', estilo(9, TEXTO.tenue));
      return;
    }
    this.add.text(232, 12, 'PASO k', estilo(9, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.textoPasos = this.add.text(358, 12, '', estilo(9, TEXTO.tenue)).setOrigin(1, 0);
    this.textoK = this.add.text(231, 22, '0', estiloMono(19, TEXTO.claro, { fontStyle: 'bold' }));
    this.chipOleada = chipEstado(this, 322, 33, 'Oleada', c.markov.oleada.estado, { ancho: 78, alto: 20, tam: 10 });
    this.textoRiesgo = this.add.text(232, 49, '', estilo(9, TEXTO.verde, { fontStyle: 'bold' }));
    this.textoMesas = this.add.text(358, 49, '', estilo(9, TEXTO.tenue)).setOrigin(1, 0);
    // Aviso del GDD: parpadea en amarillo si P(Alta en <= 3 pasos) supera el umbral.
    this.parpadeoRiesgo = this.tweens.add({ targets: [this.textoRiesgo, this.chipOleada], alpha: 0.3, duration: 280, yoyo: true, repeat: -1, paused: true });
    c.on('markov', () => {
      this.tweens.add({ targets: this.textoK, scale: { from: 1.35, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    });
  }

  pintarMarkov() {
    const c = this.comedor;
    if (!this.textoK) return;
    const { oleada, mesas } = c.markov;
    this.textoK.setText(String(c.k));
    this.textoPasos.setText(Number.isFinite(c.pasosTurno) ? `de ${c.pasosTurno} pasos` : 'turno continuo');
    this.chipOleada.fijar(oleada.estado);
    const riesgo = c.riesgo();
    const alto = riesgo >= UMBRAL_RIESGO;
    this.textoRiesgo.setText(`Alta≤${PASOS_RIESGO}: ${Math.round(riesgo * 100)} %`).setColor(alto ? TEXTO.amarillo : TEXTO.verde);
    this.textoMesas.setText(`mesas ${estiloEstado('Mesas', mesas.estado).texto}`);
    if (alto && this.parpadeoRiesgo.isPaused()) this.parpadeoRiesgo.resume();
    if (!alto && !this.parpadeoRiesgo.isPaused()) {
      this.parpadeoRiesgo.pause();
      this.textoRiesgo.setAlpha(1);
      this.chipOleada.setAlpha(1);
    }
    const r = this.planta.registrador.resumen();
    this.textoLog.setText(`Casos abiertos ${r.abiertos} · cerrados ${r.cerrados} · eventos ${r.eventos}`);
  }

  // Segunda fila de botones táctiles: las mismas acciones que M, L, E, 3 y H.
  crearBotonesFase2() {
    const c = this.comedor;
    const especificacion = [
      ['MARKOV', 64, PALETA.mantenimiento, () => entrada.markov()],
      ['LOG', 44, 0x2a3347, () => entrada.log()],
      ['EXPORTAR', 76, PALETA.mantenimiento, () => entrada.exportar()],
      ['LÍNEA 3', 66, 0x2a3347, () => entrada.linea3()],
      ['CALOR', 56, 0x2a3347, () => entrada.calor()]
    ];
    if (c.turno.continuo) especificacion.push(['FIN', 40, PALETA.fallo, () => entrada.fin()]);
    let x = 281;
    this.botonesFase2 = {};
    for (const [etiqueta, ancho, color, accion] of especificacion) {
      this.botonesFase2[etiqueta] = boton(this, x + ancho / 2, 485, etiqueta, { ancho, alto: 28, tam: 10, color }, accion);
      x += ancho + 4;
    }
    if (!c.markov) this.botonesFase2['LÍNEA 3'].activar(false);
    const pintarLinea3 = () => this.botonesFase2['LÍNEA 3'].fijarColor(c.lineas[2].abierta ? PALETA.operacion : 0x2a3347);
    c.on('linea3', pintarLinea3);
    c.on('restaurado', pintarLinea3);
    entrada.on('log', () => this.alternarLista());
    entrada.on('exportar', (formato) => (formato ? this.exportar(formato) : this.alternarMenuExportar()));
  }

  // ---------- Fase 2: últimos 10 eventos del log (tecla L) ----------

  crearListaEventos() {
    const fondo = panel(this, 520, 238, 432, 180, { alfa: 0.96 });
    const titulo = this.add.text(530, 244, 'ÚLTIMOS 10 EVENTOS DEL LOG (L)', estilo(9.5, TEXTO.amarillo, { fontStyle: 'bold' }));
    const cabecera = this.add.text(530, 259, 'hora del log   Case_ID   Activity          Resource_ID   Markov', estiloMono(9, TEXTO.tenue));
    this.filasLista = Array.from({ length: 10 }, (v, i) => this.add.text(530, 273 + i * 14, '', estiloMono(9, TEXTO.claro)));
    this.lista = this.add.container(0, 0, [fondo, titulo, cabecera, ...this.filasLista]).setVisible(false).setDepth(40);
    this.planta.registrador.on((e) => { if (e.tipo === 'cerrar' && this.lista.visible) this.listaSucia = true; });
  }

  alternarLista() {
    this.lista.setVisible(!this.lista.visible);
    if (this.lista.visible) this.pintarLista();
  }

  pintarLista() {
    this.listaSucia = false;
    const filas = this.planta.registrador.ultimos(10);
    this.filasLista.forEach((texto, i) => {
      const f = filas[i];
      texto.setText(f ? `${f.Timestamp_Fin.slice(11, 21)}  ${f.Case_ID.padEnd(9)} ${f.Activity.padEnd(17)} ${f.Resource_ID.padEnd(13)} ${f.Markov_State}` : '');
      texto.setColor(f ? (f.Markov_State === 'Alta' ? TEXTO.rojo : TEXTO.claro) : TEXTO.claro);
    });
  }

  // ---------- Fase 2: menú de exportación (tecla E) ----------

  crearMenuExportar() {
    this.soloCerrados = false;
    const fondo = panel(this, 330, 300, 300, 150, { alfa: 0.97, borde: PALETA.mantenimiento, alfaBorde: 0.9 });
    const titulo = this.add.text(342, 308, 'EXPORTAR EVENT LOG (E)', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    const cerrar = boton(this, 612, 316, 'X', { ancho: 22, alto: 20, tam: 10, color: 0x2a3347 }, () => this.alternarMenuExportar());
    this.textoMenu = this.add.text(342, 328, '', estilo(9.5, TEXTO.tenue, { wordWrap: { width: 276 } }));
    this.botonCSV = botonExportar(this, 410, 372, () => this.exportar('csv'), { ancho: 130, alto: 28, tam: 10 });
    this.botonCSV.fijarTexto('DESCARGAR CSV');
    this.botonXES = botonExportar(this, 550, 372, () => this.exportar('xes'), { ancho: 130, alto: 28, tam: 10 });
    this.botonXES.fijarTexto('DESCARGAR XES');
    this.botonCerrados = boton(this, 480, 410, '', { ancho: 276, alto: 26, tam: 10, color: 0x2a3347 }, () => {
      this.soloCerrados = !this.soloCerrados;
      this.pintarMenuExportar();
    });
    this.menuExportar = this.add.container(0, 0, [fondo, titulo, cerrar, this.textoMenu, this.botonCSV, this.botonXES, this.botonCerrados])
      .setVisible(false).setDepth(45);
  }

  alternarMenuExportar() {
    this.menuExportar.setVisible(!this.menuExportar.visible);
    if (this.menuExportar.visible) this.pintarMenuExportar();
  }

  pintarMenuExportar() {
    const r = this.planta.registrador.resumen();
    this.textoMenu.setText(`${r.cerrados} casos cerrados, ${r.abiertos} abiertos y ${r.eventos} eventos. Marcas de tiempo desde ${FECHA_BASE_LOG} más el reloj de simulación.`);
    this.botonCerrados.fijarTexto(`${this.soloCerrados ? '☑' : '☐'} Solo casos cerrados`).fijarColor(this.soloCerrados ? PALETA.operacion : 0x2a3347);
    this.botonCSV.fijarTexto('DESCARGAR CSV');
    this.botonXES.fijarTexto('DESCARGAR XES');
  }

  // Descarga el log en CSV o XES desde el navegador (Blob y enlace temporal).
  exportar(formato) {
    const registrador = this.planta.registrador;
    const soloCerrados = this.soloCerrados;
    const semilla = this.comedor.semilla;
    const contenido = formato === 'csv'
      ? aCSV(registrador.filasLog({ soloCerrados }))
      : aXES(registrador.trazas({ soloCerrados }), { proyecto: PROYECTO_LOG, semilla, fechaBase: FECHA_BASE_LOG });
    const { nombre } = descargar(nombreArchivo(PROYECTO_LOG, semilla, formato), contenido, TIPOS[formato]);
    const r = registrador.resumen();
    sonido.activar();
    sonido.exportar();
    (formato === 'csv' ? this.botonCSV : this.botonXES)?.descargando();
    const quitados = soloCerrados ? ` (sin los ${r.abiertos} casos abiertos)` : '';
    this.planta.alertar(`Log exportado: ${nombre}${quitados}`, 'ok');
    if (r.cerrados >= META_LOGRO_REGISTRO) this.comedor.otorgar('registro_completo');
  }

  // Transición de barrido (wipe) hacia Resultados.
  barrido(alTerminar) {
    const cortina = this.add.rectangle(-ANCHO / 2, ALTO / 2, ANCHO, ALTO, PALETA.fondo).setDepth(200);
    const borde = this.add.rectangle(-4, ALTO / 2, 8, ALTO, PALETA.espera).setDepth(201);
    this.tweens.add({ targets: [cortina, borde], x: `+=${ANCHO}`, duration: 460, ease: 'Cubic.easeIn', onComplete: alTerminar });
  }

  pintarTokens() {
    this.tokensSucios = false;
    const red = this.comedor.red;
    this.textosTokens.forEach((texto, i) => {
      const lugar = red.lugares[i];
      if (!lugar) { texto.setText(''); return; }
      const m = red.M[i];
      texto.setText(`${lugar.nombre.padEnd(15)}${String(m).padStart(3)}${lugar.k != null ? '/' + lugar.k : ''}`);
      const desborda = lugar.capacidad === 'desborde' && lugar.k != null && m > lugar.k;
      texto.setColor(desborda ? TEXTO.rojo : m === 0 ? TEXTO.tenue : TEXTO.claro);
    });
    this.botonALinea.fijarColor(red.habilitada('t_a_linea') ? PALETA.relevo : 0x4a4f5a);
    this.botonALavado.fijarColor(red.habilitada('t_a_lavado') ? PALETA.relevo : 0x4a4f5a);
  }

  // Radar: color, distancia al interbloqueo y mini-grafo de los últimos marcados.
  pintarRadar() {
    const radar = this.comedor.radar;
    this.radarPintado = radar;
    const color = RADAR[radar.estado];
    this.luzRadar.clear();
    this.luzRadar.fillStyle(color, 1);
    this.luzRadar.fillCircle(763, 28, 12);
    this.luzRadar.lineStyle(2, 0xffffff, 0.5);
    this.luzRadar.strokeCircle(763, 28, 12);
    if (radar.estado === 'amarillo') this.parpadeoRadar.resume();
    else { this.parpadeoRadar.pause(); this.luzRadar.setAlpha(1); }
    this.textoRadar.setText(`RADAR · ${radar.estado.toUpperCase()}`).setColor(css(color));
    if (radar.estado === 'verde') this.detalleRadar.setText('Sin interbloqueo alcanzable en 3 disparos');
    else if (radar.estado === 'amarillo') {
      const b = radar.bloqueos[0];
      this.detalleRadar.setText(`Interbloqueo a ${b.distancia} disparo(s):\n${b.camino.join(' · ')}`);
    } else this.detalleRadar.setText('Marcado muerto con estudiantes en proceso');

    // Mini-grafo M(k-5) ... M(k): un nodo por marcado, coloreado por su radar.
    const g = this.grafoRadar;
    g.clear();
    const n = radar.historial.length;
    radar.historial.forEach((h, i) => {
      const x = 760 + i * 34;
      const y = 76;
      if (i > 0) { g.lineStyle(2, 0xffffff, 0.35); g.lineBetween(x - 34 + 6, y, x - 6, y); }
      g.fillStyle(RADAR[h.estado], 1);
      g.fillCircle(x, y, i === n - 1 ? 6.5 : 4.5);
      if (i === n - 1) { g.lineStyle(1.5, 0xffffff, 0.9); g.strokeCircle(x, y, 6.5); }
      this.etiquetasRadar[i].setPosition(x, y + 9).setText(CORTO[h.etiqueta] ?? h.etiqueta.replace('+En_fila', '+fila').replace('+Relevo', '+rel').slice(0, 7));
    });
    for (let i = n; i < 6; i++) this.etiquetasRadar[i].setText('');
  }

  pintarAlertas() {
    const alertas = this.planta.alertas;
    this.textosAlertas.forEach((texto, i) => {
      const a = alertas[i];
      texto.setText(a ? `${mmss(a.t)}  ${a.texto}`.slice(0, 62) : '').setColor(a ? COLOR_NIVEL[a.nivel] : TEXTO.claro);
    });
  }

  flotarPuntos(delta) {
    if (delta === 0) return;
    const t = this.add.text(ANCHO / 2 + 70, 22, `${delta > 0 ? '+' : ''}${delta}`, estilo(14, delta > 0 ? TEXTO.verde : TEXTO.rojo, { fontStyle: 'bold' })).setOrigin(0.5);
    this.tweens.add({ targets: t, y: 4, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // Aviso animado de logro (tween de entrada y salida).
  mostrarLogro() {
    const logro = LOGROS.find((l) => l.id === this.colaLogros[0]);
    const fondo = panel(this, -170, -24, 340, 48, { color: 0x14301f, borde: PALETA.operacion, alfaBorde: 1, alfa: 0.97 });
    const titulo = this.add.text(0, -16, `LOGRO · ${logro.nombre}`, estilo(13, TEXTO.verde, { fontStyle: 'bold' })).setOrigin(0.5, 0);
    const detalle = this.add.text(0, 3, logro.condicion, estilo(9.5, TEXTO.claro)).setOrigin(0.5, 0);
    const aviso = this.add.container(ANCHO / 2, 40, [fondo, titulo, detalle]).setAlpha(0).setDepth(50);
    this.tweens.chain({
      targets: aviso,
      tweens: [
        { y: 92, alpha: 1, duration: 320, ease: 'Back.easeOut' },
        { scale: 1.05, duration: 160, yoyo: true },
        { alpha: 0, y: 70, delay: 2300, duration: 300 }
      ],
      onComplete: () => {
        aviso.destroy();
        this.colaLogros.shift();
        if (this.colaLogros.length > 0) this.mostrarLogro();
      }
    });
  }

  // Game over por interbloqueo: marcado muerto, por qué, secuencia y prevención.
  mostrarInterbloqueo(g) {
    this.ocultarInterbloqueo();
    const red = this.comedor.red;
    const velo = this.add.rectangle(ANCHO / 2, ALTO / 2, ANCHO, ALTO, 0x000000, 0.62).setInteractive();
    const fondo = panel(this, 130, 44, 700, 452, { color: 0x1a0f14, borde: PALETA.fallo, alfaBorde: 1, alfa: 0.98 });
    const titulo = this.add.text(ANCHO / 2, 54, 'GAME OVER POR INTERBLOQUEO', estilo(21, TEXTO.rojo, { fontStyle: 'bold' })).setOrigin(0.5, 0);
    const marcado = Object.entries(g.marcado).map(([lugar, m]) => `${lugar} ${m}`).join(' · ');
    const porque = red.transiciones.map((t) =>
      `${t.nombre.padEnd(11)} ${red.faltantes(t.nombre).map((f) => `falta ${f.lugar} (${f.tiene}/${f.necesita})`).join(', ')}`).join('\n');
    const conteo = red.transiciones.map((t) => `${t.nombre} ${g.secuencia.filter((s) => s === t.nombre).length}`).join(', ');
    const cuerpo = [
      [`Marcado muerto en t = ${g.tiempo.toFixed(0)} s: ninguna transición habilitada y hay estudiantes en proceso.`, estilo(11, TEXTO.claro)],
      [marcado, estiloMono(10, TEXTO.amarillo, { wordWrap: { width: 664 } })],
      ['Por qué ninguna transición puede dispararse (M < Pre):', estilo(11, TEXTO.claro, { fontStyle: 'bold' })],
      [porque, estiloMono(10, TEXTO.rojo)],
      [`Secuencia: ${g.secuencia.length} disparos. Conteo u = (${conteo}).`, estilo(10, TEXTO.claro, { wordWrap: { width: 664 } })],
      [`Últimos disparos: ${g.secuencia.slice(-7).join(' · ')}`, estiloMono(9.5, TEXTO.tenue, { wordWrap: { width: 664 } })],
      [`Qué pasó: ${g.descripcion}`, estilo(10, TEXTO.claro, { wordWrap: { width: 664 } })],
      [`Regla de prevención: ${g.prevencion}`, estilo(10, TEXTO.verde, { wordWrap: { width: 664 } })]
    ];
    const piezas = [velo, fondo, titulo];
    let y = 86;
    for (const [texto, formato] of cuerpo) {
      const t = this.add.text(148, y, texto, formato);
      piezas.push(t);
      y += t.height + 7;
    }
    piezas.push(
      boton(this, 262, 466, 'Reintentar desde el último verde', { ancho: 230, alto: 34, tam: 11, color: PALETA.mantenimiento }, () => this.planta.reintentar()),
      boton(this, 492, 466, 'Reintentar con monitores', { ancho: 200, alto: 34, tam: 11, color: PALETA.operacion }, () => this.planta.reintentarConMonitores()),
      boton(this, 712, 466, 'Ver resultados', { ancho: 200, alto: 34, tam: 11, color: 0x2a3347 }, () => this.planta.abandonar())
    );
    this.capaInterbloqueo = this.add.container(0, 0, piezas).setDepth(100);
  }

  ocultarInterbloqueo() {
    if (this.capaInterbloqueo) this.capaInterbloqueo.destroy();
    this.capaInterbloqueo = null;
  }
}
