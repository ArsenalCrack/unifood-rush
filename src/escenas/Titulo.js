// Pantalla de título: controles, leyenda de estados y opciones del turno.

import { ANCHO, ALTO, TURNOS, LOGROS } from '../config.js';
import { PALETA, TEXTO, ESTADOS, estilo } from '../arte/paleta.js';
import { prepararCamara } from '../arte/resolucion.js';
import { panel, boton } from '../arte/ui.js';
import { poner } from '../arte/texturas.js';
import { sesion } from '../sesion.js';
import { sonido } from '../audio/sonido.js';

const CONTROLES = [
  ['Clic en un mostrador · Q / W', 'servir al primero de la fila 1 / 2'],
  ['Clic en torniquete o estudiante', 'abre su autómata en vivo (HUD)'],
  ['Flechas del tablero · L / V', 'relevo a la línea / al lavado'],
  ['P · I · 1 2 4', 'pausa · inspector de la red · velocidad'],
  ['A · M · F1', 'piloto de servir · monitores · fps'],
  ['Arrastre y rueda · Esc', 'mover y acercar la cámara · cerrar panel']
];

export class Titulo extends Phaser.Scene {
  constructor() {
    super('Titulo');
  }

  create() {
    prepararCamara(this);
    this.cameras.main.fadeIn(350, 29, 36, 51);
    this.add.text(40, 26, 'UniFood Rush', estilo(40, TEXTO.claro, { fontStyle: 'bold' }));
    this.add.text(42, 76, 'Comedor universitario · autómatas y redes de Petri en vivo · proyecto 13', estilo(13, TEXTO.tenue));

    // --- Controles ---
    panel(this, 36, 108, 500, 172);
    this.add.text(50, 116, 'CONTROLES', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    CONTROLES.forEach(([accion, efecto], i) => {
      this.add.text(50, 136 + i * 23, accion, estilo(12, TEXTO.claro, { fontStyle: 'bold' }));
      this.add.text(270, 136 + i * 23, efecto, estilo(12, TEXTO.tenue));
    });

    // --- Leyenda: un color e ícono por estado de cada autómata ---
    panel(this, 36, 290, 500, 226);
    this.add.text(50, 298, 'ESTADOS DEL ESTUDIANTE', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    Object.keys(ESTADOS.Estudiante).forEach((estado, i) => {
      poner(this, `est_${estado}`, 80 + i * 82, 372);
      this.add.text(80 + i * 82, 378, estado.replace('_', '\n'), estilo(9, TEXTO.claro, { align: 'center' })).setOrigin(0.5, 0);
    });
    this.add.text(50, 410, 'ESTADOS DEL TORNIQUETE', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    Object.keys(ESTADOS.Torniquete).forEach((estado, i) => {
      poner(this, `tor_${estado}`, 96 + i * 94, 492);
      this.add.text(96 + i * 94, 496, estado, estilo(9, TEXTO.claro)).setOrigin(0.5, 0);
    });

    // --- Opciones del turno ---
    panel(this, 556, 108, 368, 408);
    this.add.text(572, 116, 'TURNO', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.botonesTurno = TURNOS.map((turno, i) => boton(this, 740, 152 + i * 44, '', { ancho: 336, alto: 36, tam: 12 }, () => {
      sesion.indiceTurno = i;
      sonido.clic();
      this.refrescar();
    }));

    this.add.text(572, 280, 'REGLA DE PREVENCIÓN', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.botonMonitor = boton(this, 740, 314, '', { ancho: 336, alto: 34, tam: 12 }, () => {
      sesion.monitor = !sesion.monitor;
      sonido.clic();
      this.refrescar();
    });
    this.textoMonitor = this.add.text(572, 336, '', estilo(10, TEXTO.tenue, { wordWrap: { width: 336 } }));

    this.botonPiloto = boton(this, 740, 392, '', { ancho: 336, alto: 30, tam: 12 }, () => {
      sesion.piloto = !sesion.piloto;
      sonido.clic();
      this.refrescar();
    });

    boton(this, 740, 446, 'INICIAR TURNO', { ancho: 336, alto: 48, tam: 18, color: PALETA.operacion }, () => this.iniciar());
    this.textoLogros = this.add.text(690, 494, '', estilo(11, TEXTO.tenue)).setOrigin(0.5);
    // Permite volver a ganar los logros (y ver sus avisos) en una demostración.
    boton(this, 850, 494, 'Reiniciar logros', { ancho: 116, alto: 20, tam: 9.5, color: 0x2a3347 }, () => {
      sesion.borrarLogros();
      sonido.clic();
      this.refrescar();
    });

    this.input.keyboard.on('keydown-ENTER', () => this.iniciar());
    this.refrescar();
  }

  refrescar() {
    TURNOS.forEach((turno, i) => {
      const elegido = i === sesion.indiceTurno;
      this.botonesTurno[i]
        .fijarTexto(`${turno.id} · ${turno.nombre}: ${turno.estudiantes} estudiantes en ${turno.llegadas} s`)
        .fijarColor(elegido ? PALETA.mantenimiento : 0x2a3347);
    });
    this.botonMonitor
      .fijarTexto(sesion.monitor ? 'Monitores ACTIVOS (red supervisada)' : 'Monitores DESACTIVADOS (red de la ficha)')
      .fijarColor(sesion.monitor ? PALETA.mantenimiento : PALETA.fallo);
    this.textoMonitor.setText(sesion.monitor
      ? 'Minimo_lavado y Minimo_linea impiden dejar un puesto sin personal: no hay interbloqueo.'
      : 'Puedes pasar todo el personal a un puesto y provocar el interbloqueo. +20 % de puntaje si terminas sin bloqueo.');
    this.botonPiloto
      .fijarTexto(sesion.piloto ? 'Piloto de servir: ENCENDIDO' : 'Piloto de servir: APAGADO (tú sirves)')
      .fijarColor(sesion.piloto ? PALETA.operacion : 0x2a3347);
    this.textoLogros.setText(`Logros: ${sesion.logros.size} de ${LOGROS.length}`);
  }

  iniciar() {
    if (this.saliendo) return;
    this.saliendo = true;
    sonido.activar();
    sonido.logro();
    this.cameras.main.fadeOut(300, 29, 36, 51);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Planta'));
  }
}
