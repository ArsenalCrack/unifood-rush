// HUD de partida (escena superpuesta, fija sobre la planta). Zonas del GDD:
// reloj y turno arriba a la izquierda, puntaje arriba al centro, Radar del
// Árbol de Cobertura arriba a la derecha, tokens por lugar abajo a la
// izquierda, alertas abajo a la derecha y botones táctiles abajo al centro.
// Solo lee el modelo; las acciones salen por el gestor de entrada.

import { ANCHO, ALTO, LOGROS, TIEMPOS } from '../config.js';
import { PALETA, TEXTO, RADAR, estilo, estiloMono, css } from '../arte/paleta.js';
import { prepararCamara } from '../arte/resolucion.js';
import { panel, boton } from '../arte/ui.js';
import { entrada } from '../entrada/gestorEntrada.js';

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

    // --- Abajo al centro: botones táctiles (las mismas acciones que el teclado) ---
    const anchos = [50, 44, 36, 46, 44, 50, 50];
    let x = 281;
    const poner = (i, etiqueta, color, accion) => {
      const b = boton(this, x + anchos[i] / 2, 517, etiqueta, { ancho: anchos[i], alto: 28, tam: 10, color }, accion);
      x += anchos[i] + 4;
      return b;
    };
    this.botonPausa = poner(0, 'PAUSA', 0x2a3347, () => entrada.pausa());
    poner(1, 'INSP', 0x2a3347, () => entrada.inspector());
    this.botonVelocidad = poner(2, '×1', 0x2a3347, () => entrada.velocidad({ 1: 2, 2: 4, 4: 1 }[c.reloj.velocidad]));
    this.botonPiloto = poner(3, 'AUTO', 0x2a3347, () => entrada.piloto());
    this.botonMonitor = poner(4, 'MON', PALETA.mantenimiento, () => entrada.monitor());
    this.botonALinea = poner(5, '→LÍN', PALETA.relevo, () => entrada.solicitarDisparo('t_a_linea'));
    this.botonALavado = poner(6, '→LAV', PALETA.relevo, () => entrada.solicitarDisparo('t_a_lavado'));

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
    const total = c.turno.llegadas + TIEMPOS.margenFinal;
    this.textoReloj.setText(`${mmss(reloj.tiempo)} / ${mmss(total)}  ×${reloj.velocidad}${reloj.pausado ? '  PAUSA' : ''}`);
    this.textoRelevo.setText(`Cambio de turno del personal en ${Math.ceil(TIEMPOS.relevo - (reloj.tiempo % TIEMPOS.relevo))} s`);
    this.textoPuntaje.setText(String(c.puntaje));
    this.textoSalida.setText(`Salida ${c.stats.completados}/${c.turno.estudiantes} · servidos ${c.stats.servidos}`);
    this.botonPausa.fijarTexto(reloj.pausado ? 'SEGUIR' : 'PAUSA');
    this.botonVelocidad.fijarTexto(`×${reloj.velocidad}`);
    if (this.pilotoPintado !== c.piloto) { this.pilotoPintado = c.piloto; this.botonPiloto.fijarColor(c.piloto ? PALETA.operacion : 0x2a3347); }
    if (this.monitorPintado !== c.monitor) { this.monitorPintado = c.monitor; this.botonMonitor.fijarColor(c.monitor ? PALETA.mantenimiento : PALETA.fallo); }
    if (this.tokensSucios) this.pintarTokens();
    if (this.radarPintado !== c.radar) this.pintarRadar();
    if (this.textoFps.visible) {
      const fps = this.game.loop.actualFps;
      const ms = (fps > 0 ? 1000 / fps : this.game.loop.delta).toFixed(1);
      const fx = this.planta.efectosActivos !== false ? 'ON' : 'OFF';
      this.textoFps.setText(`fps ${fps.toFixed(0)} (${ms} ms/cuadro) · efectos ${fx} [F2] · t sim ${reloj.tiempo.toFixed(1)} s · estudiantes ${c.estudiantes.size} · eventos en cola ${reloj.cola.length}`);
    }
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
