// Pantalla de título: controles, leyenda de estados y opciones del turno.
// Fase 2: modo de llegadas (cadena de Markov u ola fija de la Fase 1), turno 4
// continuo y «Generar log» (simulación acelerada, guía 5.7.6).

import { TURNOS, TURNO_CONTINUO, LOGROS } from '../config.js';
import { PALETA, TEXTO, ESTADOS, estilo } from '../arte/paleta.js';
import { prepararCamara } from '../arte/resolucion.js';
import { panel, boton } from '../arte/ui.js';
import { poner } from '../arte/texturas.js';
import { sesion } from '../sesion.js';
import { sonido } from '../audio/sonido.js';

const CONTROLES = [
  ['Clic en un mostrador · Q / W', 'servir al primero de la fila 1 / 2 (la 3, con clic)'],
  ['Clic en torniquete o estudiante', 'abre su autómata en vivo (HUD)'],
  ['R · clic en «Tokens por lugar»', 'abre la red de Petri en vivo'],
  ['Flechas del tablero · → / ← (o V)', 'relevo a la línea / al lavado'],
  ['P · I · 1 2 4 8', 'pausa · inspector de la red · velocidad'],
  ['A · N · F1', 'piloto de servir · monitores · fps'],
  ['M · clic derecho', 'panel de Markov: P, π^(n), largo plazo, χ²'],
  ['L · E · 3 · H', 'últimos eventos · exportar log · línea 3 · calor'],
  ['Arrastre y rueda · Esc', 'mover y acercar la cámara · cerrar panel']
];

export class Titulo extends Phaser.Scene {
  constructor() {
    super('Titulo');
  }

  create() {
    prepararCamara(this);
    this.cameras.main.fadeIn(350, 29, 36, 51);
    this.saliendo = false;
    this.add.text(40, 26, 'UniFood Rush', estilo(40, TEXTO.claro, { fontStyle: 'bold' }));
    this.add.text(42, 76, 'Comedor universitario · autómatas, redes de Petri y cadenas de Markov · proyecto 13', estilo(13, TEXTO.tenue));
    boton(this, 832, 48, 'GENERAR LOG ▸', { ancho: 184, alto: 34, tam: 12, color: PALETA.mantenimiento }, () => this.ir('GenerarLog'));
    this.add.text(832, 70, 'simulación acelerada · CSV y XES', estilo(9.5, TEXTO.tenue)).setOrigin(0.5, 0);

    // --- Controles ---
    panel(this, 36, 104, 500, 186);
    this.add.text(50, 111, 'CONTROLES', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    CONTROLES.forEach(([accion, efecto], i) => {
      this.add.text(50, 129 + i * 17.4, accion, estilo(11.5, TEXTO.claro, { fontStyle: 'bold' }));
      this.add.text(282, 129 + i * 17.4, efecto, estilo(11.5, TEXTO.tenue));
    });

    // --- Leyenda: un color e ícono por estado de cada autómata ---
    panel(this, 36, 300, 500, 216);
    this.add.text(50, 307, 'ESTADOS DEL ESTUDIANTE', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    Object.keys(ESTADOS.Estudiante).forEach((estado, i) => {
      poner(this, `est_${estado}`, 80 + i * 82, 378);
      this.add.text(80 + i * 82, 384, estado.replace('_', '\n'), estilo(9, TEXTO.claro, { align: 'center' })).setOrigin(0.5, 0);
    });
    this.add.text(50, 414, 'ESTADOS DEL TORNIQUETE', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    Object.keys(ESTADOS.Torniquete).forEach((estado, i) => {
      poner(this, `tor_${estado}`, 96 + i * 94, 494);
      this.add.text(96 + i * 94, 498, estado, estilo(9, TEXTO.claro)).setOrigin(0.5, 0);
    });

    // --- Opciones del turno ---
    panel(this, 556, 104, 368, 412);
    this.add.text(572, 111, 'TURNO', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.botonesTurno = [...TURNOS, TURNO_CONTINUO].map((turno, i) => boton(this, 740, 143 + i * 33, '', { ancho: 336, alto: 29, tam: 11.5 }, () => {
      if (turno.continuo && sesion.llegadas !== 'markov') return; // el turno 4 es de la Fase 2
      sesion.indiceTurno = i;
      sonido.clic();
      this.refrescar();
    }));

    this.add.text(572, 268, 'LLEGADAS', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.botonLlegadas = boton(this, 740, 297, '', { ancho: 336, alto: 28, tam: 11.5 }, () => {
      sesion.llegadas = sesion.llegadas === 'markov' ? 'fase1' : 'markov';
      if (sesion.llegadas !== 'markov' && sesion.indiceTurno === 3) sesion.indiceTurno = 2;
      sonido.clic();
      this.refrescar();
    });

    this.add.text(572, 320, 'REGLA DE PREVENCIÓN', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.botonMonitor = boton(this, 740, 349, '', { ancho: 336, alto: 28, tam: 11.5 }, () => {
      sesion.monitor = !sesion.monitor;
      sonido.clic();
      this.refrescar();
    });
    this.textoMonitor = this.add.text(572, 366, '', estilo(9.5, TEXTO.tenue, { wordWrap: { width: 336 } }));

    this.botonPiloto = boton(this, 740, 411, '', { ancho: 336, alto: 26, tam: 11.5 }, () => {
      sesion.piloto = !sesion.piloto;
      sonido.clic();
      this.refrescar();
    });

    boton(this, 740, 452, 'INICIAR TURNO', { ancho: 336, alto: 40, tam: 17, color: PALETA.operacion }, () => this.iniciar());
    this.textoLogros = this.add.text(690, 497, '', estilo(11, TEXTO.tenue)).setOrigin(0.5);
    // Permite volver a ganar los logros (y ver sus avisos) en una demostración.
    boton(this, 850, 497, 'Reiniciar logros', { ancho: 116, alto: 20, tam: 9.5, color: 0x2a3347 }, () => {
      sesion.borrarLogros();
      sonido.clic();
      this.refrescar();
    });

    this.input.keyboard.on('keydown-ENTER', () => this.iniciar());
    this.refrescar();
  }

  refrescar() {
    const markov = sesion.llegadas === 'markov';
    [...TURNOS, TURNO_CONTINUO].forEach((turno, i) => {
      const elegido = i === sesion.indiceTurno;
      const texto = turno.continuo
        ? `4 · ${turno.nombre}: Markov sin fin, piloto que repara`
        : markov
          ? `${turno.id} · ${turno.nombre}: ${turno.pasos} pasos k (unos ${turno.estudiantes} estudiantes)`
          : `${turno.id} · ${turno.nombre}: ${turno.estudiantes} estudiantes en ${turno.llegadas} s`;
      this.botonesTurno[i].fijarTexto(texto).fijarColor(elegido ? PALETA.mantenimiento : 0x2a3347).activar(markov || !turno.continuo);
    });
    this.botonLlegadas
      .fijarTexto(markov ? 'Cadena de Markov Oleada (Fase 2)' : 'Ola fija de la Fase 1 (sin cadenas)')
      .fijarColor(markov ? PALETA.mantenimiento : 0x2a3347);
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

  ir(clave) {
    if (this.saliendo) return;
    this.saliendo = true;
    sonido.activar();
    sonido.clic();
    this.cameras.main.fadeOut(300, 29, 36, 51);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(clave));
  }

  iniciar() {
    if (this.saliendo) return;
    sonido.activar();
    sonido.logro();
    this.ir('Planta');
  }
}
