// Exportación del Event Log a XES (IEEE 1849-2016), docs/log.md, sección 4.
// Extensiones Concept, Time, Organizational y Lifecycle. Una <trace> por caso con
// concept:name = Case_ID y, por cada actividad, un <event> de inicio (start) y otro
// de fin (complete), con concept:name, time:timestamp, org:resource,
// lifecycle:transition y markov:state. No depende del motor de juego ni del DOM.

export function escaparXML(valor) {
  return String(valor)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const atributo = (clave, valor) => {
  if (typeof valor === 'boolean') return `<boolean key="${clave}" value="${valor}"/>`;
  if (Number.isInteger(valor)) return `<int key="${clave}" value="${valor}"/>`;
  return `<string key="${clave}" value="${escaparXML(valor)}"/>`;
};

function evento(actividad, instante, transicion) {
  return [
    '    <event>',
    `      <string key="concept:name" value="${escaparXML(actividad.actividad)}"/>`,
    `      <date key="time:timestamp" value="${instante}"/>`,
    `      <string key="org:resource" value="${escaparXML(actividad.recurso)}"/>`,
    `      <string key="lifecycle:transition" value="${transicion}"/>`,
    `      <string key="markov:state" value="${escaparXML(actividad.markov)}"/>`,
    '    </event>'
  ].join('\n');
}

// trazas: Registrador.trazas(). meta: { proyecto, semilla, fechaBase }.
export function aXES(trazas, meta = {}) {
  const partes = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<log xes.version="1849-2016" xes.features="nested-attributes" xmlns="http://www.xes-standard.org/">',
    '  <extension name="Concept" prefix="concept" uri="http://www.xes-standard.org/concept.xesext"/>',
    '  <extension name="Time" prefix="time" uri="http://www.xes-standard.org/time.xesext"/>',
    '  <extension name="Organizational" prefix="org" uri="http://www.xes-standard.org/org.xesext"/>',
    '  <extension name="Lifecycle" prefix="lifecycle" uri="http://www.xes-standard.org/lifecycle.xesext"/>',
    '  <global scope="trace">',
    '    <string key="concept:name" value="__INVALID__"/>',
    '  </global>',
    '  <global scope="event">',
    '    <string key="concept:name" value="__INVALID__"/>',
    '    <date key="time:timestamp" value="1970-01-01T00:00:00.000Z"/>',
    '    <string key="lifecycle:transition" value="complete"/>',
    '  </global>',
    '  <classifier name="Actividad" keys="concept:name"/>',
    '  <classifier name="Actividad y ciclo de vida" keys="concept:name lifecycle:transition"/>',
    `  <string key="concept:name" value="${escaparXML(meta.proyecto ?? 'UniFoodRush')} · Event Log"/>`,
    `  <string key="source" value="UniFood Rush, Fase 2 (simulador SED)"/>`
  ];
  if (meta.semilla != null) partes.push(`  ${atributo('semilla', meta.semilla)}`);
  if (meta.fechaBase) partes.push(`  <string key="fecha_base" value="${escaparXML(meta.fechaBase)}"/>`);
  for (const traza of trazas) {
    partes.push('  <trace>', `    <string key="concept:name" value="${escaparXML(traza.id)}"/>`);
    for (const [clave, valor] of Object.entries(traza.atributos ?? {})) partes.push(`    ${atributo(clave, valor)}`);
    for (const actividad of traza.actividades) {
      partes.push(evento(actividad, actividad.inicio, 'start'));
      if (actividad.fin) partes.push(evento(actividad, actividad.fin, 'complete'));
    }
    partes.push('  </trace>');
  }
  partes.push('</log>');
  return partes.join('\n') + '\n';
}
