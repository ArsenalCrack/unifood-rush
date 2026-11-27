// Fase 2: la red de Petri que se ve en el juego (tecla R) es la de PIPE2 escalada:
// mismas posiciones relativas que modelos/petri/*.xml y un arco por cada entrada no
// nula de Pre y de Post, con su peso. Así como el grafo del HUD de máquina es el de JFLAP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { geometriaRed } from '../src/arte/geometriaRed.js';
import { MODELOS } from '../src/sed/modelos/index.js';

const AREA = { x: 12, y: 114, w: 380, h: 266 }; // el área del panel de la red

function posicionesPIPE(texto) {
  const nodos = texto.matchAll(/<(?:place|transition) id="([^"]+)">\s*<graphics><position x="([\d.]+)" y="([\d.]+)"\/>/g);
  return new Map([...nodos].map((m) => [m[1], [Number(m[2]), Number(m[3])]]));
}

for (const [archivo, json] of [['ficha_M0.xml', MODELOS.comedor], ['monitor_M0.xml', MODELOS.comedorMonitor]]) {
  test(`la red en vivo tiene la distribución de PIPE2 (${archivo})`, () => {
    const texto = readFileSync(new URL(`../modelos/petri/${archivo}`, import.meta.url), 'utf8');
    const pipe = posicionesPIPE(texto);
    const geo = geometriaRed(json, AREA);
    const nodos = [...geo.lugares, ...geo.transiciones];
    assert.equal(nodos.length, pipe.size);
    // En cada eje, coordenada del juego = a + b · coordenada de PIPE2, con b > 0.
    for (const eje of [0, 1]) {
      const pares = nodos.map((n) => [pipe.get(n.nombre)[eje], eje === 0 ? n.x : n.y]);
      const menor = pares.reduce((m, p) => (p[0] < m[0] ? p : m));
      const mayor = pares.reduce((m, p) => (p[0] > m[0] ? p : m));
      const escala = (mayor[1] - menor[1]) / (mayor[0] - menor[0]);
      assert.ok(escala > 0, `eje ${eje}`);
      for (const [dePIPE, delJuego] of pares) assert.ok(Math.abs(delJuego - (menor[1] + escala * (dePIPE - menor[0]))) < 1e-9);
    }
    for (const n of nodos) {
      assert.ok(n.x > AREA.x && n.x < AREA.x + AREA.w && n.y > AREA.y && n.y < AREA.y + AREA.h, `${n.nombre} cabe en el panel`);
    }
  });

  test(`la red en vivo dibuja los mismos arcos y pesos que PIPE2 (${archivo})`, () => {
    const texto = readFileSync(new URL(`../modelos/petri/${archivo}`, import.meta.url), 'utf8');
    const arcosPIPE = [...texto.matchAll(/<arc id="[^"]+" source="([^"]+)" target="([^"]+)">[\s\S]*?<value>Default,(\d+)<\/value>/g)]
      .map((m) => `${m[1]}>${m[2]}:${m[3]}`);
    const geo = geometriaRed(json, AREA);
    assert.deepEqual(geo.arcos.map((a) => `${a.de}>${a.a}:${a.peso}`), arcosPIPE);
    // Los monitores (solo en la red supervisada) y los lugares con eventos externos.
    assert.deepEqual(geo.lugares.filter((l) => l.monitor).map((l) => l.nombre),
      archivo.startsWith('monitor') ? ['Minimo_lavado', 'Minimo_linea'] : []);
    assert.deepEqual(geo.lugares.filter((l) => l.externo).map((l) => l.nombre), ['En_fila', 'Relevo']);
  });
}
