// Pruebas del motor de simulación completo (núcleo + reglas del GDD), sin Phaser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Comedor } from '../src/simulacion/comedor.js';
import { correrTurno } from '../scripts/simular.mjs';
import { MODELOS } from '../src/sed/modelos/index.js';
import { TURNOS, PUNTOS, SEMILLA } from '../src/config.js';

test('turno 1 completo con monitores: todos llegan a Salida con la palabra sbmte', () => {
  const r = correrTurno({ turno: TURNOS[0], monitor: true });
  assert.equal(r.gameOver, null);
  assert.equal(r.resumen.completados, 60);
  assert.equal(r.resumen.victoria, true);
  assert.equal(r.comedor.radar.estado, 'verde');
  const salidas = r.eventos.filter((e) => e.tipo === 'estudiante' && e.evento === 'entregar');
  assert.equal(salidas.length, 60);
  assert.ok(salidas.every((e) => e.palabra === 'sbmte'));
  // Al final se conservan los invariantes P y el comedor queda en reposo.
  for (const invariante of MODELOS.comedorMonitor.invariantes) {
    assert.equal(r.comedor.red.valorInvariante(invariante), invariante.valor);
  }
  assert.equal(r.comedor.red.esReposo(), true);
  assert.equal(r.comedor.red.tokens('Salida'), 60);
});

test('la misma semilla reproduce la misma partida', () => {
  const a = correrTurno({ turno: TURNOS[0], semilla: SEMILLA });
  const b = correrTurno({ turno: TURNOS[0], semilla: SEMILLA });
  const c = correrTurno({ turno: TURNOS[0], semilla: SEMILLA + 1 });
  assert.deepEqual(a.eventos, b.eventos);
  assert.equal(a.comedor.puntaje, b.comedor.puntaje);
  assert.notDeepEqual(a.eventos.length === c.eventos.length ? a.eventos : [], c.eventos);
});

test('semilla fija: el primer bloqueo de torniquete del turno 1 ocurre antes de 60 s', () => {
  const r = correrTurno({ turno: TURNOS[0], monitor: true });
  const bloqueos = r.eventos.filter((e) => e.tipo === 'torniquete' && e.evento === 'bloqueo');
  assert.ok(bloqueos.length >= 1);
  assert.ok(bloqueos[0].t > 15 && bloqueos[0].t < 60, `primer bloqueo en t = ${bloqueos[0].t}`);
  assert.equal(r.comedor.stats.reparaciones, bloqueos.length);
});

test('deadlock de la ficha en el juego: todo el personal a la línea termina en interbloqueo', () => {
  const r = correrTurno({ turno: TURNOS[0], monitor: false, politica: 'todo_linea' });
  assert.notEqual(r.gameOver, null);
  const m = r.gameOver.marcado;
  assert.equal(m.Personal_lavado, 0);   // nadie lava
  assert.equal(m.Bandeja_sucia, 10);    // el carro se llenó
  assert.equal(m.Espacio_carro, 0);
  assert.ok(m.Almorzando > 0);          // los que almuerzan no pueden entregar
  assert.equal(r.comedor.red.esBloqueo(), true);
  assert.equal(r.comedor.radar.estado, 'rojo');
  assert.deepEqual(r.gameOver.secuencia.slice(0, 2), ['t_a_linea', 't_a_linea']);
  assert.ok(r.gameOver.tiempo < 120, 'el bloqueo ocurre antes del siguiente relevo');
  assert.equal(r.comedor.reloj.pausado, true);
  // El radar pasó por amarillo antes del rojo.
  const estados = r.eventos.filter((e) => e.tipo === 'radar').map((e) => e.estado);
  assert.ok(estados.includes('amarillo'));
  assert.equal(estados.at(-1), 'rojo');
});

test('con los monitores la misma decisión queda impedida y el turno termina bien', () => {
  const comedor = new Comedor({ turno: TURNOS[0], monitor: true, piloto: true });
  comedor.iniciar();
  assert.equal(comedor.solicitarDisparo('t_a_linea').ok, true);
  const segundo = comedor.solicitarDisparo('t_a_linea');
  assert.equal(segundo.ok, false);
  assert.equal(segundo.motivo, 'tokens');
  assert.deepEqual(segundo.faltantes.map((f) => f.lugar), ['Minimo_lavado']);
  assert.equal(comedor.red.tokens('Personal_lavado'), 1);
  // t_servir no es un relevo: se dispara con el evento servir, no desde aquí.
  assert.equal(comedor.solicitarDisparo('t_servir').motivo, 'no_jugador');
});

test('reintentar vuelve al último marcado verde y la partida sigue igual que sin el error', () => {
  const jugar = (comedor) => {
    while (!comedor.terminado && !comedor.gameOver) {
      comedor.avanzar(0.1);
      for (const l of comedor.lineas) if (l.torniquete.puede('reiniciar')) comedor.enviarReparacion(l.id, 'RS1S2K');
    }
  };
  const limpio = new Comedor({ turno: TURNOS[0], monitor: false, piloto: true });
  limpio.iniciar();
  jugar(limpio);

  const conError = new Comedor({ turno: TURNOS[0], monitor: false, piloto: true });
  conError.iniciar();
  conError.solicitarDisparo('t_a_linea');
  conError.solicitarDisparo('t_a_linea');
  jugar(conError);
  assert.notEqual(conError.gameOver, null);
  assert.equal(conError.reintentar().ok, true);   // vuelve al inicio del turno (marcado verde)
  assert.equal(conError.gameOver, null);
  assert.equal(conError.red.tokens('Personal_lavado'), 2);
  assert.equal(conError.red.tokens('Relevo'), 2);
  jugar(conError);
  assert.equal(conError.gameOver, null);
  assert.equal(conError.resumen.completados, limpio.resumen.completados);
  assert.equal(conError.puntaje, limpio.puntaje);
});

test('AND-join en el juego: sin bandejas limpias servir no se ejecuta y avisa qué falta', () => {
  const comedor = new Comedor({ turno: TURNOS[0], monitor: true, piloto: false });
  comedor.iniciar();
  let cabeza = null;
  while (!cabeza || cabeza.registro.estado !== 'Con_acceso') {
    comedor.avanzar(0.05);
    cabeza = comedor.cabeza(1) ?? comedor.cabeza(2);
  }
  // Marcado de prueba: las 30 bandejas están en uso o sucias (se respetan los invariantes).
  const m = comedor.red.comoObjeto();
  Object.assign(m, { Bandeja_limpia: 0, Almorzando: 20, Mesa_libre: 0, Bandeja_sucia: 10, Espacio_carro: 0 });
  comedor.red.fijarMarcado(comedor.red.lugares.map((l) => m[l.nombre]));
  const r = comedor.solicitarEvento(cabeza.id, 'servir');
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'tokens');
  assert.deepEqual(r.faltantes.map((f) => f.lugar), ['Bandeja_limpia']);
  assert.equal(cabeza.automata.estado, 'En_Fila'); // el autómata no cambió
});

test('consola de reparación: 2 palabras válidas y 3 inválidas', () => {
  const comedor = new Comedor({ turno: TURNOS[0], monitor: true, piloto: true });
  comedor.iniciar();
  const bloqueada = () => comedor.lineas.find((l) => l.torniquete.puede('reiniciar'));
  while (!bloqueada()) comedor.avanzar(0.1);
  const linea = bloqueada();
  assert.equal(linea.torniquete.estado, 'Bloqueado');
  // Reparar un torniquete que no está bloqueado no tiene transición en δ.
  const otra = comedor.lineas.find((l) => l !== linea);
  assert.equal(comedor.enviarReparacion(otra.id, 'RS1S2K').motivo, 'automata');

  const antes = comedor.puntaje;
  for (const palabra of ['RS1K', 'RS4S1K', 'S1S2K']) {
    const r = comedor.enviarReparacion(linea.id, palabra);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'lenguaje');
    assert.equal(linea.torniquete.estado, 'Bloqueado'); // sigue en fallo
  }
  assert.equal(comedor.puntaje, antes + 3 * PUNTOS.palabraInvalida);
  assert.equal(comedor.pedirAyuda(linea.id).expresion, '^R(S[1-3]){2,}K$');
  assert.equal(comedor.puntaje, antes + 3 * PUNTOS.palabraInvalida + PUNTOS.ayuda);
  const ok = comedor.enviarReparacion(linea.id, 'RS1S2K');
  assert.equal(ok.ok, true);
  assert.equal(linea.torniquete.estado, 'Listo');
  assert.equal(linea.torniquete.historial.at(-1).evento, 'reiniciar'); // pasó por δ
  assert.equal(comedor.logros.has('tecnico'), false); // no fue al primer intento

  // Segundo bloqueo: se repara al primer intento con otra palabra de L.
  while (!bloqueada()) comedor.avanzar(0.1);
  assert.equal(comedor.enviarReparacion(bloqueada().id, 'RS3S3S2K').ok, true);
  assert.equal(comedor.logros.has('tecnico'), true);
});

test('activar y desactivar los monitores conserva el marcado y respeta los invariantes', () => {
  const comedor = new Comedor({ turno: TURNOS[0], monitor: true, piloto: true });
  comedor.iniciar();
  for (let i = 0; i < 300; i++) comedor.avanzar(0.1);
  const antes = comedor.red.comoObjeto();
  assert.equal(comedor.fijarMonitor(false).ok, true);
  assert.equal(comedor.red.nP, 11);
  for (const lugar of comedor.red.lugares) assert.equal(comedor.red.tokens(lugar.nombre), antes[lugar.nombre]);
  comedor.solicitarDisparo('t_a_linea');
  comedor.solicitarDisparo('t_a_linea');
  assert.equal(comedor.red.tokens('Personal_lavado'), 0);
  assert.equal(comedor.fijarMonitor(true).ok, false);     // 4/0 viola Personal_linea + Minimo_lavado = 3
  assert.equal(comedor.monitor, false);
});

test('2 minutos de simulación a x4 sin intervenir no producen errores', () => {
  const comedor = new Comedor({ turno: TURNOS[2], monitor: true, piloto: false });
  comedor.iniciar();
  comedor.reloj.cambiarVelocidad(4);
  for (let cuadro = 0; cuadro < 30 * 60; cuadro++) comedor.avanzar(1 / 60); // 30 s reales = 120 s simulados
  assert.ok(comedor.reloj.tiempo >= 119.9);
  assert.equal(comedor.gameOver, null);
  assert.equal(comedor.stats.servidos, 0);      // nadie pidió servir: la fila crece
  assert.ok(comedor.stats.desbordes > 0);       // y En_fila (k = 16) se desborda y penaliza
  assert.equal(comedor.puntaje, comedor.stats.desbordes * PUNTOS.desborde);
});
