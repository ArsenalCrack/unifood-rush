// Pruebas de la red de Petri y del árbol de cobertura.
// Los marcados, la secuencia del deadlock y los tamaños de los árboles son los
// de la tabla 5.2 d): deben coincidir con PIPE2 (modelos/petri/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RedPetri } from '../src/sed/redPetri.js';
import { Aleatorio } from '../src/sed/aleatorio.js';
import { arbolCobertura, caminoHasta, explorar, OMEGA } from '../src/sed/cobertura.js';
import { MODELOS } from '../src/sed/modelos/index.js';

// Red con un marcado dado por nombre de lugar (lo demás queda en M0).
function redCon(json, marcado = {}) {
  const red = new RedPetri(json);
  red.fijarMarcado(json.lugares.map((l) => marcado[l.nombre] ?? l.m0));
  return red;
}

// Deadlock de la ficha con 30 estudiantes en la fila: 72 disparos.
export const SECUENCIA_DEADLOCK = [
  ['t_a_linea', 2], ['t_servir', 29], ['t_sentarse', 20], ['t_terminar', 9], ['t_sentarse', 9],
  ['t_servir', 1], ['t_terminar', 1], ['t_sentarse', 1]
];
export const MARCADO_MUERTO = {
  En_fila: 0, Bandeja_limpia: 0, Personal_linea: 4, Con_bandeja: 0, Mesa_libre: 0, Almorzando: 20,
  Espacio_carro: 0, Bandeja_sucia: 10, Salida: 10, Personal_lavado: 0, Relevo: 0
};
// Marcado a 3 disparos del deadlock (radar en amarillo).
export const MARCADO_AMARILLO = {
  En_fila: 1, Bandeja_limpia: 1, Personal_linea: 4, Con_bandeja: 0, Mesa_libre: 0, Almorzando: 20,
  Espacio_carro: 1, Bandeja_sucia: 9, Salida: 9, Personal_lavado: 0, Relevo: 0
};

test('estructura de la red de la ficha: 11 lugares, 6 transiciones y M0', () => {
  const red = new RedPetri(MODELOS.comedor);
  assert.equal(red.nP, 11);
  assert.equal(red.nT, 6);
  assert.deepEqual(red.comoObjeto(red.M0), {
    En_fila: 0, Bandeja_limpia: 30, Personal_linea: 2, Con_bandeja: 0, Mesa_libre: 20, Almorzando: 0,
    Espacio_carro: 10, Bandeja_sucia: 0, Salida: 0, Personal_lavado: 2, Relevo: 2
  });
  // A = Post − Pre, fila por transición (|T| x |P|).
  assert.deepEqual(red.A[red.iT('t_servir')], [-1, -1, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(red.A[red.iT('t_terminar')], [0, 0, 0, 0, 1, -1, -1, 1, 1, 0, 0]);
  assert.deepEqual(red.A[red.iT('t_lavar')], [0, 5, 0, 0, 0, 0, 5, -5, 0, 0, 0]);
  const monitor = new RedPetri(MODELOS.comedorMonitor);
  assert.equal(monitor.nP, 13);
});

test('AND-join: t_servir espera En_fila + Bandeja_limpia + Personal_linea', () => {
  const red = new RedPetri(MODELOS.comedor);
  assert.equal(red.habilitada('t_servir'), false);
  assert.deepEqual(red.faltantes('t_servir').map((f) => f.lugar), ['En_fila']);
  assert.throws(() => red.disparar('t_servir'), /no está habilitada/);
  red.agregarTokens('En_fila', 1);
  assert.equal(red.habilitada('t_servir'), true);
  const sinBandejas = redCon(MODELOS.comedor, { En_fila: 3, Bandeja_limpia: 0, Bandeja_sucia: 10, Espacio_carro: 0, Almorzando: 20, Mesa_libre: 0 });
  assert.deepEqual(sinBandejas.faltantes('t_servir').map((f) => f.lugar), ['Bandeja_limpia']);
  // t_lavar pide 5 bandejas sucias (arco de peso 5).
  const cuatro = redCon(MODELOS.comedor, { Bandeja_sucia: 4, Espacio_carro: 6, Bandeja_limpia: 26 });
  assert.deepEqual(cuatro.faltantes('t_lavar'), [{ lugar: 'Bandeja_sucia', tiene: 4, necesita: 5, motivo: 'faltan tokens' }]);
});

test('ecuación de estado M_k = M_{k-1} + A^T · u_k verificada a mano', () => {
  const red = new RedPetri(MODELOS.comedor);
  red.agregarTokens('En_fila', 1);
  red.disparar('t_servir');
  assert.deepEqual(red.ultimo.u, [1, 0, 0, 0, 0, 0]);
  assert.deepEqual(red.ultimo.anterior, [1, 30, 2, 0, 20, 0, 10, 0, 0, 2, 2]);
  assert.deepEqual(red.marcado(), [0, 29, 2, 1, 20, 0, 10, 0, 0, 2, 2]);
  red.disparar('t_sentarse');
  red.disparar('t_terminar');
  assert.deepEqual(red.marcado(), [0, 29, 2, 0, 20, 0, 9, 1, 1, 2, 2]);
  // "Probar disparo" no cambia el marcado.
  const lavar = redCon(MODELOS.comedor, { Bandeja_sucia: 5, Espacio_carro: 5, Bandeja_limpia: 25 });
  assert.deepEqual(lavar.resultado('t_lavar'), lavar.json.lugares.map((l) => l.m0));
  assert.equal(lavar.tokens('Bandeja_sucia'), 5);
});

test('deadlock de la ficha: la secuencia de 72 disparos lleva al marcado muerto', () => {
  const red = redCon(MODELOS.comedor, { En_fila: 30 });
  let disparos = 0;
  for (const [transicion, veces] of SECUENCIA_DEADLOCK) {
    for (let i = 0; i < veces; i++) {
      if (disparos === 69) { // a 3 disparos del final: radar en amarillo
        assert.deepEqual(red.comoObjeto(), MARCADO_AMARILLO);
        const radar = explorar(red, red.M, 3);
        assert.equal(radar.estado, 'amarillo');
        assert.equal(radar.bloqueos[0].distancia, 3);
      }
      red.disparar(transicion);
      disparos++;
    }
  }
  assert.equal(disparos, 72);
  assert.deepEqual(red.comoObjeto(), MARCADO_MUERTO);
  assert.equal(red.esMuerto(), true);
  assert.equal(red.esReposo(), false);
  assert.equal(red.esBloqueo(), true);
  assert.deepEqual(red.habilitadas(), []);
  assert.equal(explorar(red, red.M, 3).estado, 'rojo');
});

test('regla de prevención: los monitores impiden dejar un puesto sin personal', () => {
  const red = redCon(MODELOS.comedorMonitor, { En_fila: 30 });
  red.disparar('t_a_linea');
  assert.equal(red.habilitada('t_a_linea'), false); // el segundo relevo a la línea ya no se puede
  assert.deepEqual(red.faltantes('t_a_linea').map((f) => f.lugar), ['Minimo_lavado']);
  const otra = redCon(MODELOS.comedorMonitor);
  otra.disparar('t_a_lavado');
  assert.deepEqual(otra.faltantes('t_a_lavado').map((f) => f.lugar), ['Minimo_linea']);
  // El mismo instante del deadlock, pero con 3/1 por el monitor: no hay bloqueo.
  const mismo = redCon(MODELOS.comedorMonitor, { ...MARCADO_AMARILLO, Personal_linea: 3, Personal_lavado: 1, Minimo_lavado: 0, Minimo_linea: 2 });
  assert.equal(explorar(mismo, mismo.M, 3).estado, 'verde');
  const arbol = arbolCobertura(mismo, mismo.M, 5000);
  assert.deepEqual([arbol.nodos.length, arbol.marcadosDistintos, arbol.bloqueos.length], [287, 139, 0]);
});

test('conflictos (choice), desborde y capacidad estricta', () => {
  const red = redCon(MODELOS.comedor, { En_fila: 1 });
  const conflictos = Object.fromEntries(red.conflictos().map((c) => [c.lugar, c.transiciones]));
  assert.deepEqual(conflictos.Relevo, ['t_a_linea', 't_a_lavado']);
  assert.deepEqual(conflictos.Personal_linea, ['t_servir', 't_a_lavado']);
  // En_fila es de capacidad "desborde" (k = 16): entra todo y se informa el exceso.
  const fila = new RedPetri(MODELOS.comedor);
  assert.deepEqual(fila.agregarTokens('En_fila', 16), { agregados: 16, desborde: 0 });
  assert.deepEqual(fila.agregarTokens('En_fila', 1), { agregados: 1, desborde: 1 });
  // Relevo es de capacidad estricta (k = 2): solo entra lo que cabe.
  assert.deepEqual(fila.agregarTokens('Relevo', 2), { agregados: 0, desborde: 0 });
});

test('reposo no es interbloqueo: sin estudiantes el marcado muerto es normal', () => {
  const red = new RedPetri(MODELOS.comedor);
  red.disparar('t_a_linea');
  red.disparar('t_a_lavado');
  assert.equal(red.esMuerto(), true);
  assert.equal(red.esReposo(), true);
  assert.equal(red.esBloqueo(), false);
});

for (const [nombre, json] of [['ficha', MODELOS.comedor], ['monitor', MODELOS.comedorMonitor]]) {
  test(`invariantes P y capacidades en 1000 disparos aleatorios con semilla (${nombre})`, () => {
    const red = new RedPetri(json);
    const azar = new Aleatorio(96);
    let disparos = 0;
    while (disparos < 1000) {
      if (azar.ocurre(0.35)) red.agregarTokens('En_fila', 1); // llegada externa
      if (azar.ocurre(0.02)) red.agregarTokens('Relevo', 2);  // cambio de turno
      const habilitadas = red.habilitadas();
      if (habilitadas.length === 0) {
        // Sin monitores puede haber interbloqueo; con monitores nunca.
        if (nombre === 'monitor') assert.equal(red.esBloqueo(), false);
        continue;
      }
      red.disparar(azar.elegir(habilitadas));
      disparos++;
      for (const invariante of json.invariantes) {
        assert.equal(red.valorInvariante(invariante), invariante.valor, `invariante ${invariante.nombre}`);
      }
      red.lugares.forEach((l, p) => {
        assert.ok(red.M[p] >= 0);
        if (l.capacidad === 'estricta') assert.ok(red.M[p] <= l.k, `${l.nombre} supera k`);
      });
    }
  });
}

test('árbol de cobertura: número de nodos desde M0 y en los escenarios de análisis', () => {
  const medir = (json, marcado) => {
    const red = redCon(json, marcado);
    const a = arbolCobertura(red, red.M);
    return [a.nodos.length, a.marcadosDistintos, a.muertos.length, a.bloqueos.length];
  };
  // [nodos del árbol, marcados distintos, marcados muertos, interbloqueos]
  assert.deepEqual(medir(MODELOS.comedor, {}), [7, 6, 3, 0]);                            // M0 de la ficha
  assert.deepEqual(medir(MODELOS.comedorMonitor, {}), [5, 4, 1, 0]);                     // M0 con monitores
  assert.deepEqual(medir(MODELOS.comedor, { En_fila: 3, Relevo: 0 }), [31, 20, 1, 0]);   // escenario A
  assert.deepEqual(medir(MODELOS.comedor, { En_fila: 2 }), [129, 60, 5, 2]);             // escenario B, libre
  assert.deepEqual(medir(MODELOS.comedorMonitor, { En_fila: 2 }), [89, 40, 1, 0]);       // escenario B, monitores
  assert.deepEqual(medir(MODELOS.comedor, MARCADO_AMARILLO), [6, 5, 1, 1]);              // escenario C
});

test('árbol de cobertura: camino más corto al bloqueo, límites y ω', () => {
  const red = redCon(MODELOS.comedor, { En_fila: 2 });
  const arbol = arbolCobertura(red, red.M);
  assert.equal(arbol.acotada, true);
  assert.deepEqual(caminoHasta(arbol, arbol.bloqueos[0]), ['t_a_lavado', 't_a_lavado']);
  assert.equal(arbolCobertura(red, red.M, 20).truncado, true);
  const local = arbolCobertura(red, red.M, 2000, { profundidadMax: 2 });
  assert.ok(local.nodos.every((n) => n.profundidad <= 2));
  // Red no acotada: "producir" agrega tokens sin límite y aparece ω.
  const noAcotada = new RedPetri({
    lugares: [
      { id: 'p1', nombre: 'A', m0: 1, k: null, capacidad: 'sin_limite' },
      { id: 'p2', nombre: 'B', m0: 0, k: null, capacidad: 'sin_limite' }
    ],
    transiciones: [{ id: 't1', nombre: 'producir', disparo: 'automatica' }, { id: 't2', nombre: 'consumir', disparo: 'automatica' }],
    pre: [[1, 0], [0, 1]],
    post: [[1, 1], [0, 0]]
  });
  const conOmega = arbolCobertura(noAcotada);
  assert.equal(conOmega.acotada, false);
  assert.equal(conOmega.nodos.length, 4);
  assert.deepEqual(conOmega.nodos[1].marcado, [1, OMEGA]);
});
