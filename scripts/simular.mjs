// Corre turnos completos del comedor sin Phaser (solo el núcleo y el motor).
// Sirve para revisar el balance del GDD y para las pruebas automáticas.
// Uso: node scripts/simular.mjs            (tabla de los 3 turnos y 4 políticas)
//      node scripts/simular.mjs --eventos  (además, tiempos de los bloqueos de torniquete)

import { pathToFileURL } from 'node:url';
import { Comedor } from '../src/simulacion/comedor.js';
import { TURNOS, SEMILLA } from '../src/config.js';

// Políticas de relevo del "jugador" simulado:
//   prudente:    deja 2 en línea y 2 en lavado todo el turno.
//   pico:        pasa 1 persona a la línea en el primer relevo y la devuelve en el segundo.
//   todo_linea:  pasa todo el personal a la línea al empezar (deadlock de la ficha).
//   todo_lavado: pasa todo el personal al lavado al empezar (bloqueo simétrico).
export function correrTurno({
  turno = TURNOS[0], semilla = SEMILLA, monitor = true, politica = 'prudente',
  piloto = true, demoraReparacion = 6, palabra = 'RS1S2K', paso = 0.1
} = {}) {
  const comedor = new Comedor({ turno, semilla, monitor, piloto });
  const eventos = [];
  comedor.on('*', (e) => eventos.push({ t: Number(comedor.reloj.tiempo.toFixed(2)), ...e }));
  comedor.iniciar();

  if (politica === 'todo_linea') { comedor.solicitarDisparo('t_a_linea'); comedor.solicitarDisparo('t_a_linea'); }
  if (politica === 'todo_lavado') { comedor.solicitarDisparo('t_a_lavado'); comedor.solicitarDisparo('t_a_lavado'); }

  const bloqueadoDesde = [null, null];
  let maxFila = 0;
  let relevosPico = 0;
  while (!comedor.terminado && !comedor.gameOver && comedor.reloj.tiempo < 3600) {
    comedor.avanzar(paso);
    const t = comedor.reloj.tiempo;
    // El jugador simulado repara un torniquete "demoraReparacion" segundos después del bloqueo.
    comedor.lineas.forEach((linea, i) => {
      if (!linea.torniquete.puede('reiniciar')) { bloqueadoDesde[i] = null; return; }
      if (bloqueadoDesde[i] === null) bloqueadoDesde[i] = t;
      else if (t - bloqueadoDesde[i] >= demoraReparacion) { comedor.enviarReparacion(linea.id, palabra); bloqueadoDesde[i] = null; }
    });
    if (politica === 'pico') {
      if (relevosPico === 0 && t >= 120 && comedor.solicitarDisparo('t_a_linea').ok) relevosPico = 1;
      if (relevosPico === 1 && t >= 240 && comedor.solicitarDisparo('t_a_lavado').ok) relevosPico = 2;
    }
    maxFila = Math.max(maxFila, comedor.red.tokens('En_fila'));
  }
  return { comedor, eventos, maxFila, resumen: comedor.resumen, gameOver: comedor.gameOver };
}

function fila(turno, monitor, politica) {
  const r = correrTurno({ turno, monitor, politica });
  const s = r.comedor.stats;
  const fin = r.gameOver ? `DEADLOCK t=${r.gameOver.tiempo.toFixed(0)}s` : `fin t=${r.comedor.reloj.tiempo.toFixed(0)}s`;
  return `T${turno.id} ${monitor ? 'monitor' : 'libre  '} ${politica.padEnd(11)} | ${fin.padEnd(17)} | Salida ${String(s.completados).padStart(3)}/${turno.estudiantes}`
    + ` | puntos ${String(r.comedor.puntaje).padStart(5)} | fila máx ${String(r.maxFila).padStart(2)} | desbordes ${String(s.desbordes).padStart(2)}`
    + ` | bloqueos torniquete ${s.bloqueos} | lavados ${String(s.lavados).padStart(2)} | radar ${r.comedor.radar.estado}`;
}

// Solo al ejecutarlo directamente (no al importarlo desde las pruebas).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const turno of TURNOS) {
    console.log(fila(turno, true, 'prudente'));
    console.log(fila(turno, true, 'pico'));
    console.log(fila(turno, false, 'prudente'));
    console.log(fila(turno, false, 'todo_linea'));
    console.log(fila(turno, false, 'todo_lavado'));
  }
  if (process.argv.includes('--eventos')) {
    for (const turno of TURNOS) {
      const r = correrTurno({ turno, monitor: true });
      const bloqueos = r.eventos.filter((e) => e.tipo === 'torniquete' && e.evento === 'bloqueo');
      console.log(`Turno ${turno.id}, semilla ${SEMILLA}: bloqueos de torniquete en`,
        bloqueos.map((e) => `T${e.linea}@${e.t}s`).join(', ') || 'ninguno');
    }
  }
}
