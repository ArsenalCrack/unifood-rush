// Genera los archivos de modelos/ para el software académico a partir de los
// JSON de src/sed/modelos/ (una sola fuente de verdad):
//   modelos/automatas/*.jff  -> JFLAP 7.1 (autómatas y expresión regular)
//   modelos/petri/*.xml      -> PIPE2 (dialecto PNML de PIPE 4.3)
//   modelos/petri/*.pnml     -> PNML estándar (WoPeD y otros editores)
// Uso: npm run modelos

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELOS } from '../src/sed/modelos/index.js';
import { componer, componerVarios } from '../src/sed/composicion.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', 'modelos');
const escribir = (ruta, texto) => {
  mkdirSync(dirname(join(RAIZ, ruta)), { recursive: true });
  writeFileSync(join(RAIZ, ruta), texto, 'utf8');
  console.log('  modelos/' + ruta);
};
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- JFLAP ----------

// Autómata finito en formato .jff. Los eventos se escriben con su código de una letra.
function aJff(g, posicion) {
  const codigo = new Map(g.eventos.map((e) => [e.id, e.codigo]));
  const id = new Map(g.estados.map((q, i) => [q, i]));
  const estados = g.estados.map((q, i) => {
    const [x, y] = posicion(q, i);
    return `\t\t<state id="${i}" name="${xml(q)}">\n\t\t\t<x>${x.toFixed(1)}</x>\n\t\t\t<y>${y.toFixed(1)}</y>\n`
      + (q === g.inicial ? '\t\t\t<initial/>\n' : '') + (g.marcados.includes(q) ? '\t\t\t<final/>\n' : '') + '\t\t</state>';
  });
  const transiciones = g.transiciones.map(([origen, evento, destino]) =>
    `\t\t<transition>\n\t\t\t<from>${id.get(origen)}</from>\n\t\t\t<to>${id.get(destino)}</to>\n\t\t\t<read>${xml(codigo.get(evento))}</read>\n\t\t</transition>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!--UniFood Rush: ${xml(g.nombre)}. Generado desde src/sed/modelos/.-->\n<structure>\n\t<type>fa</type>\n\t<automaton>\n`
    + `\t\t<!--The list of states.-->\n${estados.join('\n')}\n\t\t<!--The list of transitions.-->\n${transiciones.join('\n')}\n\t</automaton>\n</structure>\n`;
}

const deJson = (g) => (q) => g.posiciones[q];
// Los productos se dibujan en rejilla: una fila por estado del primer componente.
const enRejilla = (g, columnas) => (q, i) => [90 + 170 * (i % columnas), 80 + 120 * Math.floor(i / columnas)];

console.log('Autómatas para JFLAP:');
escribir('automatas/estudiante.jff', aJff(MODELOS.estudiante, deJson(MODELOS.estudiante)));
escribir('automatas/torniquete.jff', aJff(MODELOS.torniquete, deJson(MODELOS.torniquete)));
escribir('automatas/contador_rechazos.jff', aJff(MODELOS.contadorRechazos, deJson(MODELOS.contadorRechazos)));
escribir('automatas/registro_acceso.jff', aJff(MODELOS.registroAcceso, deJson(MODELOS.registroAcceso)));
escribir('automatas/reparacion_dfa.jff', aJff(MODELOS.reparacion.dfa, deJson(MODELOS.reparacion.dfa)));
escribir('automatas/reparacion_regex.jff',
  `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!--UniFood Rush: ^R(S[1-3]){2,}K$ en la notación de JFLAP (unión con +).-->\n<structure>\n\t<type>re</type>\n\t<!--There is only one expression in a regular expression file.-->\n\t<expression>${xml(MODELOS.reparacion.expresionJflap)}</expression>\n</structure>\n`);

const estTor = componer(MODELOS.estudiante, MODELOS.torniquete);
const torCont = componer(MODELOS.torniquete, MODELOS.contadorRechazos);
const planta = componerVarios([MODELOS.estudiante, MODELOS.torniquete, MODELOS.registroAcceso]);
escribir('automatas/composicion_estudiante_torniquete.jff', aJff(estTor, enRejilla(estTor, 5)));
escribir('automatas/composicion_torniquete_contador.jff', aJff(torCont, enRejilla(torCont, 4)));
// Supervisor: la planta con la especificación, sin los estados prohibidos (Violacion).
const buenos = planta.estados.filter((q) => planta.tuplas[q][2] !== 'Violacion');
const supervisado = {
  ...planta, nombre: 'Supervisor = (Estudiante ‖ Torniquete ‖ Registro_Acceso) sin Violacion',
  estados: buenos, marcados: planta.marcados.filter((q) => buenos.includes(q)),
  transiciones: planta.transiciones.filter(([o, , d]) => buenos.includes(o) && buenos.includes(d))
};
escribir('automatas/planta_con_especificacion.jff', aJff(planta, enRejilla(planta, 8)));
escribir('automatas/supervisor.jff', aJff(supervisado, enRejilla(supervisado, 6)));

// ---------- Redes de Petri ----------

const marcadoDe = (json, cambios) => json.lugares.map((l) => cambios[l.nombre] ?? l.m0);

// Dialecto de PIPE 4.3 (el que guarda "PIPE2").
function aPipe(json, marcado, titulo) {
  const lugares = json.lugares.map((l, i) => `<place id="${l.nombre}">\n<graphics><position x="${l.pos[0]}.0" y="${l.pos[1]}.0"/></graphics>\n`
    + `<name><value>${l.nombre}</value><graphics><offset x="-5.0" y="35.0"/></graphics></name>\n`
    + `<initialMarking><value>Default,${marcado[i]}</value><graphics><offset x="0.0" y="0.0"/></graphics></initialMarking>\n`
    + `<capacity><value>${l.capacidad === 'estricta' ? l.k : 0}</value></capacity>\n</place>`);
  const transiciones = json.transiciones.map((t) => `<transition id="${t.nombre}">\n<graphics><position x="${t.pos[0]}.0" y="${t.pos[1]}.0"/></graphics>\n`
    + `<name><value>${t.nombre}</value><graphics><offset x="-5.0" y="35.0"/></graphics></name>\n<orientation><value>0</value></orientation>\n`
    + '<rate><value>1.0</value></rate>\n<timed><value>false</value></timed>\n<infiniteServer><value>false</value></infiniteServer>\n<priority><value>1</value></priority>\n</transition>');
  const arcos = [];
  const arco = (origen, destino, peso, p1, p2) => arcos.push(`<arc id="${origen} to ${destino}" source="${origen}" target="${destino}">\n<graphics/>\n`
    + `<inscription><value>Default,${peso}</value><graphics/></inscription>\n<tagged><value>false</value></tagged>\n`
    + `<arcpath id="000" x="${p1[0] + 12}" y="${p1[1] + 12}" curvePoint="false"/>\n<arcpath id="001" x="${p2[0] + 12}" y="${p2[1] + 12}" curvePoint="false"/>\n<type value="normal"/>\n</arc>`);
  json.transiciones.forEach((t, ti) => json.lugares.forEach((l, pi) => {
    if (json.pre[ti][pi] > 0) arco(l.nombre, t.nombre, json.pre[ti][pi], l.pos, t.pos);
    if (json.post[ti][pi] > 0) arco(t.nombre, l.nombre, json.post[ti][pi], t.pos, l.pos);
  }));
  return `<?xml version="1.0" encoding="ISO-8859-1"?><pnml>\n<!--UniFood Rush: ${titulo}. Generado desde src/sed/modelos/.-->\n<net id="Net-One" type="P/T net">\n`
    + `<token id="Default" enabled="true" red="0" green="0" blue="0"/>\n${lugares.join('\n')}\n${transiciones.join('\n')}\n${arcos.join('\n')}\n</net>\n</pnml>\n`;
}

// PNML estándar (ISO/IEC 15909-2, red lugar/transición).
function aPnml(json, marcado, titulo) {
  const lugares = json.lugares.map((l, i) => `      <place id="${l.nombre}">\n        <name><text>${l.nombre}</text></name>\n`
    + (marcado[i] > 0 ? `        <initialMarking><text>${marcado[i]}</text></initialMarking>\n` : '')
    + `        <graphics><position x="${l.pos[0]}" y="${l.pos[1]}"/></graphics>\n      </place>`);
  const transiciones = json.transiciones.map((t) => `      <transition id="${t.nombre}">\n        <name><text>${t.nombre}</text></name>\n`
    + `        <graphics><position x="${t.pos[0]}" y="${t.pos[1]}"/></graphics>\n      </transition>`);
  const arcos = [];
  json.transiciones.forEach((t, ti) => json.lugares.forEach((l, pi) => {
    const uno = (origen, destino, peso) => arcos.push(`      <arc id="a${arcos.length + 1}" source="${origen}" target="${destino}">`
      + `<inscription><text>${peso}</text></inscription></arc>`);
    if (json.pre[ti][pi] > 0) uno(l.nombre, t.nombre, json.pre[ti][pi]);
    if (json.post[ti][pi] > 0) uno(t.nombre, l.nombre, json.post[ti][pi]);
  }));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--UniFood Rush: ${titulo}. Generado desde src/sed/modelos/.-->\n<pnml xmlns="http://www.pnml.org/version-2009/grammar/pnml">\n`
    + `  <net id="${json.nombre}" type="http://www.pnml.org/version-2009/grammar/ptnet">\n    <name><text>${json.nombre}</text></name>\n    <page id="pagina1">\n`
    + `${lugares.join('\n')}\n${transiciones.join('\n')}\n${arcos.join('\n')}\n    </page>\n  </net>\n</pnml>\n`;
}

// Marcado a 3 disparos del deadlock de la ficha (radar en amarillo).
const AMARILLO = {
  En_fila: 1, Bandeja_limpia: 1, Personal_linea: 4, Con_bandeja: 0, Mesa_libre: 0, Almorzando: 20,
  Espacio_carro: 1, Bandeja_sucia: 9, Salida: 9, Personal_lavado: 0, Relevo: 0
};
const ESCENARIOS = [
  ['ficha_M0', MODELOS.comedor, {}, 'red de la ficha con el M0 del juego'],
  ['monitor_M0', MODELOS.comedorMonitor, {}, 'red con monitores y el M0 del juego'],
  ['ficha_escenarioA', MODELOS.comedor, { En_fila: 3, Relevo: 0 }, 'escenario A: 3 estudiantes, sin relevo'],
  ['ficha_escenarioB', MODELOS.comedor, { En_fila: 2 }, 'escenario B: 2 estudiantes y 2 permisos de relevo'],
  ['monitor_escenarioB', MODELOS.comedorMonitor, { En_fila: 2 }, 'escenario B con monitores'],
  ['ficha_escenarioC', MODELOS.comedor, AMARILLO, 'escenario C: a 3 disparos del deadlock de la ficha'],
  ['monitor_escenarioC', MODELOS.comedorMonitor, { ...AMARILLO, Personal_linea: 3, Personal_lavado: 1, Minimo_lavado: 0, Minimo_linea: 2 }, 'escenario C con monitores (personal 3/1)'],
  ['ficha_deadlock30', MODELOS.comedor, { En_fila: 30 }, '30 estudiantes en fila para la secuencia de 72 disparos del deadlock']
];

console.log('Redes de Petri para PIPE2 (.xml) y PNML estándar (.pnml):');
for (const [nombre, json, cambios, titulo] of ESCENARIOS) {
  const marcado = marcadoDe(json, cambios);
  escribir(`petri/${nombre}.xml`, aPipe(json, marcado, titulo));
  if (nombre.endsWith('_M0')) escribir(`petri/${nombre}.pnml`, aPnml(json, marcado, titulo));
}
