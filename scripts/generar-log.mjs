// Genera los logs de la entrega con la simulación acelerada (sin navegador):
//   analisis/logs/entrega/base.csv y base.xes        política base (línea 3 cerrada)
//   analisis/logs/entrega/mejorado.csv y mejorado.xes política mejorada (línea 3 anticipada)
// Las dos partidas usan la misma semilla: reciben las mismas oleadas y las mismas llegadas.
//
// Uso: npm run log                      (300 casos cerrados, semilla 96)
//      npm run log -- --casos 500 --semilla 7
//      npm run log -- --pasos 1000      (validación estadística: 1000 pasos k)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crearSimulacionAcelerada } from '../src/simulacion/acelerada.js';
import { SEMILLA } from '../src/config.js';

const argumento = (nombre, defecto) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? Number(process.argv[i + 1]) : defecto;
};
const semilla = argumento('semilla', SEMILLA);
const pasos = argumento('pasos', null);
const casos = argumento('casos', 300);
const carpeta = join('analisis', 'logs', pasos ? '' : 'entrega');
mkdirSync(carpeta, { recursive: true });

const redondear = (v) => v.map((x) => x.toFixed(4)).join('; ');
for (const politica of pasos ? ['base'] : ['base', 'mejorada']) {
  const nombre = pasos ? `validacion_${pasos}_pasos` : politica === 'base' ? 'base' : 'mejorado';
  const simulacion = crearSimulacionAcelerada({ semilla, casos, pasos, politica });
  const { csv, xes, resumen: r } = simulacion.correr();
  if (pasos) {
    // Validación estadística (guía 5.10 b): la secuencia de estados de cada cadena y sus
    // pruebas, en un JSON pequeño; el log completo de miles de casos no hace falta aquí.
    const { oleada, mesas } = simulacion.comedor.markov;
    const cadena = (c) => ({
      estados: c.estados, secuencia: c.historial.map((h) => h.a), conteos: c.conteoTotal(),
      frecuencias: c.frecuencias(), pi: c.estacionaria(), P_estimada: c.matrizEstimada().P, chi: c.chiCuadrado()
    });
    writeFileSync(join(carpeta, `${nombre}.json`), JSON.stringify({ semilla, pasos: r.pasos, oleada: cadena(oleada), mesas: cadena(mesas) }, null, 1));
  } else {
    writeFileSync(join(carpeta, `${nombre}.csv`), csv);
    writeFileSync(join(carpeta, `${nombre}.xes`), xes);
  }
  console.log(`== ${nombre} (política ${politica}, semilla ${semilla})`);
  console.log(`   ${r.casosCerrados} casos cerrados, ${r.eventos} eventos, ${r.casosIncompletos} casos incompletos fuera del log`);
  console.log(`   ${r.pasos} pasos k, ${r.tiempo.toFixed(0)} s de simulación, ${r.llegadas} llegadas, ${r.desbordes} desbordes, línea 3 abierta ${r.pasosLinea3} pasos`);
  console.log(`   tiempo medio de ciclo ${r.tiempoCicloMedio.toFixed(1)} s`);
  console.log(`   oleada: frecuencias (${redondear(r.frecuencias)}) contra pi (${redondear(r.pi)})`);
  console.log(`   chi-cuadrado ${r.chi.estadistico.toFixed(3)} con ${r.chi.gl} gl, valor p ${r.chi.valorP.toFixed(4)}: ${r.chi.conclusion}`);
  console.log(`   mesas (observadas en la red): frecuencias (${redondear(r.mesas.frecuencias)}), χ² ${r.mesas.chi.estadistico.toFixed(2)}, p ${r.mesas.chi.valorP.toFixed(4)}`);
  console.log(`   archivos: ${join(carpeta, nombre)}${pasos ? '.json' : '.csv y .xes'}`);
}
