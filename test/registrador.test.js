// Pruebas del registrador de eventos (src/telemetria/registrador.js, docs/log.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Comedor } from '../src/simulacion/comedor.js';
import { Registrador, ACTIVIDADES } from '../src/telemetria/registrador.js';
import { POLITICA_BASE } from '../src/simulacion/politica.js';
import { TURNOS, FECHA_BASE_LOG } from '../src/config.js';

// Juega un turno con la política automática y devuelve el comedor y su registro.
function jugar({ turno = TURNOS[0], llegadas = 'markov', semilla = 96, hasta = Infinity } = {}) {
  const comedor = new Comedor({ turno, semilla, monitor: true, llegadas, politica: POLITICA_BASE });
  const registrador = new Registrador(comedor);
  comedor.iniciar();
  while (!comedor.terminado && !comedor.gameOver && comedor.reloj.tiempo < hasta) comedor.avanzar(0.25);
  return { comedor, registrador };
}

const segundos = (iso) => (Date.parse(iso) - Date.parse(FECHA_BASE_LOG)) / 1000;

test('un caso de principio a fin produce las actividades del modelo normativo en orden', () => {
  const { registrador } = jugar();
  const casos = registrador.trazas({ soloCerrados: true });
  assert.ok(casos.length > 40);
  for (const caso of casos) {
    // Pasar_torniquete se repite una vez por cada rechazo del lector.
    const sinRepetir = caso.actividades.map((a) => a.actividad).filter((a, i, l) => a !== l[i - 1]);
    assert.deepEqual(sinRepetir, ACTIVIDADES, caso.id);
  }
});

test('cada Case_ID es único y legible (EST-0001), y los casos cerrados terminan en Entregar_menaje', () => {
  const { registrador } = jugar();
  const ids = registrador.trazas().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^EST-\d{4,}$/.test(id)));
  assert.equal(ids[0], 'EST-0001');
  for (const caso of registrador.trazas({ soloCerrados: true })) {
    assert.equal(caso.actividades.at(-1).actividad, 'Entregar_menaje');
    assert.equal(caso.atributos.completo, true);
  }
});

test('los tiempos crecen y ningún Timestamp_Fin es anterior a su Timestamp_Inicio', () => {
  const { registrador } = jugar();
  const filas = registrador.filasLog();
  assert.ok(filas.length > 200, `${filas.length} filas`);
  for (const f of filas) {
    if (f.Timestamp_Fin) assert.ok(f.Timestamp_Fin >= f.Timestamp_Inicio, `${f.Case_ID} ${f.Activity}`);
  }
  for (const caso of registrador.trazas()) {
    caso.actividades.forEach((a, i) => {
      if (i > 0) assert.ok(a.inicio >= caso.actividades[i - 1].fin, `${caso.id}: ${a.actividad} empieza antes de terminar la anterior`);
    });
  }
});

test('las marcas de tiempo salen del reloj de simulación y de FECHA_BASE_LOG, en ISO 8601 con milisegundos', () => {
  const { comedor, registrador } = jugar({ hasta: 45 });
  const filas = registrador.filasLog();
  assert.ok(filas.length > 0);
  for (const f of filas) {
    assert.match(f.Timestamp_Inicio, /^2026-01-01T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const t = segundos(f.Timestamp_Inicio);
    assert.ok(t >= 0 && t <= comedor.reloj.tiempo + 1e-9, `${t} fuera del reloj de simulación`);
  }
  assert.equal(filas[0].Timestamp_Inicio.slice(0, 16), '2026-01-01T11:30');
});

test('recursos y estado de Markov de cada actividad', () => {
  const { registrador } = jugar();
  const recursos = {
    Esperar_fila: /^Linea_[123]$/, Pasar_torniquete: /^Torniquete_[123]$/, Recibir_bandeja: /^Linea_[123]$/,
    Buscar_mesa: /^Mesa_(0[1-9]|1\d|20)$/, Almorzar: /^Mesa_(0[1-9]|1\d|20)$/, Entregar_menaje: /^Lavado$/
  };
  for (const f of registrador.filasLog({ soloCerrados: true })) {
    assert.match(f.Resource_ID, recursos[f.Activity], `${f.Case_ID} ${f.Activity}`);
    assert.ok(['Baja', 'Media', 'Alta'].includes(f.Markov_State));
    assert.equal(f.Lifecycle, 'complete');
  }
  // En el modo de la Fase 1 no hay cadena: Markov_State = '-'.
  const fase1 = jugar({ llegadas: 'fase1', hasta: 30 }).registrador.filasLog();
  assert.ok(fase1.length > 0 && fase1.every((f) => f.Markov_State === '-'));
});

test('Pasar_torniquete se repite exactamente una vez por cada rechazo del lector', () => {
  const { comedor, registrador } = jugar();
  assert.ok(comedor.terminado);
  // Turno completo: cada estudiante tuvo un acceso_ok y cada rechazo fue una lectura más.
  const lecturas = registrador.filasLog().filter((f) => f.Activity === 'Pasar_torniquete').length;
  assert.equal(lecturas, comedor.stats.llegadas + comedor.stats.rechazos);
  assert.ok(comedor.stats.rechazos > 0);
});

test('los casos abiertos al exportar quedan como incompletos y «solo cerrados» los quita', () => {
  const { registrador } = jugar({ hasta: 120 });
  const r = registrador.resumen();
  assert.ok(r.abiertos > 0, 'a los 120 s hay estudiantes en proceso');
  const todas = registrador.filasLog();
  const cerradas = registrador.filasLog({ soloCerrados: true });
  assert.ok(todas.some((f) => f.Lifecycle === 'start' && f.Timestamp_Fin === ''));
  assert.ok(cerradas.every((f) => f.Lifecycle === 'complete'));
  assert.equal(new Set(cerradas.map((f) => f.Case_ID)).size, r.cerrados);
  assert.ok(registrador.trazas().some((c) => c.atributos.completo === false));
});

test('la misma semilla produce el mismo log', () => {
  const a = jugar({ turno: TURNOS[1] }).registrador.filasLog();
  const b = jugar({ turno: TURNOS[1] }).registrador.filasLog();
  const c = jugar({ turno: TURNOS[1], semilla: 97 }).registrador.filasLog();
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('al reintentar tras un interbloqueo el registro vuelve al mismo punto que la partida', () => {
  const comedor = new Comedor({ turno: TURNOS[0], monitor: false, llegadas: 'markov', politica: POLITICA_BASE });
  const registrador = new Registrador(comedor);
  comedor.iniciar();
  // Deadlock de la ficha: todo el personal a la línea.
  comedor.solicitarDisparo('t_a_linea');
  comedor.solicitarDisparo('t_a_linea');
  while (!comedor.gameOver && !comedor.terminado) comedor.avanzar(0.25);
  assert.ok(comedor.gameOver, 'debe ocurrir el interbloqueo');
  const antes = registrador.resumen().eventos;
  comedor.reintentar(true);
  assert.equal(registrador.resumen().eventos, 0, 'vuelve al inicio del turno');
  assert.equal(registrador.quitados, antes);
  // Se puede seguir jugando y el registro sigue coherente.
  comedor.fijarMonitor(true);
  while (!comedor.terminado && !comedor.gameOver && comedor.reloj.tiempo < 200) comedor.avanzar(0.25);
  const ids = registrador.trazas().map((c) => c.id);
  assert.equal(ids[0], 'EST-0001');
  assert.equal(new Set(ids).size, ids.length);
});
