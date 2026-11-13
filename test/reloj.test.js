// Pruebas del reloj de simulación y del generador con semilla.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Reloj } from '../src/sed/reloj.js';
import { Aleatorio, mulberry32 } from '../src/sed/aleatorio.js';

test('tres eventos programados en desorden se disparan en orden de tiempo', () => {
  const reloj = new Reloj();
  const orden = [];
  reloj.programar(5, () => orden.push('c'));
  reloj.programar(1, () => orden.push('a'));
  reloj.programar(3, () => orden.push('b'));
  reloj.avanzar(10);
  assert.deepEqual(orden, ['a', 'b', 'c']);
  assert.equal(reloj.tiempo, 10);
});

test('el reloj salta al instante de cada evento y respeta el empate por orden de llegada', () => {
  const tiempos = [];
  const reloj = new Reloj((evento, r) => tiempos.push([evento.tipo, r.tiempo]));
  reloj.programar(2, { tipo: 'x' });
  reloj.programar(2, { tipo: 'y' });
  reloj.programar(0.5, { tipo: 'w' });
  reloj.avanzar(1);
  assert.deepEqual(tiempos, [['w', 0.5]]);
  reloj.avanzar(1);
  assert.deepEqual(tiempos, [['w', 0.5], ['x', 2], ['y', 2]]);
});

test('pausar detiene el reloj y la velocidad multiplica el avance', () => {
  const reloj = new Reloj();
  reloj.pausar();
  assert.equal(reloj.avanzar(5), 0);
  assert.equal(reloj.tiempo, 0);
  reloj.reanudar();
  reloj.cambiarVelocidad(4);
  reloj.avanzar(2);
  assert.equal(reloj.tiempo, 8);
  assert.throws(() => reloj.cambiarVelocidad(3));
});

test('un evento puede programar otro y cancelar funciona', () => {
  const reloj = new Reloj();
  const orden = [];
  reloj.programar(1, (r) => { orden.push('a'); r.programarEn(1, () => orden.push('b')); });
  const id = reloj.programar(1.5, () => orden.push('cancelado'));
  assert.equal(reloj.cancelar(id), true);
  reloj.avanzar(3);
  assert.deepEqual(orden, ['a', 'b']);
});

test('la misma semilla produce la misma secuencia aleatoria', () => {
  const a = new Aleatorio(96);
  const b = new Aleatorio(96);
  const c = new Aleatorio(97);
  const sa = Array.from({ length: 50 }, () => a.siguiente());
  const sb = Array.from({ length: 50 }, () => b.siguiente());
  const sc = Array.from({ length: 50 }, () => c.siguiente());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
  const f = mulberry32(96);
  assert.equal(f(), sa[0]);
});

test('exportar e importar el reloj conserva el calendario', () => {
  const vistos = [];
  const reloj = new Reloj((e) => vistos.push(e.tipo));
  reloj.programar(4, { tipo: 'tarde' });
  reloj.programar(2, { tipo: 'pronto' });
  const copia = reloj.exportar();
  reloj.avanzar(10);
  const otro = new Reloj((e) => vistos.push(`otro:${e.tipo}`));
  otro.importar(copia);
  otro.avanzar(10);
  assert.deepEqual(vistos, ['pronto', 'tarde', 'otro:pronto', 'otro:tarde']);
});
