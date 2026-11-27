// Pruebas del comedor con llegadas por Cadena de Markov (Fase 2): reloj discreto,
// vínculo con la Fase 1, línea 3, compras, puntaje y reproducibilidad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Comedor } from '../src/simulacion/comedor.js';
import { PASO_K_S } from '../src/simulacion/flujo.js';
import { POLITICA_BASE, POLITICA_MEJORADA, POLITICA_TURNO_CONTINUO } from '../src/simulacion/politica.js';
import { Registrador } from '../src/telemetria/registrador.js';
import { MARKOV } from '../src/sed/modelos/index.js';
import { TURNOS, TURNO_CONTINUO, COSTOS, PASO_K_MS, PUNTOS_FASE2 } from '../src/config.js';

const nuevo = (opciones = {}) => new Comedor({ turno: TURNOS[2], monitor: true, llegadas: 'markov', politica: POLITICA_BASE, ...opciones });

function correr(comedor, hasta = Infinity, paso = 0.25) {
  while (!comedor.terminado && !comedor.gameOver && comedor.reloj.tiempo < hasta) comedor.avanzar(paso);
  return comedor;
}

test('en cada paso k llegan 4, 10 o 18 estudiantes según el estado de la oleada', () => {
  const comedor = nuevo();
  const llegadasPorPaso = [];
  comedor.on('llegada', () => {
    const k = Math.floor(comedor.reloj.tiempo / PASO_K_S);
    llegadasPorPaso[k] = (llegadasPorPaso[k] ?? 0) + 1;
  });
  comedor.iniciar();
  correr(comedor);
  const estados = ['Baja', ...comedor.markov.oleada.historial.map((h) => h.a)]; // X_0 = Baja (pi0)
  assert.equal(comedor.k, TURNOS[2].pasos);
  for (let k = 0; k < TURNOS[2].pasos; k++) {
    assert.equal(llegadasPorPaso[k] ?? 0, MARKOV.oleada.llegadasPorPaso[estados[k]], `paso ${k} en ${estados[k]}`);
  }
  // Después del último paso ya no llega nadie y el turno cierra cuando todos salieron.
  assert.equal(llegadasPorPaso.length, TURNOS[2].pasos);
  assert.ok(comedor.terminado);
  assert.equal(comedor.resumen.total, comedor.stats.llegadas);
  assert.equal(comedor.stats.completados, comedor.stats.llegadas);
});

test('el paso k ocurre siempre en k · 30 s de simulación y la cadena avanza en orden fijo', () => {
  const comedor = nuevo();
  const instantes = [];
  comedor.on('markov', (e) => instantes.push([e.k, comedor.reloj.tiempo, e.oleada.k, e.mesas.k]));
  comedor.iniciar();
  correr(comedor, 200, 0.37);
  instantes.forEach(([k, t, ko, km]) => {
    assert.equal(t, k * PASO_K_S);
    assert.equal(ko, k);
    assert.equal(km, k);
  });
  assert.equal(PASO_K_MS, 30000);
});

test('con el temporizador externo (como el TimerEvent de Phaser) la partida es idéntica a ×1, ×4 y ×8', () => {
  const eventos = (comedor) => {
    const lista = [];
    comedor.on('*', (e) => lista.push(JSON.stringify([comedor.reloj.tiempo.toFixed(6), e.tipo, e.id ?? e.linea ?? e.k ?? ''])));
    return lista;
  };
  // Referencia: el núcleo da los pasos solo.
  const referencia = nuevo();
  const esperado = eventos(referencia);
  referencia.iniciar();
  correr(referencia, 400, 0.1);

  for (const velocidad of [1, 4, 8]) {
    const comedor = nuevo({ relojExterno: true });
    const obtenido = eventos(comedor);
    comedor.iniciar();
    comedor.reloj.cambiarVelocidad(velocidad);
    // Cuadros de duración irregular; el temporizador mide su propio tiempo real
    // (delay = PASO_K_MS / velocidad) y a veces se adelanta o se atrasa al reloj.
    const cuadros = [16.7, 15.9, 17.4, 33.1, 8.2, 16.6, 50.3, 16.7];
    const delay = PASO_K_MS / velocidad;
    let acumulado = 0;
    let i = 0;
    while (!comedor.terminado && !comedor.gameOver && comedor.reloj.tiempo < 400) {
      const dt = cuadros[i++ % cuadros.length];
      acumulado += dt * (1 + (i % 5 === 0 ? 0.03 : -0.01)); // deriva entre el temporizador y el reloj
      if (acumulado >= delay) { acumulado -= delay; comedor.pasoMarkov(); }
      comedor.avanzar(dt / 1000);
    }
    const n = Math.min(esperado.length, obtenido.length);
    assert.ok(n > 500);
    assert.deepEqual(obtenido.slice(0, n), esperado.slice(0, n), `velocidad ×${velocidad}`);
  }
});

test('el reloj espera en el borde del paso k hasta que el temporizador lo da', () => {
  const comedor = nuevo({ relojExterno: true });
  comedor.iniciar();
  for (let i = 0; i < 100; i++) comedor.avanzar(1); // 100 s sin temporizador
  assert.equal(comedor.reloj.tiempo, PASO_K_S);
  assert.equal(comedor.k, 0);
  assert.notEqual(comedor.pasoMarkov(), null);
  assert.equal(comedor.k, 1);
  comedor.reloj.pausar();
  assert.equal(comedor.pasoMarkov(), null, 'en pausa no hay paso');
});

test('la misma semilla repite las oleadas aunque el jugador haga cosas distintas', () => {
  const oleadas = (abrirLinea3) => {
    const comedor = nuevo({ politica: abrirLinea3 ? POLITICA_MEJORADA : POLITICA_BASE });
    comedor.iniciar();
    correr(comedor);
    return comedor.markov.oleada.historial.map((h) => h.a);
  };
  assert.deepEqual(oleadas(false), oleadas(true));
  const otra = nuevo({ semilla: 97 });
  otra.iniciar();
  correr(otra);
  assert.notDeepEqual(otra.markov.oleada.historial.map((h) => h.a), oleadas(false));
});

test('la cadena Mesas observa la ocupación de la red de Petri por cuartos', () => {
  const comedor = nuevo();
  const observado = [];
  comedor.on('markov', (e) => observado.push([e.mesas.a, comedor.red.tokens('Almorzando')]));
  comedor.iniciar();
  correr(comedor);
  assert.ok(observado.length > 5);
  for (const [estado, ocupadas] of observado) {
    const esperado = ocupadas < 5 ? '0-25%' : ocupadas < 10 ? '25-50%' : ocupadas < 15 ? '50-75%' : '75-100%';
    assert.equal(estado, esperado);
  }
  // La red no cambia por observarla: el invariante de mesas se conserva.
  assert.equal(comedor.red.tokens('Mesa_libre') + comedor.red.tokens('Almorzando'), 20);
});

test('línea 3: abrirla cuesta 20 y 3 por paso; abierta recibe estudiantes y cerrada ya no', () => {
  const comedor = nuevo({ politica: null, piloto: true });
  comedor.iniciar();
  const puntaje = comedor.puntaje;
  assert.equal(comedor.alternarLinea3().abierta, true);
  assert.equal(comedor.puntaje, puntaje - COSTOS.linea3Apertura);
  let usada = 0;
  comedor.on('llegada', (e) => { if (e.linea === 3) usada++; });
  correr(comedor, 3 * PASO_K_S + 1);
  assert.ok(usada > 0, 'los estudiantes eligen la línea 3 si es la más corta');
  assert.equal(comedor.fase2.pasosLinea3, 3);
  comedor.alternarLinea3();
  usada = 0;
  correr(comedor, 6 * PASO_K_S + 1);
  assert.equal(usada, 0, 'cerrada, nadie nuevo la elige');
  assert.equal(comedor.fase2.pasosLinea3, 3);
  // En el modo de la Fase 1 la línea 3 no existe para el jugador.
  const fase1 = new Comedor({ turno: TURNOS[0] });
  fase1.iniciar();
  assert.equal(fase1.alternarLinea3().ok, false);
});

test('comprar un permiso de relevo agrega un token a Relevo (k = 2) y cuesta 25', () => {
  const comedor = nuevo({ politica: null });
  comedor.iniciar();
  assert.equal(comedor.red.tokens('Relevo'), 2);
  assert.equal(comedor.comprarRelevo().motivo, 'capacidad');
  comedor.solicitarDisparo('t_a_linea');
  assert.equal(comedor.red.tokens('Relevo'), 1);
  const puntaje = comedor.puntaje;
  const r = comedor.comprarRelevo();
  assert.equal(r.ok, true);
  assert.equal(comedor.red.tokens('Relevo'), 2);
  assert.equal(comedor.puntaje, puntaje - COSTOS.relevoExtra);
});

test('puntaje de la Fase 2: pronóstico acertado, oleada alta sin desborde y línea justa', () => {
  const comedor = nuevo({ politica: POLITICA_MEJORADA });
  const motivos = [];
  comedor.on('puntaje', (e) => motivos.push(e.motivo));
  comedor.iniciar();
  correr(comedor);
  const f = comedor.fase2;
  assert.ok(f.pasosAlta > 0);
  assert.equal(motivos.filter((m) => m === 'pronóstico acertado').length, f.pronosticos);
  assert.equal(motivos.filter((m) => m === 'oleada alta sin desborde').length, f.altasSinDesborde);
  assert.equal(motivos.filter((m) => m === 'línea 3 abierta').length, f.pasosLinea3);
  if (f.altaSinLinea === 0 && f.bajaConLinea === 0) {
    assert.ok(motivos.includes('línea bien dimensionada'));
    assert.ok(comedor.logros.has('linea_justa'));
  }
  assert.equal(PUNTOS_FASE2.pronostico, 15);
});

test('reintentar tras un interbloqueo restaura k y las cadenas, y la partida sigue igual', () => {
  const comedor = new Comedor({ turno: TURNOS[2], monitor: false, llegadas: 'markov', politica: POLITICA_BASE });
  // El punto verde de t = 120 s se guarda con el relevo, antes del paso k del mismo instante.
  let k = null;
  let oleada = null;
  comedor.on('instantanea', (e) => {
    if (e.cual === 'verde') { k = comedor.k; oleada = comedor.markov.oleada.exportar(); }
  });
  comedor.iniciar();
  correr(comedor, 125); // pasa el primer relevo (punto verde en t = 120 s)
  assert.equal(k, 3);
  comedor.solicitarDisparo('t_a_linea');
  comedor.solicitarDisparo('t_a_linea');
  correr(comedor);
  assert.ok(comedor.gameOver);
  comedor.reintentar();
  assert.equal(comedor.k, k);
  assert.deepEqual(comedor.markov.oleada.exportar().conteos, oleada.conteos);
  // Sin repetir el error, las oleadas que siguen son las mismas que en una partida sin error.
  correr(comedor);
  const limpia = new Comedor({ turno: TURNOS[2], monitor: false, llegadas: 'markov', politica: POLITICA_BASE });
  limpia.iniciar();
  correr(limpia);
  assert.deepEqual(comedor.markov.oleada.historial.map((h) => h.a), limpia.markov.oleada.historial.map((h) => h.a));
});

test('turno 4 continuo: no termina solo y la política repara los torniquetes', () => {
  const comedor = new Comedor({ turno: TURNO_CONTINUO, llegadas: 'markov', politica: POLITICA_TURNO_CONTINUO });
  const registrador = new Registrador(comedor);
  comedor.iniciar();
  correr(comedor, 60 * PASO_K_S);
  assert.equal(comedor.terminado, false);
  assert.equal(comedor.k, 60);
  assert.ok(comedor.stats.bloqueos > 0);
  assert.ok(comedor.stats.reparaciones >= comedor.stats.bloqueos - 2);
  assert.equal(comedor.lineas[2].abierta, false, 'la línea 3 la decide el jugador');
  assert.ok(registrador.resumen().cerrados > 400);
  assert.equal(comedor.logros.has('tecnico'), false, 'la reparación automática no gana el logro del jugador');
  // Tras 60 pasos la P estimada de la oleada no se rechaza.
  assert.equal(comedor.markov.oleada.chiCuadrado().rechaza, false);
});
