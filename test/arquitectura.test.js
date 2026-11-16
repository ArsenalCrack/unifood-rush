// Pruebas de arquitectura y de conformidad entre archivos: fallan si alguien
// rompe las reglas del laboratorio (núcleo sin motor de juego, Phaser por CDN,
// modelos de modelos/ iguales a los JSON del juego).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELOS } from '../src/sed/modelos/index.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (ruta) => readFileSync(join(RAIZ, ruta), 'utf8');
const archivosDe = (carpeta) => readdirSync(join(RAIZ, carpeta), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? archivosDe(join(carpeta, e.name)) : [join(carpeta, e.name)]);

test('el núcleo formal no menciona el motor de juego ni usa el DOM', () => {
  const nucleo = [...archivosDe('src/sed'), ...archivosDe('src/simulacion'), 'src/config.js'];
  assert.ok(nucleo.length >= 15);
  for (const archivo of nucleo) {
    const texto = leer(archivo);
    assert.equal(/phaser/i.test(texto), false, `${archivo} menciona el motor de juego`);
    assert.equal(/\b(window|document)\./.test(texto), false, `${archivo} usa el DOM`);
  }
});

test('Phaser 4.2.1 llega por CDN: no se importa ni se instala por npm', () => {
  for (const archivo of archivosDe('src')) {
    assert.equal(/from\s+['"]phaser['"]/.test(leer(archivo)), false, `${archivo} importa phaser`);
  }
  const paquete = JSON.parse(leer('package.json'));
  assert.equal('phaser' in { ...paquete.dependencies, ...paquete.devDependencies }, false);
  assert.equal(paquete.type, 'module');
  assert.equal(paquete.scripts.test, 'node --test');
  const html = leer('index.html');
  assert.match(html, /https:\/\/cdn\.jsdelivr\.net\/npm\/phaser@4\.2\.1\/dist\/phaser\.min\.js/);
  assert.match(html, /id="game-container"/);
  assert.match(html, /src="\.\/src\/main\.js"/);
  const vite = leer('vite.config.js');
  assert.match(vite, /base:\s*'\.\/'/);
  assert.match(vite, /external:\s*\['phaser'\]/);
});

test('las escenas no cambian estados ni recursos por su cuenta', () => {
  // En la vista nadie llama a ejecutar(σ), disparar(t) ni agregarTokens: solo el motor.
  const vista = [...archivosDe('src/escenas'), ...archivosDe('src/entidades'), ...archivosDe('src/arte'), ...archivosDe('src/entrada')];
  for (const archivo of vista) {
    const texto = leer(archivo);
    assert.equal(/\.(ejecutar|disparar|agregarTokens|fijarMarcado)\(/.test(texto), false, `${archivo} cambia el modelo directamente`);
    assert.equal(/\.estado\s*=[^=]/.test(texto), false, `${archivo} asigna un estado`);
  }
});

// Cuenta estados, estado inicial, finales y transiciones de un archivo .jff.
function leerJff(ruta) {
  const texto = leer(ruta);
  const estados = [...texto.matchAll(/<state id="\d+" name="([^"]+)">([\s\S]*?)<\/state>/g)];
  return {
    estados: estados.map((m) => m[1]),
    inicial: estados.filter((m) => m[2].includes('<initial/>')).map((m) => m[1]),
    finales: estados.filter((m) => m[2].includes('<final/>')).map((m) => m[1]),
    transiciones: [...texto.matchAll(/<transition>/g)].length
  };
}

test('los .jff de modelos/automatas/ coinciden con los JSON del juego', () => {
  const pares = [
    ['estudiante.jff', MODELOS.estudiante], ['torniquete.jff', MODELOS.torniquete],
    ['contador_rechazos.jff', MODELOS.contadorRechazos], ['registro_acceso.jff', MODELOS.registroAcceso],
    ['reparacion_dfa.jff', MODELOS.reparacion.dfa]
  ];
  for (const [archivo, json] of pares) {
    const jff = leerJff(`modelos/automatas/${archivo}`);
    assert.deepEqual(jff.estados, json.estados, archivo);
    assert.deepEqual(jff.inicial, [json.inicial], archivo);
    assert.deepEqual(jff.finales, json.marcados, archivo);
    assert.equal(jff.transiciones, json.transiciones.length, archivo);
  }
  assert.match(leer('modelos/automatas/reparacion_regex.jff'), /<expression>RS\(1\+2\+3\)S\(1\+2\+3\)\(S\(1\+2\+3\)\)\*K<\/expression>/);
  assert.equal(leerJff('modelos/automatas/composicion_estudiante_torniquete.jff').estados.length, 30);
  assert.equal(leerJff('modelos/automatas/composicion_torniquete_contador.jff').estados.length, 11);
  assert.equal(leerJff('modelos/automatas/planta_con_especificacion.jff').estados.length, 59);
  assert.equal(leerJff('modelos/automatas/supervisor.jff').estados.length, 34);
});

test('las redes de modelos/petri/ coinciden con los JSON del juego', () => {
  for (const [archivo, json] of [['ficha_M0.xml', MODELOS.comedor], ['monitor_M0.xml', MODELOS.comedorMonitor]]) {
    const texto = leer(`modelos/petri/${archivo}`);
    const lugares = [...texto.matchAll(/<place id="([^"]+)">[\s\S]*?<initialMarking><value>Default,(\d+)<\/value>/g)];
    assert.deepEqual(lugares.map((m) => m[1]), json.lugares.map((l) => l.nombre), archivo);
    assert.deepEqual(lugares.map((m) => Number(m[2])), json.lugares.map((l) => l.m0), archivo);
    assert.deepEqual([...texto.matchAll(/<transition id="([^"]+)">/g)].map((m) => m[1]), json.transiciones.map((t) => t.nombre), archivo);
    // Un arco por cada entrada no nula de Pre y de Post, con su peso.
    const arcos = [...texto.matchAll(/<arc id="[^"]+" source="([^"]+)" target="([^"]+)">[\s\S]*?<value>Default,(\d+)<\/value>/g)];
    const esperados = [];
    json.transiciones.forEach((t, ti) => json.lugares.forEach((l, pi) => {
      if (json.pre[ti][pi] > 0) esperados.push(`${l.nombre}>${t.nombre}:${json.pre[ti][pi]}`);
      if (json.post[ti][pi] > 0) esperados.push(`${t.nombre}>${l.nombre}:${json.post[ti][pi]}`);
    }));
    assert.deepEqual(arcos.map((m) => `${m[1]}>${m[2]}:${m[3]}`), esperados, archivo);
  }
});
