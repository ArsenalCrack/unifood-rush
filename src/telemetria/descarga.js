// Descarga de archivos generados en el navegador: un Blob y un enlace temporal.
// No hay servidor, así que funciona en la previsualización del aula virtual.
// Es el único archivo de src/telemetria/ que usa el DOM.

// <proyecto>_semilla<S>_<fecha>.<extension>; la fecha es la de la exportación
// (solo va en el nombre: las marcas de tiempo del log salen del reloj de simulación).
export function nombreArchivo(proyecto, semilla, extension, fecha = new Date()) {
  const d = (n) => String(n).padStart(2, '0');
  const sello = `${fecha.getFullYear()}${d(fecha.getMonth() + 1)}${d(fecha.getDate())}-${d(fecha.getHours())}${d(fecha.getMinutes())}`;
  return `${proyecto}_semilla${semilla}_${sello}.${extension}`;
}

export const TIPOS = { csv: 'text/csv;charset=utf-8', xes: 'application/xml;charset=utf-8' };

export function descargar(nombre, contenido, tipo = 'text/plain;charset=utf-8') {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { nombre, bytes: blob.size };
}
