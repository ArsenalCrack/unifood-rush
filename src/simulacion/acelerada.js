// Simulación acelerada (guía 5.7.6, «Generar log»): corre solo el núcleo, sin dibujar,
// con la política automática del GDD hasta N casos cerrados (o N pasos k) y prepara el
// Event Log en CSV y XES. La usan la escena GenerarLog (por partes, con una barra de
// progreso) y scripts/generar-log.mjs. No depende del motor de juego ni del DOM.

import { Comedor } from './comedor.js';
import { POLITICA_BASE, POLITICA_MEJORADA } from './politica.js';
import { Registrador } from '../telemetria/registrador.js';
import { aCSV } from '../telemetria/exportarCSV.js';
import { aXES } from '../telemetria/exportarXES.js';
import { TURNO_CONTINUO, SEMILLA, FECHA_BASE_LOG, PROYECTO_LOG } from '../config.js';

export const POLITICAS = { base: POLITICA_BASE, mejorada: POLITICA_MEJORADA };

// casos: casos cerrados que se buscan (por omisión 300). pasos: alternativa, pasos k.
export function crearSimulacionAcelerada({ semilla = SEMILLA, casos = 300, pasos = null, politica = 'base' } = {}) {
  const comedor = new Comedor({
    turno: TURNO_CONTINUO, semilla, monitor: true, piloto: true, llegadas: 'markov', politica: POLITICAS[politica]
  });
  const registrador = new Registrador(comedor);
  comedor.iniciar();
  const meta = pasos != null ? { tipo: 'pasos', valor: pasos } : { tipo: 'casos', valor: casos };
  const hecho = () => (meta.tipo === 'casos' ? registrador.cerrados : comedor.k);

  return {
    comedor, registrador, meta, politica,
    listo() {
      return hecho() >= meta.valor || comedor.gameOver != null || comedor.terminado;
    },
    progreso() {
      return Math.min(1, hecho() / meta.valor);
    },
    // Avanza en pasos de 0,5 s de simulación hasta "segundos" más o hasta terminar.
    avanzar(segundos = 120) {
      const fin = comedor.reloj.tiempo + segundos;
      while (!this.listo() && comedor.reloj.tiempo < fin) comedor.avanzar(0.5);
      return this.progreso();
    },
    correr() {
      while (!this.listo()) this.avanzar(600);
      return this.resultado();
    },
    // Event Log con solo los casos cerrados y un resumen para la pantalla y el informe.
    resultado() {
      const oleada = comedor.markov.oleada;
      const filas = registrador.filasLog({ soloCerrados: true });
      const trazas = registrador.trazas({ soloCerrados: true });
      const r = registrador.resumen();
      return {
        csv: aCSV(filas),
        xes: aXES(trazas, { proyecto: PROYECTO_LOG, semilla, fechaBase: FECHA_BASE_LOG }),
        resumen: {
          semilla, politica, pasos: comedor.k, tiempo: comedor.reloj.tiempo,
          casosCerrados: r.cerrados, casosIncompletos: r.abiertos, eventos: filas.length,
          tiempoCicloMedio: registrador.tiempoCicloMedio(),
          llegadas: comedor.stats.llegadas, desbordes: comedor.stats.desbordes, pasosLinea3: comedor.fase2.pasosLinea3,
          estados: oleada.estados, frecuencias: oleada.frecuencias(), pi: oleada.estacionaria(),
          chi: oleada.chiCuadrado(), mesas: { frecuencias: comedor.markov.mesas.frecuencias(), chi: comedor.markov.mesas.chiCuadrado() },
          interbloqueo: comedor.gameOver != null
        }
      };
    }
  };
}
