// Estado de la sesión de juego que comparten las escenas: turno elegido,
// opciones y logros ya ganados. No guarda estados del modelo formal.

import { SEMILLA, TURNOS, TURNO_CONTINUO } from './config.js';

const CLAVE = 'unifood-rush-logros';

function leerLogros() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(CLAVE) ?? '[]'));
  } catch {
    return new Set(); // sin almacenamiento (ventana privada o vista previa): se sigue sin él
  }
}

export const sesion = {
  indiceTurno: 0,          // 0, 1 o 2; 3 es el turno 4 continuo de la Fase 2
  monitor: true,           // regla de prevención activa al empezar el turno
  piloto: false,           // piloto automático de servir
  llegadas: 'markov',      // 'markov' (Fase 2) o 'fase1' (ola fija de la Fase 1)
  semilla: SEMILLA,
  logros: leerLogros(),
  resultados: [],          // resumen de cada turno jugado
  ultimoRegistro: null,    // registrador del último turno, para exportar desde Resultados

  turno() {
    return this.indiceTurno === 3 ? TURNO_CONTINUO : TURNOS[this.indiceTurno];
  },

  borrarLogros() {
    this.logros.clear();
    try {
      window.localStorage.removeItem(CLAVE);
    } catch {
      // sin almacenamiento: basta con vaciar la lista de esta sesión
    }
  },

  guardarLogro(id) {
    this.logros.add(id);
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify([...this.logros]));
    } catch {
      // sin almacenamiento: el logro queda solo en esta sesión
    }
  }
};
