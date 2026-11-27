// Pantalla de resultados del turno: producción, fallos reparados, intentos
// bloqueados, desbordes, deadlocks evitados, puntaje y logros. Fase 2: casos
// cerrados, tiempo medio de ciclo, frecuencias de la oleada frente a pi, prueba
// chi-cuadrado y exportación del Event Log (GDD 16.12).

import { ANCHO, TURNOS, LOGROS, PROYECTO_LOG, FECHA_BASE_LOG, META_LOGRO_REGISTRO } from '../config.js';
import { PALETA, TEXTO, estilo, estiloMono } from '../arte/paleta.js';
import { prepararCamara } from '../arte/resolucion.js';
import { panel, boton } from '../arte/ui.js';
import { barras, leyenda, botonExportar, numero, PANEL } from '../arte/markov.js';
import { aCSV } from '../telemetria/exportarCSV.js';
import { aXES } from '../telemetria/exportarXES.js';
import { descargar, nombreArchivo, TIPOS } from '../telemetria/descarga.js';
import { sesion } from '../sesion.js';
import { sonido } from '../audio/sonido.js';

export class Resultados extends Phaser.Scene {
  constructor() {
    super('Resultados');
  }

  create(datos) {
    const r = datos.resumen;
    const s = r.stats;
    prepararCamara(this);
    this.cameras.main.fadeIn(350, 29, 36, 51);

    const veredicto = r.interbloqueo ? ['GAME OVER POR INTERBLOQUEO', TEXTO.rojo]
      : r.victoria ? ['TURNO SUPERADO', TEXTO.verde] : ['META NO ALCANZADA', TEXTO.amarillo];
    this.add.text(ANCHO / 2, 24, `Turno ${r.turno} · ${r.nombre}${r.modoMarkov ? ' · llegadas por Markov' : ' · ola fija (Fase 1)'}`, estilo(14, TEXTO.tenue)).setOrigin(0.5);
    this.add.text(ANCHO / 2, 54, veredicto[0], estilo(28, veredicto[1], { fontStyle: 'bold' })).setOrigin(0.5);

    // --- Tabla de resultados (Fase 1 y Fase 2) ---
    panel(this, 36, 84, 446, 384);
    this.add.text(52, 92, 'RESULTADOS', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    const porcentaje = Math.round(r.fraccion * 100);
    const log = r.log ?? { cerrados: 0, abiertos: 0, eventos: 0, tiempoCiclo: null };
    const f2 = r.fase2 ?? {};
    const filas = [
      ['Producción (estudiantes en Salida)', `${r.completados} de ${r.total}  (${porcentaje} %, meta 75 %)`],
      ['Estudiantes servidos (disparos de t_servir)', String(s.servidos)],
      ['Fallos reparados (torniquetes)', `${s.reparaciones} de ${s.bloqueos}`],
      ['Intentos bloqueados por el supervisor', String(s.intentosBloqueados)],
      ['Desbordes de En_fila (llegadas sobre k = 16)', String(s.desbordes)],
      ['Deadlocks evitados (radar de amarillo a verde)', String(s.deadlocksEvitados)],
      ['Lotes lavados (disparos de t_lavar)', String(s.lavados)],
      ['Palabras inválidas · ayudas de la consola', `${s.palabrasInvalidas} · ${s.ayudas}`],
      ['Red usada', r.monitor ? 'con monitores (supervisada)' : 'de la ficha (sin monitores)'],
      ['Bono de riesgo (+20 % sin monitores)', `${r.bono} puntos`],
      ['Tiempo de simulación', `${Math.round(r.tiempo)} s`],
      ['Casos cerrados en el log · eventos', `${log.cerrados} · ${log.eventos}`],
      ['Tiempo medio de ciclo (llegada a Salida)', log.tiempoCiclo == null ? '–' : `${numero(log.tiempoCiclo, 1)} s`],
      ['Pasos k · con la línea 3 abierta', r.modoMarkov ? `${f2.k} · ${f2.pasosLinea3}` : '–'],
      ['Pronósticos acertados · Alta sin desborde', r.modoMarkov ? `${f2.pronosticos} · ${f2.altasSinDesborde} de ${f2.pasosAlta}` : '–']
    ];
    filas.forEach(([nombre, valor], i) => {
      const fase2 = i >= 11;
      this.add.text(52, 112 + i * 19, nombre, estilo(10.5, fase2 ? TEXTO.azul : TEXTO.claro));
      this.add.text(466, 112 + i * 19, valor, estiloMono(10.5, TEXTO.amarillo)).setOrigin(1, 0);
    });
    this.add.text(52, 418, 'PUNTAJE', estilo(13, TEXTO.tenue, { fontStyle: 'bold' }));
    const puntaje = this.add.text(466, 408, '0', estilo(30, TEXTO.claro, { fontStyle: 'bold' })).setOrigin(1, 0);
    this.tweens.addCounter({ from: 0, to: r.puntaje, duration: 900, onUpdate: (tw) => puntaje.setText(String(Math.round(tw.getValue()))) });

    // --- Fase 2: oleada frente a pi y exportación ---
    panel(this, 494, 84, 430, 206);
    this.add.text(510, 92, 'FASE 2 · CADENA OLEADA', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    if (r.markov) {
      const o = r.markov.oleada;
      const series = [
        { valores: o.pi, color: PANEL.serieTeorica, etiqueta: 'π teórico' },
        { valores: o.frecuencias, color: PANEL.serieObservada, etiqueta: `frecuencia en ${o.k} pasos` }
      ];
      const { rects } = barras(this, 540, 114, { ancho: 210, alto: 104, categorias: o.estados, series, max: 0.7, decimales: 2, tam: 8.5 });
      for (const rect of rects) { rect.setScale(1, 0); this.tweens.add({ targets: rect, scaleY: 1, duration: 600, ease: 'Cubic.easeOut' }); }
      leyenda(this, 510, 262, series);
      this.add.text(772, 116, 'Prueba χ² (α = 0,05)', estilo(10, TEXTO.claro, { fontStyle: 'bold' }));
      this.add.text(772, 134, `χ² ${numero(o.chi.estadistico, 2)} · ${o.chi.gl} gl\nvalor p ${o.chi.transiciones ? numero(o.chi.valorP, 3) : '–'}`, estiloMono(10, TEXTO.amarillo));
      const veredictoChi = o.chi.transiciones === 0 ? 'Sin transiciones todavía.'
        : `${o.chi.rechaza ? 'Se rechaza' : 'No se rechaza'} P.${o.chi.confiable ? '' : ' Con tan pocos pasos la prueba no es confiable.'}`;
      this.add.text(772, 168, veredictoChi, estilo(9, o.chi.rechaza && o.chi.confiable ? TEXTO.rojo : TEXTO.tenue, { wordWrap: { width: 140 } }));
    } else {
      this.add.text(510, 120, 'Turno con la ola fija de la Fase 1: no hubo cadena.\nEl log se exporta igual, con Markov_State = «-».', estilo(10.5, TEXTO.tenue));
    }
    const registro = sesion.ultimoRegistro;
    const exportar = (formato, b) => {
      if (!registro) return;
      const contenido = formato === 'csv'
        ? aCSV(registro.filasLog())
        : aXES(registro.trazas(), { proyecto: PROYECTO_LOG, semilla: registro.semilla, fechaBase: FECHA_BASE_LOG });
      descargar(nombreArchivo(PROYECTO_LOG, registro.semilla, formato), contenido, TIPOS[formato]);
      sonido.activar();
      sonido.exportar();
      b.descargando();
      if (registro.resumen().cerrados >= META_LOGRO_REGISTRO) sesion.guardarLogro('registro_completo');
    };
    const bCsv = botonExportar(this, 846, 236, (b) => exportar('csv', b), { ancho: 148, alto: 24, tam: 9.5 }).fijarTexto('EXPORTAR LOG CSV');
    const bXes = botonExportar(this, 846, 266, (b) => exportar('xes', b), { ancho: 148, alto: 24, tam: 9.5 }).fijarTexto('EXPORTAR LOG XES');
    if (!registro) { bCsv.activar(false); bXes.activar(false); }

    // --- Logros (6 de la Fase 1 y 4 de la Fase 2) ---
    panel(this, 494, 298, 430, 170);
    this.add.text(510, 306, `LOGROS  ${sesion.logros.size} de ${LOGROS.length}`, estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    LOGROS.forEach((logro, i) => {
      const ganado = sesion.logros.has(logro.id);
      const x = 510 + (i >= 5 ? 208 : 0);
      const y = 328 + (i % 5) * 27;
      const marca = this.add.graphics();
      marca.fillStyle(ganado ? PALETA.operacion : 0x2a3347, 1);
      marca.fillCircle(x + 8, y + 8, 7.5);
      if (ganado) {
        marca.lineStyle(2, 0xffffff, 1);
        marca.lineBetween(x + 4, y + 8, x + 7, y + 11);
        marca.lineBetween(x + 7, y + 11, x + 12, y + 5);
      }
      this.add.text(x + 20, y, logro.nombre, estilo(10.5, ganado ? TEXTO.verde : TEXTO.tenue, { fontStyle: 'bold' }));
      this.add.text(x + 20, y + 13, logro.condicion.length > 46 ? `${logro.condicion.slice(0, 45)}…` : logro.condicion, estilo(7.5, TEXTO.tenue));
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
      boton(this, x, 500, 'Siguiente turno', { ancho: 200, alto: 38, tam: 15, color: PALETA.operacion }, () => { sesion.indiceTurno += 1; ir('Planta'); });
      x += 220;
    }
    boton(this, x, 500, 'Repetir turno', { ancho: 200, alto: 38, tam: 15, color: PALETA.mantenimiento }, () => ir('Planta'));
    boton(this, x + 220, 500, 'Volver al título', { ancho: 200, alto: 38, tam: 15, color: 0x2a3347 }, () => ir('Titulo'));
  }
}
