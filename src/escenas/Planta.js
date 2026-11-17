// Escena de la planta: el comedor en vista isométrica 2.5D.
// REGLA: update solo avanza el reloj del núcleo y dibuja. La escena nunca
// cambia estados ni recursos: lee el modelo y le envía solicitudes.

import { MAPA } from '../config.js';
import { Comedor } from '../simulacion/comedor.js';
import { aPantalla } from '../iso/proyeccion.js';
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

    // El modelo: motor de simulación con sus autómatas y su red de Petri.
    this.comedor = new Comedor({
      turno: sesion.turno(), semilla: sesion.semilla, monitor: sesion.monitor,
      piloto: sesion.piloto, logros: [...sesion.logros]
    });
    this.alertas = [];          // últimas alertas para el HUD
    this.radarAvisado = 'verde'; // último color del radar que se anunció
    this.seleccion = null;      // id de la entidad con el HUD de máquina abierto
    this.quitarResalte = null;
    this.inspectorAbierto = false;
    this.pausaPrevia = false;
    this.efectosActivos = true;

    // La vista: escenario, multitud, torniquetes y personal.
    this.escenario = new Escenario(this, this.comedor);
    this.multitud = new Multitud(this, this.comedor);
    this.torniquetes = new Torniquetes(this, this.comedor);
    this.personal = new Personal(this, this.comedor);
    this.multitud.alSeleccionar = (id) => entrada.seleccionar(id);
    this.torniquetes.alSeleccionar = (id) => entrada.seleccionar(id);

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

    this.scene.launch('HUDPartida');
    this.events.once('shutdown', () => {
      for (const clave of ['HUDPartida', 'HUDMaquina', 'Inspector']) this.scene.stop(clave);
    });
    this.comedor.iniciar();
    this.sincronizarTiempo();
  }

  // Único avance del modelo: el reloj de simulación. Lo demás es dibujo.
  update(tiempo, delta) {
    this.comedor.avanzar(delta / 1000);
    this.escenario.actualizar();
    this.bloom.actualizar(delta);
    this.pintarFlechas();
    const lavando = this.comedor.lavados.length > 0 && !this.comedor.reloj.pausado;
    if (lavando !== this.particulas.vapor.emitting) {
      if (lavando) this.particulas.vapor.start(); else this.particulas.vapor.stop();
    }
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
    entrada.on('velocidad', (v) => { c.reloj.cambiarVelocidad(v); this.sincronizarTiempo(); });
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
    entrada.on('efectos', () => {
      this.efectosActivos = !this.efectosActivos;
      this.particulas.fijarActivo(this.efectosActivos);
      this.bloom.fijarActivo(this.efectosActivos);
      this.alertar(this.efectosActivos ? 'Efectos visuales activados (F2)' : 'Efectos visuales desactivados (F2)');
    });
  }

  pedirAyuda(idLinea) {
    return this.comedor.pedirAyuda(idLinea);
  }

  // Los tweens de la planta siguen la velocidad del reloj de simulación.
  sincronizarTiempo() {
    const reloj = this.comedor.reloj;
    this.tweens.timeScale = reloj.pausado ? 0 : reloj.velocidad;
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
    c.on('restaurado', () => {
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
      sesion.resultados.push(resumen);
      this.time.delayedCall(resumen.interbloqueo ? 200 : 1300, () => {
        camara.fadeOut(350, 29, 36, 51);
        camara.once('camerafadeoutcomplete', () => this.scene.start('Resultados', { resumen }));
      });
    });
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
