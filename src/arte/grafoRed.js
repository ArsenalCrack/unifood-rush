// Dibuja una red de Petri a partir de su JSON (nunca a mano), como grafo.js con los
// autómatas: un círculo por lugar con sus tokens, una barra por transición y una
// flecha por cada arco de Pre y de Post, con el peso cuando es mayor que 1. Un lugar
// con arco de ida y de vuelta a la misma transición (t_servir con Personal_linea,
// t_lavar con Personal_lavado) lleva una flecha de dos puntas, como en PIPE2.
// La distribución es la de PIPE2 (geometriaRed.js).

import { PALETA, TEXTO, estilo, estiloMono } from './paleta.js';
import { geometriaRed } from './geometriaRed.js';

const BARRA = { w: 6, h: 20 };
const GRIS = 0x55606e;
const COLOR_ARCO = 0x8d97a8;
const AMARILLO = 0xffe066;
const FONDO = '#0f1524';

// Distancia del centro de un nodo a su borde en la dirección (ux, uy).
function borde(nodo, ux, uy, radio) {
  if (nodo.tipo === 'lugar') return radio;
  const ax = Math.abs(ux) > 1e-6 ? BARRA.w / 2 / Math.abs(ux) : Infinity;
  const ay = Math.abs(uy) > 1e-6 ? BARRA.h / 2 / Math.abs(uy) : Infinity;
  return Math.min(ax, ay);
}

function punta(g, x, y, ux, uy, color) {
  const nx = -uy;
  const ny = ux;
  g.fillStyle(color, 1);
  g.fillTriangle(x, y, x - ux * 8 + nx * 3.8, y - uy * 8 + ny * 3.8, x - ux * 8 - nx * 3.8, y - uy * 8 - ny * 3.8);
}

// Flecha de a hacia b recortada a los bordes de los nodos; con dosPuntas, también
// hacia a. Devuelve dónde poner el peso: al medio, un poco a un lado.
function flecha(g, a, b, radio, color, grosor, dosPuntas) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy) || 1;
  const ux = dx / largo;
  const uy = dy / largo;
  const x1 = a.x + ux * (borde(a, ux, uy, radio) + 1);
  const y1 = a.y + uy * (borde(a, ux, uy, radio) + 1);
  const x2 = b.x - ux * (borde(b, ux, uy, radio) + 1);
  const y2 = b.y - uy * (borde(b, ux, uy, radio) + 1);
  g.lineStyle(grosor, color, 1);
  g.lineBetween(dosPuntas ? x1 + ux * 6 : x1, dosPuntas ? y1 + uy * 6 : y1, x2 - ux * 6, y2 - uy * 6);
  punta(g, x2, y2, ux, uy, color);
  if (dosPuntas) punta(g, x1, y1, -ux, -uy, color);
  // Los dos lugares posibles del peso: al medio, a cada lado del arco.
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return [{ x: mx - uy * 8, y: my + ux * 8 }, { x: mx + uy * 8, y: my - ux * 8 }];
}

const seCruzan = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const caja = (texto) => texto.getBounds();

// area: { x, y, w, h }. Devuelve { geo, actualizar(M, habilitadas), parpadear(t), destruir() }.
export function crearGrafoRed(escena, json, area, opciones = {}) {
  const radio = opciones.radio ?? 10;
  const geo = geometriaRed(json, area);
  const objetos = [];
  const g = escena.add.graphics();
  objetos.push(g);

  // Arcos: un par de ida y vuelta se dibuja una sola vez, con dos puntas.
  const existe = new Set(geo.arcos.map((a) => `${a.tipo}:${a.lugar}:${a.transicion}`));
  const dibujados = new Set();
  const trazos = []; // para el destello del último disparo
  const pesos = [];
  for (const a of geo.arcos) {
    const par = `${a.lugar}:${a.transicion}`;
    const dosPuntas = existe.has(`pre:${par}`) && existe.has(`post:${par}`);
    if (dosPuntas && dibujados.has(par)) continue;
    dibujados.add(par);
    const lugar = geo.lugares[a.lugar];
    const transicion = geo.transiciones[a.transicion];
    const [desde, hasta] = a.tipo === 'pre' ? [lugar, transicion] : [transicion, lugar];
    const trazar = (lienzo, color, grosor) => flecha(lienzo, desde, hasta, radio, color, grosor, dosPuntas);
    const lados = trazar(g, COLOR_ARCO, 1.3);
    trazos.push({ transicion: a.transicion, trazar });
    if (a.peso > 1) pesos.push({ peso: a.peso, lados });
  }

  // Lugares: borde azul si es un monitor, naranja si recibe eventos externos
  // (llegadas de la oleada en En_fila, permisos de relevo en Relevo).
  const nombre = (x, y, texto, color) => {
    const t = escena.add.text(x, y, texto, estilo(8, color, { backgroundColor: FONDO, padding: { x: 1, y: 0 } }));
    objetos.push(t);
    return t;
  };
  const tokens = geo.lugares.map((l) => {
    g.fillStyle(0x0f1524, 1);
    g.fillCircle(l.x, l.y, radio);
    g.lineStyle(1.8, l.monitor ? PALETA.mantenimiento : l.externo ? PALETA.relevo : 0xf3f1e7, 1);
    g.strokeCircle(l.x, l.y, radio);
    const t = escena.add.text(l.x, l.y + 0.5, '', estiloMono(9.5, TEXTO.claro, { fontStyle: 'bold' })).setOrigin(0.5);
    objetos.push(t);
    return t;
  });
  // Nombres: el de cada transición a su izquierda, abajo (como en PIPE2); el de cada
  // lugar debajo, o encima si ahí chocaría con el nombre de una transición.
  const cajasTransiciones = geo.transiciones.map((t) =>
    caja(nombre(t.x - BARRA.w / 2 - 3, t.y + BARRA.h / 2 - 3, t.nombre, TEXTO.tenue).setOrigin(1, 0)));
  for (const l of geo.lugares) {
    const texto = nombre(l.x, l.y + radio + 2, l.nombre, TEXTO.claro).setOrigin(0.5, 0);
    if (cajasTransiciones.some((c) => seCruzan(caja(texto), c))) texto.setPosition(l.x, l.y - radio - 2).setOrigin(0.5, 1);
  }
  // Pesos mayores que 1, encima de todo: del lado del arco más lejos de los nodos.
  const nodos = [...geo.lugares, ...geo.transiciones];
  const holgura = (p) => Math.min(...nodos.map((n) => Math.hypot(n.x - p.x, n.y - p.y)));
  for (const { peso, lados } of pesos) {
    const p = holgura(lados[0]) >= holgura(lados[1]) ? lados[0] : lados[1];
    objetos.push(escena.add.text(p.x, p.y, String(peso), estilo(9, TEXTO.amarillo, { fontStyle: 'bold', backgroundColor: FONDO, padding: { x: 1, y: 0 } })).setOrigin(0.5));
  }

  // Capa viva: el color de cada barra y un anillo rojo en el lugar que pasa de k.
  const vivo = escena.add.graphics();
  const destello = escena.add.graphics();
  let parpadeo = null;

  return {
    geo,
    // M: marcado actual. habilitadas: Set con los índices de las transiciones con M ≥ Pre.
    actualizar(M, habilitadas) {
      vivo.clear();
      geo.lugares.forEach((l, i) => {
        const excede = l.k != null && M[i] > l.k;
        tokens[i].setText(String(M[i])).setColor(excede ? TEXTO.rojo : M[i] === 0 ? TEXTO.tenue : TEXTO.claro);
        if (excede) {
          vivo.lineStyle(2.4, PALETA.fallo, 1);
          vivo.strokeCircle(l.x, l.y, radio + 2.5);
        }
      });
      for (const t of geo.transiciones) {
        vivo.fillStyle(habilitadas.has(t.i) ? PALETA.operacion : GRIS, 1);
        vivo.fillRect(t.x - BARRA.w / 2, t.y - BARRA.h / 2, BARRA.w, BARRA.h);
        if (t.jugador) {
          vivo.lineStyle(1.4, 0xffffff, 0.95);
          vivo.strokeRect(t.x - BARRA.w / 2, t.y - BARRA.h / 2, BARRA.w, BARRA.h);
        }
      }
    },
    // La transición disparada y sus arcos parpadean en amarillo medio segundo.
    parpadear(ti) {
      if (parpadeo) parpadeo.stop();
      destello.clear().setAlpha(1);
      for (const trazo of trazos) if (trazo.transicion === ti) trazo.trazar(destello, AMARILLO, 2.4);
      const t = geo.transiciones[ti];
      destello.fillStyle(AMARILLO, 1);
      destello.fillRect(t.x - BARRA.w / 2 - 1.5, t.y - BARRA.h / 2 - 1.5, BARRA.w + 3, BARRA.h + 3);
      parpadeo = escena.tweens.add({
        targets: destello, alpha: 0.15, duration: 140, yoyo: true, repeat: 1,
        onComplete: () => { destello.clear(); parpadeo = null; }
      });
    },
    destruir() {
      if (parpadeo) parpadeo.stop();
      for (const o of objetos) o.destroy();
      vivo.destroy();
      destello.destroy();
    }
  };
}
