// Exportación del Event Log a CSV (docs/log.md, sección 3): separador coma, UTF-8
// con BOM para que Excel lea las tildes, encabezado fijo y una fila por actividad.
// Los textos con coma, comillas o saltos de línea van entre comillas.
// No depende del motor de juego ni del DOM.

export const COLUMNAS = ['Case_ID', 'Activity', 'Timestamp_Inicio', 'Timestamp_Fin', 'Resource_ID', 'Markov_State', 'Lifecycle'];
export const BOM = '﻿';

export function campoCSV(valor) {
  const texto = valor == null ? '' : String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// filas: objetos con las 7 columnas (Registrador.filasLog()).
export function aCSV(filas) {
  const lineas = [COLUMNAS.join(','), ...filas.map((fila) => COLUMNAS.map((c) => campoCSV(fila[c])).join(','))];
  return BOM + lineas.join('\r\n') + '\r\n';
}
