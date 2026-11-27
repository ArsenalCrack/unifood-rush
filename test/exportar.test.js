// Pruebas de la exportación del Event Log a CSV y XES (src/telemetria/, docs/log.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aCSV, campoCSV, COLUMNAS, BOM } from '../src/telemetria/exportarCSV.js';
import { aXES, escaparXML } from '../src/telemetria/exportarXES.js';
import { crearSimulacionAcelerada } from '../src/simulacion/acelerada.js';

// Comprobador mínimo de XML bien formado: declaración, etiquetas balanceadas,
// atributos entre comillas y entidades válidas. Devuelve el árbol de etiquetas.
function analizarXML(texto) {
  assert.ok(texto.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'falta la declaración XML');
  const cuerpo = texto.replace(/^<\?xml[^>]*\?>/, '');
  const pila = [];
  const raiz = { nombre: '#documento', hijos: [] };
  let actual = raiz;
  let pos = 0;
  const etiqueta = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/g;
  let m;
  while ((m = etiqueta.exec(cuerpo)) !== null) {
    const texto = cuerpo.slice(pos, m.index);
    assert.equal(/[<]/.test(texto), false, `texto con < suelto cerca de ${m.index}`);
    assert.equal(/&(?!amp;|lt;|gt;|quot;|apos;)/.test(texto + m[3]), false, `entidad no válida cerca de ${m.index}`);
    pos = etiqueta.lastIndex;
    const [, cierre, nombre, atributos, vacia] = m;
    if (cierre) {
      assert.equal(actual.nombre, nombre, `cierre </${nombre}> sin apertura`);
      actual = pila.pop();
    } else {
      const nodo = { nombre, atributos: Object.fromEntries([...atributos.matchAll(/([\w:.-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])), hijos: [] };
      actual.hijos.push(nodo);
      if (!vacia) { pila.push(actual); actual = nodo; }
    }
  }
  assert.equal(cuerpo.slice(pos).trim(), '', 'texto después de la raíz');
  assert.equal(pila.length, 0, 'etiquetas sin cerrar');
  assert.equal(raiz.hijos.length, 1, 'un solo elemento raíz');
  return raiz.hijos[0];
}

test('CSV: BOM, separador coma, encabezado fijo y comillas en los textos con coma', () => {
  const filas = [
    { Case_ID: 'EST-0001', Activity: 'Esperar_fila', Timestamp_Inicio: '2026-01-01T11:30:00.000Z', Timestamp_Fin: '2026-01-01T11:30:01.500Z', Resource_ID: 'Linea_1', Markov_State: 'Baja', Lifecycle: 'complete' },
    { Case_ID: 'EST-0002', Activity: 'Almorzar', Timestamp_Inicio: '2026-01-01T11:31:00.000Z', Timestamp_Fin: '', Resource_ID: 'Mesa, "07"', Markov_State: 'Alta', Lifecycle: 'start' }
  ];
  const csv = aCSV(filas);
  assert.ok(csv.startsWith(BOM));
  const lineas = csv.slice(1).trimEnd().split('\r\n');
  assert.equal(lineas[0], 'Case_ID,Activity,Timestamp_Inicio,Timestamp_Fin,Resource_ID,Markov_State,Lifecycle');
  assert.equal(COLUMNAS.length, 7);
  assert.equal(lineas[1], 'EST-0001,Esperar_fila,2026-01-01T11:30:00.000Z,2026-01-01T11:30:01.500Z,Linea_1,Baja,complete');
  assert.equal(lineas[2], 'EST-0002,Almorzar,2026-01-01T11:31:00.000Z,,"Mesa, ""07""",Alta,start');
  assert.equal(campoCSV('a\nb'), '"a\nb"');
});

test('XES de 5 casos: XML válido con 5 trazas y un evento start y otro complete por actividad', () => {
  const sim = crearSimulacionAcelerada({ casos: 5 });
  sim.correr();
  const trazas = sim.registrador.trazas({ soloCerrados: true }).slice(0, 5);
  assert.equal(trazas.length, 5);
  const xes = aXES(trazas, { proyecto: 'UniFoodRush', semilla: 96, fechaBase: '2026-01-01T11:30:00Z' });
  const log = analizarXML(xes);
  assert.equal(log.nombre, 'log');
  assert.equal(log.atributos['xes.version'], '1849-2016');
  const extensiones = log.hijos.filter((h) => h.nombre === 'extension').map((h) => h.atributos.name);
  assert.deepEqual(extensiones, ['Concept', 'Time', 'Organizational', 'Lifecycle']);
  const xmlTrazas = log.hijos.filter((h) => h.nombre === 'trace');
  assert.equal(xmlTrazas.length, 5);
  xmlTrazas.forEach((traza, i) => {
    const nombre = traza.hijos.find((h) => h.atributos.key === 'concept:name').atributos.value;
    assert.equal(nombre, trazas[i].id);
    const eventos = traza.hijos.filter((h) => h.nombre === 'event');
    assert.equal(eventos.length, trazas[i].actividades.length * 2);
    for (const evento of eventos) {
      const claves = evento.hijos.map((h) => h.atributos.key);
      assert.deepEqual(claves, ['concept:name', 'time:timestamp', 'org:resource', 'lifecycle:transition', 'markov:state']);
      const fecha = evento.hijos.find((h) => h.atributos.key === 'time:timestamp');
      assert.equal(fecha.nombre, 'date');
      assert.match(fecha.atributos.value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
    const transiciones = eventos.map((e) => e.hijos[3].atributos.value);
    assert.deepEqual(transiciones.filter((t, j) => j % 2 === 0).every((t) => t === 'start'), true);
    assert.deepEqual(transiciones.filter((t, j) => j % 2 === 1).every((t) => t === 'complete'), true);
  });
});

test('XES: escapa los caracteres especiales y un caso incompleto lleva completo = false', () => {
  assert.equal(escaparXML('a & b < "c" > \'d\''), 'a &amp; b &lt; &quot;c&quot; &gt; &apos;d&apos;');
  const xes = aXES([{
    id: 'EST-0001', atributos: { completo: false, linea: 1, oleada_llegada: 'Alta' },
    actividades: [{ actividad: 'Esperar_fila', recurso: 'Linea_1 & <2>', markov: 'Alta', inicio: '2026-01-01T11:30:00.000Z', fin: null }]
  }]);
  const log = analizarXML(xes);
  const traza = log.hijos.find((h) => h.nombre === 'trace');
  assert.equal(traza.hijos.find((h) => h.atributos.key === 'completo').atributos.value, 'false');
  const eventos = traza.hijos.filter((h) => h.nombre === 'event');
  assert.equal(eventos.length, 1, 'una actividad abierta solo tiene su evento start');
  assert.match(xes, /Linea_1 &amp; &lt;2&gt;/);
});

test('la simulación acelerada genera 300 casos cerrados y más de 1000 eventos', () => {
  const { csv, xes, resumen } = crearSimulacionAcelerada({ casos: 300 }).correr();
  assert.equal(resumen.casosCerrados, 300);
  assert.ok(resumen.eventos >= 1000, `${resumen.eventos} eventos`);
  const lineas = csv.trimEnd().split('\r\n');
  assert.equal(lineas.length - 1, resumen.eventos);
  assert.equal(new Set(lineas.slice(1).map((l) => l.split(',')[0])).size, 300);
  assert.equal(analizarXML(xes).hijos.filter((h) => h.nombre === 'trace').length, 300);
  // χ² se calcula con todas las transiciones de la oleada; con unos 30 pasos la prueba tiene
  // poca potencia y la aproximación no vale: la validación estadística es la de 10 000 pasos
  // (test/markov.test.js) y la de 1000 pasos (npm run log -- --pasos 1000).
  assert.equal(resumen.chi.transiciones, resumen.pasos);
});

test('la política mejorada recibe las mismas oleadas y llegadas que la base y baja el tiempo de ciclo', () => {
  const base = crearSimulacionAcelerada({ casos: 300, politica: 'base' }).correr().resumen;
  const mejorada = crearSimulacionAcelerada({ casos: 300, politica: 'mejorada' }).correr().resumen;
  assert.equal(base.pasosLinea3, 0);
  assert.ok(mejorada.pasosLinea3 > 0);
  assert.ok(mejorada.tiempoCicloMedio < base.tiempoCicloMedio, `${mejorada.tiempoCicloMedio} < ${base.tiempoCicloMedio}`);
  assert.ok(mejorada.desbordes <= base.desbordes);
});
