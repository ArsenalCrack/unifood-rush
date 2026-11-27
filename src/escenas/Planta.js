// Escena de la planta: el comedor en vista isométrica 2.5D.
// REGLA: update solo avanza el reloj del núcleo y dibuja. La escena nunca
// cambia estados ni recursos: lee el modelo y le envía solicitudes.

import { MAPA, PASO_K_MS, UMBRAL_RIESGO, PASOS_RIESGO, COSTOS } from '../config.js';
import { Comedor } from '../simulacion/comedor.js';
import { PASO_K_S } from '../simulacion/flujo.js';
import { POLITICA_TURNO_CONTINUO } from '../simulacion/politica.js';
import { Registrador } from '../telemetria/registrador.js';
import { aPantalla, aCelda } from '../iso/proyeccion.js';
import * as F from '../arte/formas.js';
import { colorCalor } from '../arte/markov.js';
import { Escenario } from '../entidades/Escenario.js';
import { Multitud } from '../entidades/Multitud.js';
import { Personal } from '../entidades/Personal.js';
import { Torniquetes } from '../entidades/Torniquetes.js';
import { volar } from '../entidades/movimiento.js';
import { resaltar, crearBloom, crearParticulas } from '../arte/efectos.js';
import { PALETA, TEXTO, estilo } from '../arte/paleta.js';
import { FACTOR, DESFASE, RES_TEXTO_MUNDO, prepararCamara } from '../arte/resolucion.js';
import { boton } from '../arte/ui.js';
import { entrada } from '../entrada/gestorEntrada.js';
import { sonido } from '../audio/sonido.js';
import { sesion } from '../sesion.js';

const NOMBRE_TRANSICION = { t_a_linea: 'relevo a la línea', t_a_lavado: 'relevo al lavado', t_servir: 'servir', t_lavar: 'lavar' };

export class Planta extends Phaser.Scene {
  constructor() {
    super('Planta');
  }

  create() {
    prepararCamara(this);
    this.cameras.main.setBackgroundColor(PALETA.fondo);
    this.cameras.main.fadeIn(300, 29, 36, 51);
    entrada.reiniciar();

    // El modelo: motor de simulación con sus autómatas, su red de Petri y, en la
    // Fase 2, las cadenas de Markov. El paso k lo da el TimerEvent de esta escena.
    const turno = sesion.turno();
    this.comedor = new Comedor({
      turno, semilla: sesion.semilla, monitor: sesion.monitor,
      piloto: sesion.piloto, logros: [...sesion.logros],
      llegadas: turno.continuo ? 'markov' : sesion.llegadas, relojExterno: true,
      politica: turno.continuo ? POLITICA_TURNO_CONTINUO : null
    });
    // El registrador escucha al núcleo desde antes de empezar (docs/log.md).
    this.registrador = new Registrador(this.comedor);
    this.input.mouse?.disableContextMenu(); // el clic derecho abre el panel de Markov
    this.riesgoAvisado = false;
    this.alertas = [];          // últimas alertas para el HUD
    this.radarAvisado = 'verde'; // último color del radar que se anunció
    this.seleccion = null;      // id de la entidad con el HUD de máquina abierto
    this.quitarResalte = null;
    this.inspectorAbierto = false;
    this.pausaPrevia = false;

    // La vista: escenario, multitud, torniquetes y personal.
    this.escenario = new Escenario(this, this.comedor);
    this.multitud = new Multitud(this, this.comedor);
    this.torniquetes = new Torniquetes(this, this.comedor);
    this.personal = new Personal(this, this.comedor);
    // Clic: HUD de máquina. Clic derecho: panel de Markov (cadena Oleada).
    const alSeleccionar = (id, sprite, puntero) => (puntero?.rightButtonDown() ? entrada.markov('oleada') : entrada.seleccionar(id));
    this.multitud.alSeleccionar = alSeleccionar;
    this.torniquetes.alSeleccionar = alSeleccionar;

    this.crearZonas();
    this.particulas = crearParticulas(this, {
      lavado: aPantalla(MAPA.lavado.x, MAPA.lavado.y),
      torniquetes: MAPA.lineas.map((l) => aPantalla(l.torniquete.x, l.torniquete.y)),
      entrada: aPantalla(-1.5, 2)
    });
    this.bloom = crearBloom(this);
    this.conectarEntrada();
    this.conectarNucleo();
    this.configurarCamara();

    this.crearCapaCalor();

    this.scene.launch('HUDPartida');
    this.events.once('shutdown', () => {
      for (const clave of ['HUDPartida', 'HUDMaquina', 'Inspector', 'PanelMarkov']) this.scene.stop(clave);
    });
    this.comedor.iniciar();
    this.crearRelojDiscreto();
    this.sincronizarTiempo();
  }

  // Único avance del modelo: el reloj de simulación. Lo demás es dibujo.
  // Con Markov, el reloj espera en el borde del paso k hasta que el TimerEvent lo da.
  update(tiempo, delta) {
    this.comedor.avanzar(delta / 1000);
    this.escenario.actualizar();
    this.bloom.actualizar(delta);
    this.pintarFlechas();
    const lavando = this.comedor.lavados.length > 0 && !this.comedor.reloj.pausado;
    if (lavando !== this.particulas.vapor.emitting) {
      if (lavando) this.particulas.vapor.start(); else this.particulas.vapor.stop();
    }
    if (this.capaCalor.visible && tiempo - (this.calorPintado ?? 0) > 500) this.pintarCalor(tiempo);
  }

  // ---------- Fase 2: reloj discreto (Phaser.Time.TimerEvent) ----------

  // TimerEvent con delay = PASO_K_MS / velocidad y loop: true que llama a
  // comedor.pasoMarkov(). Se vuelve a crear al cambiar la velocidad o al restaurar,
  // conservando lo que ya avanzó el paso actual.
  crearRelojDiscreto() {
    const c = this.comedor;
    if (this.temporizador) { this.temporizador.remove(false); this.temporizador = null; }
    if (!c.modoMarkov || c.k >= c.pasosTurno) return;
    const velocidad = c.reloj.velocidad;
    const delay = PASO_K_MS / velocidad;
    const recorrido = ((c.reloj.tiempo - c.k * PASO_K_S) * 1000) / velocidad;
    this.temporizador = this.time.addEvent({
      delay,
      loop: true,
      startAt: Math.max(0, Math.min(recorrido, delay - 1)),
      paused: this.debePausarse(),
      callback: () => {
        c.pasoMarkov();
        if (c.k >= c.pasosTurno) this.crearRelojDiscreto();
      }
    });
  }

  debePausarse() {
    const c = this.comedor;
    return c.reloj.pausado || c.terminado || Boolean(c.gameOver);
  }

  // Las flechas de relevo están en naranja si su transición está habilitada.
  pintarFlechas() {
    const red = this.comedor.red;
    const firma = `${red.habilitada('t_a_lavado')}|${red.habilitada('t_a_linea')}`;
    if (firma === this.firmaFlechas) return;
    this.firmaFlechas = firma;
    this.flechaLavado.fijarColor(red.habilitada('t_a_lavado') ? PALETA.relevo : 0x4a4f5a);
    this.flechaLinea.fijarColor(red.habilitada('t_a_linea') ? PALETA.relevo : 0x4a4f5a);
  }

  // ---------- zonas y estaciones que se pueden pulsar ----------

  crearZonas() {
    const alPulsar = (objeto, accion) => {
      objeto.setInteractive({ useHandCursor: true });
      objeto.on('pointerdown', (puntero, lx, ly, evento) => { evento.stopPropagation(); accion(); });
    };
    // Mostradores: clic = solicitar servir al primero de esa fila (transición t_servir).
    for (const linea of MAPA.lineas) {
      const m = aPantalla(linea.mostrador.x, linea.mostrador.y);
      const zona = this.add.zone(m.x + 2, m.y - 20, 62, 56).setDepth(8000);
      alPulsar(zona, () => entrada.servirLinea(linea.id));
    }
    // Flechas de relevo junto al tablero: transiciones t_a_lavado y t_a_linea.
    const t = aPantalla(MAPA.relevo.x, MAPA.relevo.y);
    const opciones = { ancho: 70, alto: 20, tam: 9.5, color: PALETA.relevo, resolucion: RES_TEXTO_MUNDO };
    this.flechaLavado = boton(this, t.x - 38, t.y + 16, '← LAVADO', opciones, () => entrada.solicitarDisparo('t_a_lavado')).setDepth(8600);
    this.flechaLinea = boton(this, t.x + 38, t.y + 16, 'LÍNEA →', opciones, () => entrada.solicitarDisparo('t_a_linea')).setDepth(8600);
    // Estaciones: informan si su transición está habilitada o qué token falta (AND-join).
    alPulsar(this.escenario.lavado, () => this.informarTransicion('t_lavar', MAPA.lavado));
    alPulsar(this.escenario.carro, () => {
      const red = this.comedor.red;
      this.aviso(`Carro: Bandeja_sucia ${red.tokens('Bandeja_sucia')}/10 · Espacio_carro ${red.tokens('Espacio_carro')}`,
        MAPA.carro, red.tokens('Espacio_carro') === 0 ? TEXTO.rojo : TEXTO.claro);
    });
    alPulsar(this.escenario.tablero, () => {
      const conflictos = this.comedor.red.conflictos();
      const texto = conflictos.length === 0
        ? 'Sin conflicto: no hay dos transiciones habilitadas que compartan un lugar'
        : conflictos.map((c) => `Conflicto por ${c.lugar}: ${c.transiciones.join(' y ')}`).join('\n');
      this.aviso(texto, MAPA.relevo, conflictos.length ? TEXTO.naranja : TEXTO.claro, 2600);
    });
    const p = aPantalla(MAPA.pilaLimpias.x, MAPA.pilaLimpias.y);
    const pila = this.add.zone(p.x, p.y - 22, 96, 70).setDepth(-860);
    alPulsar(pila, () => this.informarTransicion('t_servir', MAPA.pilaLimpias));
  }

  informarTransicion(nombre, celda) {
    const faltantes = this.comedor.red.faltantes(nombre);
    if (faltantes.length === 0) this.aviso(`${nombre} habilitada: tiene todos sus tokens`, celda, TEXTO.verde);
    else this.aviso(`${nombre} espera: ${this.textoFaltantes(faltantes)}`, celda, TEXTO.rojo);
  }

  textoFaltantes(faltantes) {
    return faltantes.map((f) => `falta ${f.lugar} (${f.tiene}/${f.necesita})`).join(' + ');
  }

  // Texto flotante sobre una celda de la planta.
  aviso(texto, celda, color = TEXTO.claro, duracion = 1900) {
    const p = aPantalla(celda.x, celda.y);
    const t = this.add.text(p.x, p.y - 70, texto, estilo(11, color, {
      fontStyle: 'bold', backgroundColor: '#0f1524ee', padding: { x: 6, y: 4 }, align: 'center', resolution: RES_TEXTO_MUNDO
    })).setOrigin(0.5).setDepth(9500);
    // Se anima con el reloj del juego (no con los tweens de la simulación, que se pausan).
    this.time.addEvent({
      delay: 16, repeat: Math.round(duracion / 16),
      callback: () => { t.y -= 0.25; if (t.alpha > 0 && --t.vida < 0) t.alpha -= 0.05; }
    });
    t.vida = Math.round(duracion / 16) - 20;
    this.time.delayedCall(duracion + 60, () => t.destroy());
  }

  alertar(texto, nivel = 'info') {
    this.alertas.push({ texto, nivel, t: this.comedor.reloj.tiempo });
    if (this.alertas.length > 6) this.alertas.shift();
    this.events.emit('alerta');
  }

  // ---------- entrada: las mismas acciones para mouse, teclado y táctil ----------

  conectarEntrada() {
    const c = this.comedor;
    entrada.on('seleccionar', (id) => this.seleccionar(id));
    entrada.on('solicitarEvento', (id, evento, extra) => {
      sonido.activar();
      const resultado = c.solicitarEvento(id, evento, extra);
      if (extra.alResponder) extra.alResponder(resultado);
    });
    entrada.on('servirLinea', (idLinea) => { sonido.activar(); c.servirLinea(idLinea); });
    entrada.on('solicitarDisparo', (transicion) => { sonido.activar(); c.solicitarDisparo(transicion); });
    entrada.on('pausa', () => this.alternarPausa());
    entrada.on('velocidad', (v) => { c.reloj.cambiarVelocidad(v); this.crearRelojDiscreto(); this.sincronizarTiempo(); });
    // Fase 2
    entrada.on('markov', (cadena) => this.alternarPanelMarkov(cadena));
    entrada.on('calor', () => this.alternarCalor());
    entrada.on('fin', () => { if (c.turno.continuo && !c.terminado) c.finTurno(); });
    entrada.on('linea3', () => {
      sonido.activar();
      const r = c.alternarLinea3();
      if (r.ok) {
        sonido.disparo();
        this.alertar(r.abierta ? `Línea 3 abierta (−${COSTOS.linea3Apertura}, −${COSTOS.linea3Paso} por paso)` : 'Línea 3 cerrada: atiende a los que ya están en su fila', r.abierta ? 'aviso' : 'info');
      } else if (r.detalle) { sonido.error(); this.alertar(r.detalle, 'aviso'); }
    });
    entrada.on('comprarRelevo', () => {
      sonido.activar();
      const r = c.comprarRelevo();
      if (r.ok) { sonido.relevo(); this.alertar(`Permiso de relevo comprado (−${COSTOS.relevoExtra}): Relevo ${r.disponibles}/2`, 'aviso'); }
      else { sonido.error(); this.alertar(r.detalle ?? 'No se puede comprar ahora', 'fallo'); }
    });
    entrada.on('inspector', () => this.alternarInspector());
    entrada.on('cerrar', () => this.cerrarPaneles());
    entrada.on('piloto', () => {
      c.fijarPiloto(!c.piloto);
      this.alertar(c.piloto ? 'Piloto de servir encendido' : 'Piloto de servir apagado');
    });
    entrada.on('monitor', () => {
      const r = c.fijarMonitor(!c.monitor);
      if (r.ok) this.alertar(c.monitor ? 'Monitores activos: Minimo_lavado y Minimo_linea' : 'Monitores desactivados: red de la ficha', c.monitor ? 'info' : 'aviso');
      else { sonido.error(); this.alertar(`No se pueden activar los monitores. ${r.detalle}`, 'fallo'); }
    });
  }

  pedirAyuda(idLinea) {
    return this.comedor.pedirAyuda(idLinea);
  }

  // Los tweens de la planta y el TimerEvent del paso k siguen al reloj de simulación.
  sincronizarTiempo() {
    const reloj = this.comedor.reloj;
    this.tweens.timeScale = reloj.pausado ? 0 : reloj.velocidad;
    if (this.temporizador) this.temporizador.paused = this.debePausarse();
  }

  // Panel de Markov (tecla M, botón MARKOV o clic derecho): no pausa la simulación.
  alternarPanelMarkov(cadena = null) {
    if (this.scene.isActive('PanelMarkov')) {
      const panel = this.scene.get('PanelMarkov');
      if (cadena && panel.cadena !== cadena) { panel.elegirCadena(cadena); return; }
      this.scene.stop('PanelMarkov');
    } else {
      sonido.activar();
      sonido.clic();
      this.scene.launch('PanelMarkov', { cadena: cadena ?? 'oleada' });
    }
  }

  // ---------- Fase 2: mapa de calor de las esperas (tecla H) ----------

  crearCapaCalor() {
    this.capaCalor = this.add.graphics().setDepth(-998).setVisible(false);
    this.textosCalor = [];
  }

  alternarCalor() {
    this.capaCalor.setVisible(!this.capaCalor.visible);
    if (this.capaCalor.visible) this.pintarCalor(this.time.now);
    else { this.textosCalor.forEach((t) => t.destroy()); this.textosCalor = []; }
    this.alertar(this.capaCalor.visible ? 'Mapa de calor: espera acumulada por zona (H)' : 'Mapa de calor oculto');
  }

  // Colorea cada zona con la espera acumulada que calcula el registrador.
  pintarCalor(ahora) {
    this.calorPintado = ahora;
    const e = this.registrador.esperas();
    const zonas = [
      ...MAPA.lineas.map((l, i) => ({ nombre: `Fila ${l.id}`, valor: e.fila[i], celdas: Array.from({ length: 8 }, (_, k) => ({ x: MAPA.cabezaFila - k, y: l.y })), rotulo: { x: 2, y: l.y } })),
      ...MAPA.lineas.map((l, i) => ({ nombre: `Mostrador ${l.id}`, valor: e.mostrador[i], celdas: [{ x: 7, y: l.y }], rotulo: { x: 7, y: l.y } })),
      { nombre: 'Esperan mesa', valor: e.mesa, celdas: [0, 1].flatMap((dx) => [0, 1].map((dy) => ({ x: MAPA.espera.x + dx, y: MAPA.espera.y + dy }))), rotulo: { x: MAPA.espera.x + 0.5, y: MAPA.espera.y + 0.5 } },
      { nombre: 'Esperan carro', valor: e.carro, celdas: [{ x: MAPA.carro.x, y: MAPA.carro.y }, { x: MAPA.carro.x + 1, y: MAPA.carro.y }], rotulo: { x: MAPA.carro.x + 0.5, y: MAPA.carro.y } }
    ];
    const maximo = Math.max(1, ...zonas.map((z) => z.valor));
    const g = this.capaCalor;
    g.clear();
    this.textosCalor.forEach((t) => t.destroy());
    this.textosCalor = [];
    for (const zona of zonas) {
      if (zona.valor <= 0) continue;
      const color = colorCalor(zona.valor / maximo);
      for (const celda of zona.celdas) {
        const p = aPantalla(celda.x, celda.y);
        F.losa(g, p.x, p.y, color, 31, 15.5, 0.62);
      }
      const p = aPantalla(zona.rotulo.x, zona.rotulo.y);
      this.textosCalor.push(this.add.text(p.x, p.y + 10, `${zona.nombre}: ${Math.round(zona.valor)} s`, estilo(8.5, TEXTO.claro, {
        fontStyle: 'bold', backgroundColor: '#0f1524cc', padding: { x: 3, y: 1 }, resolution: RES_TEXTO_MUNDO
      })).setOrigin(0.5).setDepth(9100));
    }
  }

  alternarPausa() {
    if (this.comedor.gameOver || this.comedor.terminado || this.inspectorAbierto) return;
    this.comedor.reloj.alternarPausa();
    this.sincronizarTiempo();
  }

  // Inspector de la red: pausa la simulación mientras está abierto.
  alternarInspector() {
    if (this.comedor.terminado) return;
    if (this.inspectorAbierto) {
      this.scene.stop('Inspector');
      this.inspectorAbierto = false;
      if (!this.pausaPrevia && !this.comedor.gameOver) this.comedor.reloj.reanudar();
    } else {
      this.pausaPrevia = this.comedor.reloj.pausado;
      this.comedor.reloj.pausar();
      this.inspectorAbierto = true;
      this.scene.launch('Inspector');
    }
    this.sincronizarTiempo();
  }

  seleccionar(id) {
    const sprite = id.startsWith('T') ? this.torniquetes.sprite(Number(id.slice(1))) : this.multitud.sprite(id);
    if (!sprite) return;
    sonido.activar();
    sonido.clic();
    this.deseleccionar();
    this.seleccion = id;
    this.quitarResalte = resaltar(sprite, 0xffffff, 4); // glow en la máquina seleccionada
    this.scene.stop('HUDMaquina');
    this.scene.launch('HUDMaquina', { id });
  }

  deseleccionar() {
    if (this.quitarResalte) this.quitarResalte();
    this.quitarResalte = null;
    this.seleccion = null;
  }

  cerrarPaneles() {
    if (this.scene.isActive('PanelMarkov')) { this.scene.stop('PanelMarkov'); return; }
    if (this.inspectorAbierto) { this.alternarInspector(); return; }
    this.scene.stop('HUDMaquina');
    this.deseleccionar();
  }

  // ---------- el núcleo avisa: sonidos, efectos y alertas ----------

  conectarNucleo() {
    const c = this.comedor;
    const camara = this.cameras.main;
    c.on('estudiante', (e) => {
      if (e.evento === 'servir') {
        sonido.servir();
        const m = aPantalla(MAPA.lineas[e.linea - 1].mostrador.x, MAPA.lineas[e.linea - 1].mostrador.y);
        this.particulas.estallar(m.x, m.y - 26, PALETA.bandejaLimpia, 6);
      }
      if (e.evento === 'entregar' && e.id === this.seleccion) this.cerrarPaneles();
    });
    c.on('torniquete', (e) => {
      const chispas = this.particulas.chispas[e.linea - 1];
      if (e.evento === 'acceso_ok') sonido.acceso();
      if (e.evento === 'rechazo') sonido.rechazo();
      if (e.evento === 'bloqueo') {
        sonido.bloqueoTorniquete();
        chispas.start();
        camara.shake(220, 0.006);
        this.bloom.pulso(0.5, 700);
        this.alertar(`Torniquete ${e.linea} BLOQUEADO tras 3 rechazos: repáralo`, 'fallo');
      }
      if (e.evento === 'reiniciar') chispas.stop();
    });
    c.on('bloqueado', (e) => {
      sonido.intentoBloqueado();
      camara.shake(160, 0.007);
      this.aviso('Supervisor: servir deshabilitado\n¬(servir ∧ Registro = Sin_acceso)', MAPA.lineas[e.linea - 1].mostrador, TEXTO.rojo);
      this.alertar(`Intento bloqueado en la línea ${e.linea}: sin acceso_ok (−5)`, 'fallo');
    });
    c.on('falta', (e) => {
      sonido.error();
      const celda = e.transicion === 't_servir' ? MAPA.pilaLimpias : MAPA.relevo;
      this.aviso(`${e.transicion} no se dispara:\n${this.textoFaltantes(e.faltantes)}`, celda, TEXTO.rojo, 2400);
      this.alertar(`${NOMBRE_TRANSICION[e.transicion]}: ${this.textoFaltantes(e.faltantes)}`, 'aviso');
    });
    c.on('personal', (e) => {
      sonido.disparo();
      this.alertar(`Disparo ${e.transicion}: personal ${c.red.tokens('Personal_linea')} en línea y ${c.red.tokens('Personal_lavado')} en lavado`);
    });
    c.on('lavado', (e) => {
      if (e.fase !== 'fin') return;
      sonido.lavado();
      // Los 5 tokens van del carro a la estación de lavado y de ahí a la pila limpia.
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 70, () => volar(this, 'bandeja_sucia', MAPA.carro, MAPA.lavado, 380,
          () => volar(this, 'bandeja_limpia', MAPA.lavado, MAPA.pilaLimpias, 620)));
      }
      const l = aPantalla(MAPA.lavado.x, MAPA.lavado.y);
      this.particulas.estallar(l.x, l.y - 24, PALETA.mantenimiento, 10);
    });
    c.on('relevo', (e) => {
      sonido.relevo();
      const t = aPantalla(MAPA.relevo.x, MAPA.relevo.y);
      this.particulas.estallar(t.x, t.y - 30, PALETA.relevo, 10);
      this.alertar(`Cambio de turno: ${e.disponibles} permisos de relevo`, 'aviso');
    });
    c.on('desborde', (e) => {
      sonido.desborde();
      this.particulas.desborde.explode(8);
      this.bloom.pulso(0.3, 450);
      this.alertar(`Desborde de En_fila: ${e.exceso} sobre k = 16 (−3)`, 'fallo');
    });
    c.on('reparacion', (e) => {
      if (e.ok) { sonido.reparado(); this.alertar(`Torniquete ${e.linea} reparado con ${e.palabra} (+15)`, 'ok'); }
      else { sonido.error(); this.alertar(`${e.palabra || '(vacía)'} no pertenece a L (−10)`, 'fallo'); }
    });
    c.on('logro', (e) => {
      sesion.guardarLogro(e.id);
      sonido.logro();
      camara.flash(260, 255, 255, 255);
    });
    c.on('radar', (r) => {
      // Avisa solo cuando el radar cambia de color, no en cada marcado.
      if (r.estado === this.radarAvisado) return;
      this.radarAvisado = r.estado;
      if (r.estado === 'amarillo') {
        sonido.alarma();
        this.alertar(`Radar en AMARILLO: interbloqueo a ${r.bloqueos[0].distancia} disparo(s)`, 'aviso');
      } else if (r.estado === 'verde') {
        this.alertar('Radar en verde: sin interbloqueo a 3 disparos', 'ok');
      }
    });
    c.on('game_over', () => {
      sonido.interbloqueo();
      camara.shake(600, 0.012);
      this.bloom.pulso(0.9, 1400);
      this.alertar('INTERBLOQUEO: ninguna transición habilitada', 'fallo');
      this.sincronizarTiempo();
    });
    // Fase 2: cada paso k de la cadena Oleada.
    c.on('markov', (e) => {
      const { de, a } = e.oleada;
      if (a !== de) {
        if (a === 'Alta') {
          sonido.oleadaAlta();
          camara.shake(240, 0.004);   // estado crítico de la cadena: temblor leve
          this.bloom.pulso(0.45, 650);
          this.particulas.estallar(aPantalla(-0.5, 3).x, aPantalla(-0.5, 3).y - 20, PALETA.fallo, 14);
        }
        this.alertar(`Paso k = ${e.k}: oleada ${de} → ${a} (${this.comedor.llegadasDelPaso} llegan)`, a === 'Alta' ? 'fallo' : a === 'Media' ? 'aviso' : 'info');
      }
      if (e.mesas.a === '75-100%' && e.mesas.de !== '75-100%') sonido.mesasLlenas();
      // Aviso amarillo del GDD: P(Alta en <= 3 pasos) supera el umbral.
      const riesgo = e.riesgo >= UMBRAL_RIESGO && a !== 'Alta';
      if (riesgo && !this.riesgoAvisado) {
        sonido.riesgo();
        this.alertar(`Riesgo ${Math.round(e.riesgo * 100)} %: oleada Alta en ≤ ${PASOS_RIESGO} pasos`, 'aviso');
      }
      this.riesgoAvisado = riesgo;
    });
    c.on('restaurado', () => {
      this.crearRelojDiscreto();
      this.cerrarPaneles();
      this.multitud.reconstruir();
      this.particulas.chispas.forEach((chispas, i) => {
        if (c.lineas[i].torniquete.puede('reiniciar')) chispas.start(); else chispas.stop();
      });
      this.alertas.length = 0;
      this.radarAvisado = c.radar.estado;
      this.alertar('Partida restaurada al último marcado verde', 'ok');
      this.sincronizarTiempo();
    });
    c.on('fin_turno', (resumen) => {
      sonido.finTurno();
      this.sincronizarTiempo();
      // Datos del registro para Resultados: casos cerrados y tiempo medio de ciclo.
      resumen.log = { ...this.registrador.resumen(), tiempoCiclo: this.registrador.tiempoCicloMedio() };
      sesion.resultados.push(resumen);
      sesion.ultimoRegistro = this.registrador;
      this.time.delayedCall(resumen.interbloqueo ? 200 : 1300, () => this.irAResultados(resumen));
    });
  }

  // Transición tipo barrido (wipe) hacia Resultados: la cortina la dibuja el HUD,
  // cuya cámara no se mueve ni se acerca.
  irAResultados(resumen) {
    if (this.saliendo) return;
    this.saliendo = true;
    const ir = () => this.scene.start('Resultados', { resumen });
    const hud = this.scene.get('HUDPartida');
    if (hud?.barrido && this.scene.isActive('HUDPartida')) hud.barrido(ir);
    else ir();
  }

  // Tras un interbloqueo: volver al último marcado verde o cerrar el turno.
  reintentar() {
    this.comedor.reintentar();
  }

  // Vuelve al último marcado verde y activa la regla de prevención. Si en ese
  // marcado algún puesto está vacío (los monitores no caben), vuelve al inicio del turno.
  reintentarConMonitores() {
    const c = this.comedor;
    c.reintentar();
    if (!c.monitor && !c.fijarMonitor(true).ok) {
      c.reintentar(true);
      c.fijarMonitor(true);
    }
    this.alertar('Monitores activos: Minimo_lavado y Minimo_linea', 'ok');
  }

  abandonar() {
    this.comedor.finTurno();
  }

  // ---------- cámara: arrastre, rueda y pellizco ----------
  // La cámara ya está ampliada FACTOR veces (src/arte/resolucion.js). El jugador
  // acerca entre 0,75 y 2,4 veces y arrastra hasta 360 y 240 unidades del mundo;
  // DESFASE convierte ese desplazamiento al de la cámara ampliada.

  configurarCamara() {
    const camara = this.cameras.main;
    const limitar = (v, min, max) => Phaser.Math.Clamp(v, min, max);
    const acercar = (factor) => camara.setZoom(limitar(camara.zoom * factor, 0.75 * FACTOR, 2.4 * FACTOR));
    this.input.addPointer(1); // segundo dedo para el pellizco
    this.input.on('pointerdown', (puntero, objetos) => {
      // Clic derecho en el piso: panel de Markov de las mesas (zona de mesas) o de la oleada.
      if (puntero.rightButtonDown()) {
        this.arrastre = null;
        if (objetos.length === 0) {
          const p = camara.getWorldPoint(puntero.x, puntero.y);
          entrada.markov(aCelda(p.x, p.y).x >= 9.5 ? 'mesas' : 'oleada');
        }
        return;
      }
      this.arrastre = objetos.length === 0
        ? { x: puntero.x, y: puntero.y, sx: camara.scrollX - DESFASE.x, sy: camara.scrollY - DESFASE.y }
        : null;
      this.pellizco = null;
    });
    this.input.on('pointermove', (puntero) => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (this.pellizco) acercar(d / this.pellizco);
        this.pellizco = d;
        this.arrastre = null;
      } else if (puntero.isDown && this.arrastre) {
        camara.scrollX = DESFASE.x + limitar(this.arrastre.sx - (puntero.x - this.arrastre.x) / camara.zoom, -360, 360);
        camara.scrollY = DESFASE.y + limitar(this.arrastre.sy - (puntero.y - this.arrastre.y) / camara.zoom, -240, 240);
      }
    });
    this.input.on('pointerup', () => { this.arrastre = null; this.pellizco = null; });
    this.input.on('wheel', (puntero, objetos, dx, dy) => acercar(dy > 0 ? 0.9 : 1.1));
  }
}
