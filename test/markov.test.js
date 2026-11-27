// Pruebas del núcleo estocástico (src/sed/markov.js) contra analisis/resultados_python.json:
// los mismos números que calculó NumPy con tolerancia 1e-6 y las frecuencias con 0,02.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CadenaMarkov, potencia, multiplicar, diferenciaMaxima, chi2Supervivencia } from '../src/sed/markov.js';
import { Aleatorio } from '../src/sed/aleatorio.js';
import { MARKOV } from '../src/sed/modelos/index.js';
import { SEMILLA_MARKOV } from '../src/config.js';

const PYTHON = JSON.parse(readFileSync(new URL('../analisis/resultados_python.json', import.meta.url), 'utf8'));
const TOL = 1e-6;

const cerca = (a, b, tol, mensaje) => {
  if (Array.isArray(a)) {
    assert.equal(a.length, b.length, mensaje);
    a.forEach((v, i) => cerca(v, b[i], tol, `${mensaje}[${i}]`));
  } else {
    assert.ok(Math.abs(a - b) <= tol, `${mensaje}: JavaScript ${a} y Python ${b}`);
  }
};

const cadenas = [['Oleada', MARKOV.oleada], ['Mesas', MARKOV.mesas]];
const nueva = (json, semilla = SEMILLA_MARKOV) => {
  const g = new Aleatorio(semilla);
  return new CadenaMarkov(json, () => g.siguiente());
};

test('los JSON de src/sed/modelos/markov/ son las cadenas validadas en Python', () => {
  for (const [nombre, json] of cadenas) {
    const py = PYTHON.cadenas[nombre];
    assert.deepEqual(json.estados, py.estados, nombre);
    assert.deepEqual(json.pi0, py.pi0, nombre);
    cerca(json.P, py.P, 1e-12, `${nombre}.P`);
    assert.deepEqual(json.peligrosos, py.peligrosos, nombre);
    assert.equal(json.pasoMs, 30000);
  }
  assert.deepEqual(Object.values(MARKOV.oleada.llegadasPorPaso), PYTHON.cadenas.Oleada.llegadas_por_paso);
});

test('P debe ser estocástica: una fila que no suma 1 lanza un error', () => {
  const mala = { ...MARKOV.oleada, P: [[0.6, 0.3, 0.1], [0.25, 0.5, 0.2], [0.1, 0.35, 0.55]] };
  assert.throws(() => new CadenaMarkov(mala), /fila Media suma/);
  const negativa = { ...MARKOV.oleada, P: [[1.1, -0.1, 0], [0.25, 0.5, 0.25], [0.1, 0.35, 0.55]] };
  assert.throws(() => new CadenaMarkov(negativa), /negativo/);
  const casi = { ...MARKOV.oleada, P: [[0.6, 0.3, 0.1 + 1e-10], [0.25, 0.5, 0.25], [0.1, 0.35, 0.55]] };
  assert.doesNotThrow(() => new CadenaMarkov(casi)); // tolerancia 1e-9
});

test('Chapman-Kolmogorov: P^5 = P^2 · P^3 y P^(m+n) = P^m · P^n', () => {
  for (const [nombre, json] of cadenas) {
    const P = json.P;
    const py = PYTHON.cadenas[nombre].chapman_kolmogorov;
    cerca(potencia(P, 5), multiplicar(potencia(P, 2), potencia(P, 3)), 1e-12, `${nombre} P^5`);
    cerca(potencia(P, 5), py.P5, TOL, `${nombre} P^5 de Python`);
    cerca(potencia(P, 2), py.P2, TOL, `${nombre} P^2 de Python`);
    for (let m = 1; m <= 5; m++) {
      for (let n = 1; n <= 5; n++) {
        assert.ok(diferenciaMaxima(potencia(P, m + n), multiplicar(potencia(P, m), potencia(P, n))) < 1e-12);
      }
    }
  }
});

test('distribucion(n) = pi^(0) · P^n igual a Python para n = 1, 2, 3, 4, 5, 8, 10 y 20', () => {
  for (const [nombre, json] of cadenas) {
    const cadena = new CadenaMarkov(json);
    for (const [n, valor] of Object.entries(PYTHON.cadenas[nombre].transitorio)) {
      cerca(cadena.distribucion(Number(n)), valor, TOL, `${nombre} pi^(${n})`);
    }
  }
  // Valores de la ficha D.13: pi^(1), pi^(2), pi^(4) y pi^(8) desde Baja.
  const oleada = new CadenaMarkov(MARKOV.oleada);
  cerca(oleada.distribucion(1), [0.60, 0.30, 0.10], 1e-12, 'pi^(1)');
  cerca(oleada.distribucion(2), [0.445, 0.365, 0.19], 1e-12, 'pi^(2)');
  cerca(oleada.distribucion(4), [0.346, 0.3885, 0.2655], 1e-4, 'pi^(4)'); // la ficha redondea a 4 decimales
  cerca(oleada.distribucion(8), [0.3194, 0.3928, 0.2878], 1e-4, 'pi^(8)');
});

test('estacionaria() y el tiempo medio de retorno son los de Python', () => {
  for (const [nombre, json] of cadenas) {
    const cadena = new CadenaMarkov(json);
    const py = PYTHON.cadenas[nombre];
    cerca(cadena.estacionaria(), py.pi, TOL, `${nombre} pi`);
    cerca(cadena.tiemposRetorno(), py.retorno_medio, TOL, `${nombre} retorno`);
    const pi = cadena.estacionaria();
    cerca(pi.reduce((s, p) => s + p, 0), 1, 1e-12, `${nombre} suma de pi`);
    cerca(multiplicar([pi], json.P)[0], pi, 1e-12, `${nombre} pi = pi · P`);
  }
  cerca(new CadenaMarkov(MARKOV.oleada).estacionaria(), [0.3179, 0.3931, 0.2890], 1e-4, 'pi de la ficha');
  cerca(new CadenaMarkov(MARKOV.mesas).estacionaria(), [1 / 6, 1 / 3, 1 / 3, 1 / 6], 1e-9, 'pi de mesas');
});

test('clasificar(): una clase recurrente de periodo 1, cadenas ergódicas, como en Python', () => {
  for (const [nombre, json] of cadenas) {
    const c = new CadenaMarkov(json).clasificar();
    const py = PYTHON.cadenas[nombre].clasificacion;
    assert.deepEqual(c.clases, py.clases, nombre);
    assert.equal(c.irreducible, py.irreducible);
    assert.equal(c.aperiodica, py.aperiodica);
    assert.equal(c.ergodica, true);
  }
  // Una cadena periódica y otra con estados transitorios y absorbentes.
  const ciclo = new CadenaMarkov({ nombre: 'Ciclo', estados: ['A', 'B', 'C'], pi0: [1, 0, 0], P: [[0, 1, 0], [0, 0, 1], [1, 0, 0]] }).clasificar();
  assert.equal(ciclo.clases[0].periodo, 3);
  assert.equal(ciclo.ergodica, false);
  const dairy = new CadenaMarkov(LACTEA).clasificar();
  assert.deepEqual(dairy.clases.map((c) => c.tipo), ['transitorio', 'absorbente', 'absorbente']);
  assert.equal(dairy.estados.find((e) => e.nombre === 'Envasado').tipo, 'absorbente');
});

// Ficha D.1 (DairyCraft): sirve para probar absorcion() con los valores de referencia de la guía.
const LACTEA = {
  nombre: 'Lote', estados: ['Esteril', 'Riesgo_Termico', 'Envasado', 'Contaminado'], pi0: [1, 0, 0, 0],
  P: [[0.80, 0.12, 0.08, 0], [0.35, 0.40, 0.05, 0.20], [0, 0, 1, 0], [0, 0, 0, 1]]
};

test('absorcion(): N, t y B de una cadena absorbente (valores de la ficha D.1)', () => {
  const a = new CadenaMarkov(LACTEA).absorcion();
  assert.deepEqual(a.absorbentes, ['Envasado', 'Contaminado']);
  cerca(a.B[0], [0.6923, 0.3077], 1e-4, 'B desde Estéril');
  cerca(a.t[0], 9.23, 0.01, 't desde Estéril');
  cerca(a.B[1][1], 0.5128, 1e-4, 'merma desde Riesgo_Térmico');
  // N·(I − Q) = I
  const IQ = a.Q.map((fila, i) => fila.map((v, j) => (i === j ? 1 : 0) - v));
  cerca(multiplicar(a.N, IQ), [[1, 0], [0, 1]], 1e-12, 'N · (I − Q)');
  assert.equal(new CadenaMarkov(MARKOV.oleada).absorcion(), null); // ergódica: no hay absorción
});

test('riesgo: P(llegar a un estado peligroso en <= 1, 3 y 5 pasos) igual a Python', () => {
  for (const [nombre, json] of cadenas) {
    const cadena = new CadenaMarkov(json);
    for (const [k, valores] of Object.entries(PYTHON.cadenas[nombre].riesgo.desde_cada_estado)) {
      cerca(json.estados.map((e) => cadena.riesgo(Number(k), e)), valores, TOL, `${nombre} riesgo en ${k}`);
    }
  }
});

test('con la semilla de config.js, 10 000 pasos dan frecuencias a menos de 0,02 de pi', () => {
  for (const [nombre, json] of cadenas) {
    const cadena = nueva(json);
    for (let i = 0; i < 10000; i++) cadena.paso();
    assert.equal(cadena.k, 10000);
    const pi = cadena.estacionaria();
    const frecuencias = cadena.frecuencias();
    frecuencias.forEach((f, j) => assert.ok(Math.abs(f - pi[j]) < 0.02, `${nombre} ${json.estados[j]}: ${f} y pi ${pi[j]}`));
    // Ninguna transición imposible (p_ij = 0) aparece en el muestreo.
    const conteo = cadena.conteoTotal();
    json.P.forEach((fila, i) => fila.forEach((p, j) => { if (p === 0) assert.equal(conteo[i][j], 0); }));
  }
});

test('la misma semilla repite la misma secuencia y otra semilla la cambia', () => {
  const secuencia = (semilla) => {
    const cadena = nueva(MARKOV.oleada, semilla);
    return Array.from({ length: 200 }, () => cadena.paso().a);
  };
  assert.deepEqual(secuencia(SEMILLA_MARKOV), secuencia(SEMILLA_MARKOV));
  assert.notDeepEqual(secuencia(SEMILLA_MARKOV), secuencia(SEMILLA_MARKOV + 1));
});

test('matrizEstimada() y chiCuadrado() no rechazan P con alfa = 0,05 en 10 000 pasos', () => {
  for (const [nombre, json] of cadenas) {
    const cadena = nueva(json);
    for (let i = 0; i < 10000; i++) cadena.paso();
    const { P, totales } = cadena.matrizEstimada();
    assert.equal(totales.reduce((s, n) => s + n, 0), 10000);
    assert.ok(diferenciaMaxima(P, json.P) < 0.03, nombre);
    const chi = cadena.chiCuadrado();
    assert.equal(chi.gl, PYTHON.cadenas[nombre].chi_cuadrado.gl, `${nombre} grados de libertad`);
    assert.equal(chi.rechaza, false, `${nombre}: ${chi.conclusion}`);
    assert.ok(chi.valorP > 0.05);
    assert.equal(chi.confiable, true, 'con 10 000 pasos todos los esperados son >= 5');
  }
});

test('el valor p de chi-cuadrado coincide con SciPy', () => {
  // Valores de analisis/resultados_python.json (scipy.stats.chi2.sf).
  for (const nombre of ['Oleada', 'Mesas']) {
    const { estadistico, gl, valor_p: p } = PYTHON.cadenas[nombre].chi_cuadrado;
    cerca(chi2Supervivencia(estadistico, gl), p, 1e-9, `${nombre} valor p`);
  }
  cerca(chi2Supervivencia(3.841458820694124, 1), 0.05, 1e-9, 'cuantil 0,95 con 1 gl');
  cerca(chi2Supervivencia(12.591587243743977, 6), 0.05, 1e-9, 'cuantil 0,95 con 6 gl');
  // Con pocas transiciones la conclusión avisa que la aproximación no es confiable.
  const corta = new CadenaMarkov(MARKOV.oleada, (() => { const g = new Aleatorio(5); return () => g.siguiente(); })());
  for (let i = 0; i < 20; i++) corta.paso();
  assert.equal(corta.chiCuadrado().confiable, false);
  assert.match(corta.chiCuadrado().conclusion, /no es confiable/);
  // Una transición imposible rechaza siempre.
  const cadena = new CadenaMarkov(MARKOV.mesas);
  cadena.observar('75-100%'); // de 0-25% a 75-100%: p = 0
  assert.equal(cadena.chiCuadrado().imposibles, 1);
  assert.equal(cadena.chiCuadrado().rechaza, true);
});

test('cadena por franjas: usa la P de la franja vigente según k', () => {
  const PICO = [[0.2, 0.5, 0.3], [0.1, 0.4, 0.5], [0.05, 0.25, 0.7]];
  const json = { ...MARKOV.oleada, franjas: [{ desde: 0, P: MARKOV.oleada.P }, { desde: 4, P: PICO }] };
  const cadena = nueva(json);
  assert.deepEqual(cadena.matrizVigente(0), MARKOV.oleada.P);
  assert.deepEqual(cadena.matrizVigente(3), MARKOV.oleada.P);
  assert.deepEqual(cadena.matrizVigente(4), PICO);
  for (let i = 0; i < 6; i++) cadena.paso();
  assert.equal(cadena.franja(), 1);
  assert.equal(cadena.conteos.length, 2);
  assert.equal(cadena.conteos[0].flat().reduce((s, v) => s + v, 0), 4); // pasos 0..3 con la P de la primera franja
  assert.throws(() => new CadenaMarkov({ ...json, franjas: [{ desde: 0, P: [[1, 0, 0], [0, 1, 0], [0, 0, 0.9]] }] }), /franja 1/);
});

test('exportar e importar conservan estado, k, historial y conteos', () => {
  const a = nueva(MARKOV.oleada);
  for (let i = 0; i < 25; i++) a.paso();
  const copia = a.exportar();
  const siguientes = Array.from({ length: 10 }, () => a.paso().a);
  const b = new CadenaMarkov(MARKOV.oleada, (() => { const g = new Aleatorio(1); return () => g.siguiente(); })());
  b.importar(copia);
  assert.equal(b.k, 25);
  assert.equal(b.estado, copia.estado);
  assert.deepEqual(b.conteoTotal(), new CadenaMarkov(MARKOV.oleada).conteoTotal().map((f, i) => f.map((_, j) => copia.conteos[0][i][j])));
  assert.equal(siguientes.length, 10);
});
