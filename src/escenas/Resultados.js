// Pantalla de resultados del turno: producción, fallos reparados, intentos
// bloqueados, desbordes, deadlocks evitados, puntaje y logros.

import { ANCHO, TURNOS, LOGROS } from '../config.js';
import { PALETA, TEXTO, estilo, estiloMono } from '../arte/paleta.js';
import { panel, boton } from '../arte/ui.js';
import { sesion } from '../sesion.js';
import { sonido } from '../audio/sonido.js';

export class Resultados extends Phaser.Scene {
  constructor() {
    super('Resultados');
  }

  create(datos) {
    const r = datos.resumen;
    const s = r.stats;
    this.cameras.main.fadeIn(350, 29, 36, 51);

    const veredicto = r.interbloqueo ? ['GAME OVER POR INTERBLOQUEO', TEXTO.rojo]
      : r.victoria ? ['TURNO SUPERADO', TEXTO.verde] : ['META NO ALCANZADA', TEXTO.amarillo];
    this.add.text(ANCHO / 2, 30, `Turno ${r.turno} · ${r.nombre}`, estilo(16, TEXTO.tenue)).setOrigin(0.5);
    this.add.text(ANCHO / 2, 62, veredicto[0], estilo(30, veredicto[1], { fontStyle: 'bold' })).setOrigin(0.5);

    // --- Tabla de resultados ---
    panel(this, 60, 96, 480, 350);
    this.add.text(76, 106, 'RESULTADOS', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    const porcentaje = Math.round(r.fraccion * 100);
    const filas = [
      ['Producción (estudiantes en Salida)', `${r.completados} de ${r.total}  (${porcentaje} %, meta 75 %)`],
      ['Estudiantes servidos (disparos de t_servir)', String(s.servidos)],
      ['Fallos reparados (torniquetes)', `${s.reparaciones} de ${s.bloqueos}`],
      ['Intentos bloqueados por el supervisor', String(s.intentosBloqueados)],
      ['Desbordes de En_fila (llegadas sobre k = 16)', String(s.desbordes)],
      ['Deadlocks evitados (radar de amarillo a verde)', String(s.deadlocksEvitados)],
      ['Lotes lavados (disparos de t_lavar)', String(s.lavados)],
      ['Palabras de reparación inválidas', String(s.palabrasInvalidas)],
      ['Ayudas de la consola', String(s.ayudas)],
      ['Red usada', r.monitor ? 'con monitores (supervisada)' : 'de la ficha (sin monitores)'],
      ['Bono de riesgo (+20 % sin monitores)', `${r.bono} puntos`],
      ['Tiempo de simulación', `${Math.round(r.tiempo)} s`]
    ];
    filas.forEach(([nombre, valor], i) => {
      this.add.text(76, 130 + i * 22, nombre, estilo(11.5, TEXTO.claro));
      this.add.text(524, 130 + i * 22, valor, estiloMono(11.5, TEXTO.amarillo)).setOrigin(1, 0);
    });
    this.add.text(76, 408, 'PUNTAJE', estilo(13, TEXTO.tenue, { fontStyle: 'bold' }));
    const puntaje = this.add.text(524, 398, '0', estilo(30, TEXTO.claro, { fontStyle: 'bold' })).setOrigin(1, 0);
    this.tweens.addCounter({ from: 0, to: r.puntaje, duration: 900, onUpdate: (tw) => puntaje.setText(String(Math.round(tw.getValue()))) });

    // --- Logros ---
    panel(this, 560, 96, 340, 350);
    this.add.text(576, 106, `LOGROS  ${sesion.logros.size} de ${LOGROS.length}`, estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    LOGROS.forEach((logro, i) => {
      const ganado = sesion.logros.has(logro.id);
      const y = 130 + i * 52;
      const marca = this.add.graphics();
      marca.fillStyle(ganado ? PALETA.operacion : 0x2a3347, 1);
      marca.fillCircle(588, y + 12, 9);
      if (ganado) {
        marca.lineStyle(2.4, 0xffffff, 1);
        marca.lineBetween(583, y + 12, 587, y + 16);
        marca.lineBetween(587, y + 16, 594, y + 8);
      }
      this.add.text(606, y, logro.nombre, estilo(12, ganado ? TEXTO.verde : TEXTO.tenue, { fontStyle: 'bold' }));
      this.add.text(606, y + 17, logro.condicion, estilo(9.5, ganado ? TEXTO.claro : TEXTO.tenue, { wordWrap: { width: 280 } }));
    });

    // --- Qué sigue ---
    const ir = (clave) => {
      sonido.clic();
      this.cameras.main.fadeOut(280, 29, 36, 51);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(clave));
    };
    const hayMas = sesion.indiceTurno < TURNOS.length - 1;
    let x = 190;
    if (r.victoria && hayMas) {
      boton(this, x, 484, 'Siguiente turno', { ancho: 200, alto: 40, tam: 15, color: PALETA.operacion }, () => { sesion.indiceTurno += 1; ir('Planta'); });
      x += 220;
    }
    boton(this, x, 484, 'Repetir turno', { ancho: 200, alto: 40, tam: 15, color: PALETA.mantenimiento }, () => ir('Planta'));
    boton(this, x + 220, 484, 'Volver al título', { ancho: 200, alto: 40, tam: 15, color: 0x2a3347 }, () => ir('Titulo'));
  }
}
