// Pruebas de los autómatas, la composición y el lenguaje de reparación.
// Las palabras son las de la tabla 5.2 d): deben dar lo mismo en JFLAP
// (Input > Multiple Run) con los archivos de modelos/automatas/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Automata } from '../src/sed/automata.js';
import { componer, componerVarios } from '../src/sed/composicion.js';
import { Observador } from '../src/sed/observador.js';
import { Lenguaje } from '../src/sed/lenguaje.js';
import { MODELOS } from '../src/sed/modelos/index.js';

// Códigos: Estudiante s b m t e · Torniquete l a r x i.
export const PALABRAS = {
  estudiante: {
    aceptadas: ['sbmte'],
    rechazadas: ['', 's', 'sbmt', 'bsmte', 'sbmtee', 'ssbmte', 'sbtme']
  },
  torniquete: {
    aceptadas: ['', 'la', 'lala', 'lrla', 'lrlrlrxi', 'lrlrlrxila'],
    rechazadas: ['l', 'lr', 'lrx', 'a', 'lal', 'li', 'lrlrlrx', 'lax']
  },
  contadorRechazos: {
    aceptadas: ['', 'l', 'lr', 'lrlr', 'lrlrlrx', 'rrrx'],
    rechazadas: ['rrr', 'lrlrlr', 'x', 'rrrr', 'rrrl', 'rx']
  },
  registroAcceso: {
    aceptadas: ['', 'a', 'as', 'aas', 'ass'],
    rechazadas: ['s', 'sa', 'sas', 'ss']
  }
};

for (const [modelo, { aceptadas, rechazadas }] of Object.entries(PALABRAS)) {
  test(`${modelo}: palabras aceptadas y rechazadas`, () => {
    const g = new Automata(MODELOS[modelo]);
    for (const w of aceptadas) assert.equal(g.acepta(w), true, `debe aceptar "${w}"`);
    for (const w of rechazadas) assert.equal(g.acepta(w), false, `debe rechazar "${w}"`);
  });
}

test('los autómatas son deterministas y δ no definida lanza error', () => {
  for (const nombre of ['estudiante', 'torniquete', 'contadorRechazos', 'registroAcceso']) {
    assert.doesNotThrow(() => new Automata(MODELOS[nombre]));
  }
  const noDeterminista = { ...MODELOS.estudiante, transiciones: [...MODELOS.estudiante.transiciones, ['En_Fila', 'servir', 'Salida']] };
  assert.throws(() => new Automata(noDeterminista), /no determinista/);

  const est = new Automata(MODELOS.estudiante);
  assert.deepEqual(est.eventosActivos(), ['servir']);          // Γ(En_Fila)
  assert.throws(() => est.ejecutar('sentarse'), /no está definida/);
  assert.equal(est.estado, 'En_Fila');                         // el estado no cambió
  for (const evento of ['servir', 'buscar_mesa', 'sentarse', 'terminar', 'entregar']) est.ejecutar(evento);
  assert.equal(est.estado, 'Salida');
  assert.equal(est.esMarcado(), true);
  assert.equal(est.palabra(), 'sbmte');
});

test('controlabilidad de la ficha: solo servir y reiniciar son controlables', () => {
  const est = new Automata(MODELOS.estudiante);
  const tor = new Automata(MODELOS.torniquete);
  assert.deepEqual([...est.eventos.keys()].filter((e) => est.esControlable(e)), ['servir']);
  assert.deepEqual([...tor.eventos.keys()].filter((e) => tor.esControlable(e)), ['reiniciar']);
});

test('composición síncrona: tamaños del producto', () => {
  // Sin eventos comunes: el producto es Q1 x Q2 completo.
  const et = componer(MODELOS.estudiante, MODELOS.torniquete);
  assert.equal(et.estados.length, 30);
  assert.equal(et.transiciones.length, 67);
  // Con eventos comunes (leer, rechazo, bloqueo): solo 11 de 20 estados son alcanzables.
  const tc = componer(MODELOS.torniquete, MODELOS.contadorRechazos);
  assert.equal(tc.estados.length, 11);
  assert.ok(tc.estados.includes('Rechazo|C3'));
  assert.ok(!tc.estados.includes('Bloqueado|C1'));
  // Planta ‖ especificación del supervisor.
  const alcanzable = componerVarios([MODELOS.estudiante, MODELOS.torniquete, MODELOS.registroAcceso]);
  const completo = componerVarios([MODELOS.estudiante, MODELOS.torniquete, MODELOS.registroAcceso], { completo: true });
  assert.equal(alcanzable.estados.length, 59);
  assert.equal(completo.estados.length, 90);
});

test('bloqueo ocurre exactamente tras 3 rechazos (Torniquete ‖ Contador_Rechazos)', () => {
  const g = new Automata(componer(MODELOS.torniquete, MODELOS.contadorRechazos));
  for (const evento of ['leer', 'rechazo', 'leer', 'rechazo', 'leer']) g.ejecutar(evento);
  assert.equal(g.puede('bloqueo'), false);          // solo 2 rechazos: aún no puede bloquear
  g.ejecutar('rechazo');
  assert.equal(g.estado, 'Rechazo|C3');
  assert.deepEqual(g.eventosActivos(), ['bloqueo']); // tras el tercero solo queda bloqueo
  g.ejecutar('bloqueo');
  g.ejecutar('reiniciar');
  assert.equal(g.estado, 'Listo|C0');
});

test('con Σuo = ∅ el observador tiene los mismos estados que el autómata', () => {
  for (const nombre of ['estudiante', 'torniquete']) {
    const observador = new Observador(MODELOS[nombre]).construir();
    assert.equal(observador.estados.length, MODELOS[nombre].estados.length);
  }
  // Con un evento no observable la estimación crece: {Leyendo, Rechazo}.
  const parcial = structuredClone(MODELOS.torniquete);
  parcial.eventos.find((e) => e.id === 'rechazo').observable = false;
  const obs = new Observador(parcial);
  assert.deepEqual(obs.observar('leer'), ['Leyendo', 'Rechazo']);
});

test('lenguaje de reparación: ejemplos de la ficha', () => {
  const L = new Lenguaje(MODELOS.reparacion);
  assert.equal(L.validar('RS1S2K').pertenece, true);   // válida de la ficha
  assert.equal(L.validar('RS1K').pertenece, false);    // solo una prueba de sensor
  assert.equal(L.validar('RS4S1K').pertenece, false);  // S4 no existe
});

test('la RegExp y el DFA coinciden en 20 palabras', () => {
  const L = new Lenguaje(MODELOS.reparacion);
  const palabras = [
    'RS1S2K', 'RS3S3K', 'RS1S2S3K', 'RS2S2S2S2K', 'RS3S1S2S3S1K',       // 5 que pertenecen a L
    '', 'R', 'RK', 'RS1K', 'RS4S1K', 'RS1S2', 'RS1S2KK', 'S1S2K', 'RSS1K', 'R1S2K',
    'RS1S2k', 'rs1s2k', 'RS1 S2K', 'RS1S2KR', 'KS1S2R'                 // 15 que no pertenecen
  ];
  assert.equal(palabras.length, 20);
  const aceptadas = palabras.filter((w) => {
    const v = L.validar(w);
    assert.equal(v.coincide, true, `RegExp y DFA difieren en "${w}"`);
    return v.pertenece;
  });
  assert.equal(aceptadas.length, 5);
});

test('analizar muestra el progreso del DFA y qué se esperaba', () => {
  const L = new Lenguaje(MODELOS.reparacion);
  const bien = L.analizar('RS1S');
  assert.equal(bien.error, null);
  assert.equal(bien.estadoFinal, 'q4');
  assert.deepEqual(bien.esperados, ['1', '2', '3']);
  const mal = L.analizar('RS4S1K');
  assert.equal(mal.aceptada, false);
  assert.deepEqual(mal.error, { posicion: 2, simbolo: '4', estado: 'q2', esperados: ['1', '2', '3'] });
  assert.equal(L.analizar('RS1S2K').aceptada, true);
  assert.throws(() => new Lenguaje({ ...MODELOS.reparacion, expresion: 'R(S[1-3]){2,}K' }), /anclada/);
});
