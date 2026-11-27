// Escribe la Workflow Net normativa del Event Log (docs/log.md, sección 5):
//   analisis/modelo_normativo.pnml      PNML estándar con marcado final (PM4Py, WoPeD)
//   analisis/modelo_normativo_pipe.xml  la misma red en el dialecto de PIPE2 4.3
// Un lugar inicial, un lugar final y una transición por actividad, etiquetada con el
// nombre exacto del log, en el orden normativo del autómata Estudiante de la Fase 1.
// Uso: npm run normativo

import { writeFileSync } from 'node:fs';
import { ACTIVIDADES } from '../src/telemetria/registrador.js';

const lugares = ['i', ...ACTIVIDADES.slice(0, -1).map((_, k) => `p${k + 1}`), 'o'];
const x = (k) => 60 + k * 130;
const Y_LUGAR = 120;
const Y_TRANSICION = 120;

const pnml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!--UniFood Rush: modelo normativo del caso Estudiante (Workflow Net). Generado por scripts/modelo-normativo.mjs.-->',
  '<pnml xmlns="http://www.pnml.org/version-2009/grammar/pnml">',
  '  <net id="UniFood_normativo" type="http://www.pnml.org/version-2009/grammar/ptnet">',
  '    <name><text>UniFood_normativo</text></name>',
  '    <page id="pagina1">',
  ...lugares.map((p, k) => [
    `      <place id="${p}">`,
    `        <name><text>${p}</text></name>`,
    p === 'i' ? '        <initialMarking><text>1</text></initialMarking>' : null,
    `        <graphics><position x="${x(k * 2)}" y="${Y_LUGAR}"/></graphics>`,
    '      </place>'
  ].filter(Boolean).join('\n')),
  ...ACTIVIDADES.map((a, k) => [
    `      <transition id="t${k + 1}">`,
    `        <name><text>${a}</text></name>`,
    `        <graphics><position x="${x(k * 2 + 1)}" y="${Y_TRANSICION}"/></graphics>`,
    '      </transition>'
  ].join('\n')),
  ...ACTIVIDADES.flatMap((a, k) => [
    `      <arc id="a${2 * k + 1}" source="${lugares[k]}" target="t${k + 1}"/>`,
    `      <arc id="a${2 * k + 2}" source="t${k + 1}" target="${lugares[k + 1]}"/>`
  ]),
  '    </page>',
  '    <finalmarkings>',
  '      <marking>',
  '        <place idref="o"><text>1</text></place>',
  '      </marking>',
  '    </finalmarkings>',
  '  </net>',
  '</pnml>',
  ''
].join('\n');

// Dialecto de PIPE2 4.3 (el mismo de modelos/petri/*.xml).
const pipe = [
  '<?xml version="1.0" encoding="ISO-8859-1"?><pnml>',
  '<!--UniFood Rush: modelo normativo del caso Estudiante (Workflow Net). Generado por scripts/modelo-normativo.mjs.-->',
  '<net id="Net-One" type="P/T net">',
  '<token id="Default" enabled="true" red="0" green="0" blue="0"/>',
  ...lugares.map((p, k) => `<place id="${p}"><graphics><position x="${x(k * 2)}" y="${Y_LUGAR}"/></graphics><name><value>${p}</value><graphics><offset x="0" y="0"/></graphics></name><initialMarking><value>Default,${p === 'i' ? 1 : 0}</value><graphics><offset x="0" y="0"/></graphics></initialMarking><capacity><value>0</value></capacity></place>`),
  ...ACTIVIDADES.map((a, k) => `<transition id="${a}"><graphics><position x="${x(k * 2 + 1)}" y="${Y_TRANSICION}"/></graphics><name><value>${a}</value><graphics><offset x="-5" y="35"/></graphics></name><orientation><value>0</value></orientation><rate><value>1.0</value></rate><timed><value>false</value></timed><infiniteServer><value>false</value></infiniteServer><priority><value>1</value></priority></transition>`),
  ...ACTIVIDADES.flatMap((a, k) => [
    `<arc id="${lugares[k]} to ${a}" source="${lugares[k]}" target="${a}"><graphics/><inscription><value>Default,1</value><graphics/></inscription><tagged><value>false</value></tagged><arcpath id="000" x="${x(k * 2) + 11}" y="${Y_LUGAR + 11}" curvePoint="false"/><arcpath id="001" x="${x(k * 2 + 1) + 1}" y="${Y_TRANSICION + 11}" curvePoint="false"/><type value="normal"/></arc>`,
    `<arc id="${a} to ${lugares[k + 1]}" source="${a}" target="${lugares[k + 1]}"><graphics/><inscription><value>Default,1</value><graphics/></inscription><tagged><value>false</value></tagged><arcpath id="000" x="${x(k * 2 + 1) + 11}" y="${Y_TRANSICION + 11}" curvePoint="false"/><arcpath id="001" x="${x(k * 2 + 2) - 1}" y="${Y_LUGAR + 11}" curvePoint="false"/><type value="normal"/></arc>`
  ]),
  '</net>',
  '</pnml>',
  ''
].join('\n');

writeFileSync('analisis/modelo_normativo.pnml', pnml);
writeFileSync('analisis/modelo_normativo_pipe.xml', pipe);
console.log(`Workflow Net normativa: ${lugares.length} lugares, ${ACTIVIDADES.length} transiciones (${ACTIVIDADES.join(' → ')})`);
console.log('  analisis/modelo_normativo.pnml y analisis/modelo_normativo_pipe.xml');
