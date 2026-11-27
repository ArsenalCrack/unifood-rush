// Política automática del GDD (sección 16.7): la usan la simulación acelerada
// («Generar log») y el turno 4. Todas sus decisiones pasan por el núcleo como
// solicitudes (servir con el piloto, reparar con una palabra de L, abrir o cerrar
// la línea 3) y se toman en instantes de simulación fijos, así que la misma
// semilla da la misma partida. No depende del motor de juego ni del DOM.

import { UMBRAL_RIESGO, PASOS_RIESGO } from '../config.js';

// piloto: servir en cuanto el supervisor y la red lo permiten.
// reparar: un torniquete bloqueado se repara "demora" segundos después con "palabra".
// linea3: 'nunca' (política base), 'anticipar' (política mejorada) o null (decide el jugador).
export const POLITICA_BASE = Object.freeze({
  nombre: 'base', piloto: true, reparar: { demora: 6, palabra: 'RS1S2K' }, linea3: 'nunca'
});
export const POLITICA_MEJORADA = Object.freeze({
  ...POLITICA_BASE, nombre: 'mejorada', linea3: 'anticipar', umbral: UMBRAL_RIESGO, pasos: PASOS_RIESGO
});
// Turno 4 en el juego: el piloto sirve y repara; la línea 3 la decide el jugador.
export const POLITICA_TURNO_CONTINUO = Object.freeze({ ...POLITICA_BASE, nombre: 'continuo', linea3: null });

// Al empezar cada paso k: abre la línea 3 si P(Alta en <= 3 pasos) supera el umbral y la
// cierra cuando la oleada es Baja y el riesgo ya no lo supera. Devuelve la acción tomada.
export function decidirLinea3(comedor, politica) {
  if (!politica || politica.linea3 !== 'anticipar' || !comedor.markov) return null;
  const riesgo = comedor.riesgo(politica.pasos ?? PASOS_RIESGO);
  const abierta = comedor.lineas[2].abierta;
  const umbral = politica.umbral ?? UMBRAL_RIESGO;
  if (!abierta && riesgo >= umbral) return comedor.alternarLinea3({ origen: 'politica' }).ok ? 'abrir' : null;
  if (abierta && comedor.markov.oleada.estado === 'Baja' && riesgo < umbral) {
    return comedor.alternarLinea3({ origen: 'politica' }).ok ? 'cerrar' : null;
  }
  return null;
}
