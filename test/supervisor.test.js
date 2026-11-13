// Pruebas del supervisor por composición síncrona (ficha D.13):
// servir se deshabilita si el torniquete no registró acceso_ok para ese estudiante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Automata } from '../src/sed/automata.js';
import { componerVarios, supervisor } from '../src/sed/composicion.js';
import { Aleatorio } from '../src/sed/aleatorio.js';
import { MODELOS } from '../src/sed/modelos/index.js';
import { Comedor } from '../src/simulacion/comedor.js';
import { RAZON_SUPERVISOR } from '../src/simulacion/flujo.js';
import { TURNOS } from '../src/config.js';

const PLANTA = [MODELOS.estudiante, MODELOS.torniquete, MODELOS.registroAcceso];
const esProhibido = (tupla) => tupla[2] === 'Violacion';

test('supervisor: estados prohibidos, estados buenos y eventos deshabilitados', () => {
  const g = componerVarios(PLANTA);
  const s = supervisor(g, esProhibido, RAZON_SUPERVISOR);
  assert.equal(g.estados.length, 59);
  assert.equal(s.prohibidos.size, 25);
  assert.equal(s.malos.size, 25);       // ningún estado llega a Violacion por un evento no controlable
  assert.equal(s.numEstadosBuenos, 34);
  assert.equal(s.existe, true);
  const conDeshabilitados = [...s.deshabilitados].filter(([, lista]) => lista.length > 0);
  assert.deepEqual(conDeshabilitados.map(([estado]) => estado).sort(), [
    'En_Fila|Bloqueado|Sin_acceso', 'En_Fila|Leyendo|Sin_acceso', 'En_Fila|Listo|Sin_acceso', 'En_Fila|Rechazo|Sin_acceso'
  ]);
  for (const [, lista] of conDeshabilitados) assert.deepEqual(lista.map((d) => d.evento), ['servir']);
  assert.equal(s.permite('En_Fila|Leyendo|Sin_acceso', 'servir'), false);
  assert.equal(s.razonDe('En_Fila|Leyendo|Sin_acceso', 'servir'), RAZON_SUPERVISOR);
  assert.equal(s.permite('En_Fila|Acceso|Con_acceso', 'servir'), true);
});

test('10 000 eventos aleatorios bajo supervisión nunca entran a un estado prohibido', () => {
  const json = componerVarios(PLANTA, { completo: true });
  const s = supervisor(json, esProhibido, RAZON_SUPERVISOR);
  const azar = new Aleatorio(96);
  let g = new Automata(json);
  let intentosBloqueados = 0;
  let servidos = 0;
  for (let i = 0; i < 10000; i++) {
    if (i % 60 === 0) g = new Automata(json);        // llega un estudiante nuevo
    const evento = azar.elegir(g.eventosActivos());   // la planta propone cualquier evento posible
    if (!s.permite(g.estado, evento)) { intentosBloqueados++; continue; } // el supervisor lo impide
    g.ejecutar(evento);
    if (evento === 'servir') servidos++;
    assert.equal(s.prohibidos.has(g.estado), false, `estado prohibido ${g.estado}`);
    assert.equal(s.malos.has(g.estado), false);
  }
  assert.ok(intentosBloqueados > 0, 'la prueba debe incluir intentos bloqueados');
  assert.ok(servidos > 0, 'la prueba debe incluir servir permitidos');
});

test('el algoritmo retrocede por eventos no controlables y evita el bloqueo', () => {
  // A --c1--> B --u--> MALO : B es malo porque u no es controlable; c1 se deshabilita en A.
  // A --c2--> C (callejón sin salida, no marcado): c2 se deshabilita para no bloquear.
  const g = {
    nombre: 'Ejemplo', estados: ['A', 'B', 'C', 'MALO', 'FIN'], inicial: 'A', marcados: ['FIN'],
    eventos: [
      { id: 'c1', codigo: '1', controlable: true }, { id: 'c2', codigo: '2', controlable: true },
      { id: 'c3', codigo: '3', controlable: true }, { id: 'u', codigo: 'u', controlable: false }
    ],
    transiciones: [['A', 'c1', 'B'], ['B', 'u', 'MALO'], ['A', 'c2', 'C'], ['A', 'c3', 'FIN']]
  };
  const s = supervisor(g, ['MALO']);
  assert.deepEqual([...s.malos].sort(), ['B', 'C', 'MALO']);
  assert.deepEqual(s.deshabilitados.get('A').map((d) => d.evento).sort(), ['c1', 'c2']);
  assert.equal(s.permite('A', 'c3'), true);
});

test('en el juego: insistir en servir sin acceso_ok no se ejecuta y descuenta puntos', () => {
  const comedor = new Comedor({ turno: TURNOS[0], monitor: true, piloto: false });
  comedor.iniciar();
  while (comedor.red.tokens('En_fila') === 0) comedor.avanzar(0.05); // llega el primer estudiante
  const cabeza = comedor.cabeza(1) ?? comedor.cabeza(2);
  // Intento 1: el torniquete aún no ha registrado acceso_ok.
  const r1 = comedor.solicitarEvento(cabeza.id, 'servir');
  assert.equal(r1.ok, false);
  assert.equal(r1.motivo, 'supervisor');
  assert.equal(r1.razon, RAZON_SUPERVISOR);
  assert.equal(cabeza.automata.estado, 'En_Fila');
  assert.equal(comedor.stats.intentosBloqueados, 1);
  assert.equal(comedor.puntaje, -5);
  assert.equal(comedor.red.tokens('Bandeja_limpia'), 30); // ningún recurso se consumió
  // Tras acceso_ok el mismo evento queda habilitado.
  while (cabeza.registro.estado !== 'Con_acceso') comedor.avanzar(0.05);
  assert.deepEqual(comedor.eventosDeshabilitados(cabeza), []);
  assert.equal(comedor.solicitarEvento(cabeza.id, 'servir').ok, true);
  assert.equal(cabeza.automata.estado, 'Recibiendo_Bandeja');
  assert.equal(comedor.red.tokens('Bandeja_limpia'), 29);
  // Los eventos no controlables no se pueden solicitar.
  assert.equal(comedor.solicitarEvento(cabeza.id, 'sentarse').motivo, 'no_controlable');
});

test('en el juego: un jugador que pulsa servir al azar nunca logra una Violacion', () => {
  const comedor = new Comedor({ turno: TURNOS[0], monitor: true, piloto: false });
  const azar = new Aleatorio(7);
  comedor.iniciar();
  while (!comedor.terminado && !comedor.gameOver && comedor.reloj.tiempo < 200) {
    comedor.avanzar(0.1);
    if (azar.ocurre(0.5)) comedor.servirLinea(azar.elegir([1, 2])); // insiste sin mirar el torniquete
    for (const linea of comedor.lineas) if (linea.torniquete.puede('reiniciar')) comedor.enviarReparacion(linea.id, 'RS1S2K');
    for (const est of comedor.estudiantes.values()) {
      assert.notEqual(est.registro.estado, 'Violacion');
      // Nadie pasa de En_Fila sin acceso registrado.
      if (est.automata.estado !== 'En_Fila') assert.equal(est.registro.estado, 'Con_acceso');
    }
  }
  assert.ok(comedor.stats.intentosBloqueados > 10);
  assert.ok(comedor.stats.servidos > 10);
});
