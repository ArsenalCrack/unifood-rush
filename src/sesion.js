// Estado de la sesión de juego que comparten las escenas: turno elegido,
// opciones y logros ya ganados. No guarda estados del modelo formal.

import { SEMILLA, TURNOS } from './config.js';

const CLAVE = 'unifood-rush-logros';

function leerLogros() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(CLAVE) ?? '[]'));
  } catch {
    return new Set(); // sin almacenamiento (ventana privada o vista previa): se sigue sin él
  }
}

export const sesion = {
  indiceTurno: 0,          // 0, 1 o 2
  monitor: true,           // regla de prevención activa al empezar el turno
  piloto: false,           // piloto automático de servir
  semilla: SEMILLA,
  logros: leerLogros(),
  resultados: [],          // resumen de cada turno jugado

  turno() {
    return TURNOS[this.indiceTurno];
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
