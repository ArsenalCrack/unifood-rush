// Dibuja el grafo de un autómata a partir de su JSON (nunca a mano): un nodo
// circular por estado, flechas con el código del evento, flecha de entrada en
// el estado inicial y doble círculo en los marcados. La distribución sale de
// "posiciones", la misma que usa el archivo .jff de JFLAP.

import { ESTADOS, PALETA, TEXTO, estilo } from './paleta.js';
import { resaltar } from './efectos.js';

// Flecha de a hacia b recortada al borde de los nodos. desvio separa las dos
// flechas de un par de ida y vuelta. Devuelve dónde poner la etiqueta.
function flecha(g, a, b, radio, desvio, color, grosor) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy) || 1;
  const ux = dx / largo;
  const uy = dy / largo;
  const nx = -uy;
  const ny = ux;
  const x1 = a.x + ux * radio + nx * desvio;
  const y1 = a.y + uy * radio + ny * desvio;
  const x2 = b.x - ux * (radio + 2) + nx * desvio;
  const y2 = b.y - uy * (radio + 2) + ny * desvio;
  g.lineStyle(grosor, color, 1);
  g.lineBetween(x1, y1, x2 - ux * 5, y2 - uy * 5);
  g.fillStyle(color, 1);
  g.fillTriangle(x2, y2, x2 - ux * 9 + nx * 4.5, y2 - uy * 9 + ny * 4.5, x2 - ux * 9 - nx * 4.5, y2 - uy * 9 - ny * 4.5);
  // La etiqueta va cerca del origen de la flecha para que no choque con la de vuelta.
  return { x: x1 + (x2 - x1) * 0.36 + nx * 10, y: y1 + (y2 - y1) * 0.36 + ny * 10 };
}

// Lazo (transición de un estado a sí mismo) sobre el nodo.
function lazo(g, p, radio, color, grosor) {
  g.lineStyle(grosor, color, 1);
  g.strokeCircle(p.x, p.y - radio - 5, 7);
  g.fillStyle(color, 1);
  g.fillTriangle(p.x + 6, p.y - radio + 1, p.x + 11, p.y - radio - 6, p.x + 2, p.y - radio - 5);
  return { x: p.x, y: p.y - radio - 19 };
}

// area: { x, y, w, h }. Devuelve { actualizar(estado), parpadear(origen, destino), destruir() }.
export function crearGrafo(escena, json, area, opciones = {}) {
  const radio = opciones.radio ?? 16;
  const colores = opciones.colores ?? ESTADOS[json.nombre] ?? {};
  const xs = json.estados.map((q) => json.posiciones[q][0]);
  const ys = json.estados.map((q) => json.posiciones[q][1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const anchoModelo = Math.max(1, Math.max(...xs) - minX);
  const altoModelo = Math.max(...ys) - minY;
  const mx = radio + 22;
  const my = radio + 14;
  const pos = (q) => ({
    x: area.x + mx + ((json.posiciones[q][0] - minX) / anchoModelo) * (area.w - 2 * mx),
    y: altoModelo === 0
      ? area.y + area.h / 2 - 6
      : area.y + my + ((json.posiciones[q][1] - minY) / altoModelo) * (area.h - 2 * my - 14)
  });

  const objetos = [];
  const g = escena.add.graphics();
  objetos.push(g);
  const codigo = new Map(json.eventos.map((e) => [e.id, e.codigo]));

  // Aristas agrupadas por par (origen, destino): una flecha con todos sus códigos.
  const pares = new Map();
  for (const [origen, evento, destino] of json.transiciones) {
    const clave = `${origen}>${destino}`;
    if (!pares.has(clave)) pares.set(clave, { origen, destino, codigos: [] });
    pares.get(clave).codigos.push(codigo.get(evento));
  }
  const trazar = (lienzo, par, color, grosor) => {
    if (par.origen === par.destino) return lazo(lienzo, pos(par.origen), radio, color, grosor);
    const idaYVuelta = pares.has(`${par.destino}>${par.origen}`);
    return flecha(lienzo, pos(par.origen), pos(par.destino), radio, idaYVuelta ? 6 : 0, color, grosor);
  };
  for (const par of pares.values()) {
    const etiqueta = trazar(g, par, 0xaab3c2, 1.6);
    objetos.push(escena.add.text(etiqueta.x, etiqueta.y, par.codigos.join(','), estilo(13, TEXTO.amarillo, { fontStyle: 'bold' })).setOrigin(0.5));
  }

  // Nodos: círculo por estado, doble si es marcado, flecha de entrada si es inicial.
  for (const q of json.estados) {
    const p = pos(q);
    const color = colores[q]?.color ?? PALETA.acero;
    g.fillStyle(0x0f1524, 1);
    g.fillCircle(p.x, p.y, radio);
    g.fillStyle(color, 0.3);
    g.fillCircle(p.x, p.y, radio);
    g.lineStyle(1.8, 0xf3f1e7, 0.95);
    g.strokeCircle(p.x, p.y, radio);
    if (json.marcados.includes(q)) g.strokeCircle(p.x, p.y, radio - 3.5);
    if (q === json.inicial) flecha(g, { x: p.x - radio - 22, y: p.y }, p, 0, 0, 0xf3f1e7, 1.6);
    if (json.prohibidos?.includes(q)) {
      g.lineStyle(2, PALETA.fallo, 1);
      g.lineBetween(p.x - radio * 0.6, p.y - radio * 0.6, p.x + radio * 0.6, p.y + radio * 0.6);
      g.lineBetween(p.x - radio * 0.6, p.y + radio * 0.6, p.x + radio * 0.6, p.y - radio * 0.6);
    }
    objetos.push(escena.add.text(p.x, p.y + radio + 2, q.replace('_', '\n'), estilo(8.5, TEXTO.claro, { align: 'center', lineSpacing: -2 })).setOrigin(0.5, 0));
  }

  // Capa viva: el estado actual iluminado (con filtro glow) y la última transición.
  const vivo = escena.add.graphics();
  const quitarGlow = resaltar(vivo, 0xffffff, 3);
  const destello = escena.add.graphics();
  let parpadeo = null;

  return {
    pos,
    // Ilumina el nodo del estado actual.
    actualizar(estado) {
      const p = pos(estado);
      vivo.clear();
      vivo.fillStyle(colores[estado]?.color ?? PALETA.operacion, 1);
      vivo.fillCircle(p.x, p.y, radio - 1.5);
      vivo.lineStyle(2.6, 0xffffff, 1);
      vivo.strokeCircle(p.x, p.y, radio - 1.5);
    },
    // La última transición recorrida parpadea 0,5 s.
    parpadear(origen, destino) {
      const par = pares.get(`${origen}>${destino}`);
      if (!par) return;
      if (parpadeo) parpadeo.stop();
      destello.clear().setAlpha(1);
      trazar(destello, par, 0xffe066, 3.6);
      parpadeo = escena.tweens.add({
        targets: destello, alpha: 0.1, duration: 125, yoyo: true, repeat: 1,
        onComplete: () => { destello.clear(); parpadeo = null; }
      });
    },
    destruir() {
      if (parpadeo) parpadeo.stop();
      quitarGlow();
      for (const o of objetos) o.destroy();
      vivo.destroy();
      destello.destroy();
    }
  };
}

// Leyenda "código = evento" de un autómata, en una línea.
export function leyendaEventos(json) {
  return json.eventos.map((e) => `${e.codigo} ${e.id}${e.controlable ? ' (c)' : ''}`).join(' · ');
}
