// Geometría del grafo de una red de Petri, sin motor de juego (se prueba en Node).
// Las posiciones salen de "pos" del JSON, las mismas que scripts/exportar-modelos.mjs
// escribe en los archivos de PIPE2: el dibujo del juego es PIPE2 escalado al área.
// Hay un arco por cada entrada no nula de Pre (lugar → transición) y de Post
// (transición → lugar), con su peso, como en PIPE2.

// area: { x, y, w, h }. margen: espacio para los nombres alrededor de los nodos.
export function geometriaRed(json, area, margen = { izq: 64, der: 18, arr: 14, aba: 22 }) {
  const nodos = [...json.lugares, ...json.transiciones];
  const xs = nodos.map((n) => n.pos[0]);
  const ys = nodos.map((n) => n.pos[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const anchoModelo = Math.max(1, Math.max(...xs) - minX);
  const altoModelo = Math.max(1, Math.max(...ys) - minY);
  const escalar = ([x, y]) => ({
    x: area.x + margen.izq + ((x - minX) / anchoModelo) * (area.w - margen.izq - margen.der),
    y: area.y + margen.arr + ((y - minY) / altoModelo) * (area.h - margen.arr - margen.aba)
  });

  const lugares = json.lugares.map((l, i) => ({
    i, tipo: 'lugar', nombre: l.nombre, k: l.k ?? null,
    monitor: Boolean(l.monitor), externo: Boolean(l.externo), ...escalar(l.pos)
  }));
  const transiciones = json.transiciones.map((t, i) => ({
    i, tipo: 'transicion', nombre: t.nombre, jugador: t.disparo === 'jugador', ...escalar(t.pos)
  }));
  const arcos = [];
  json.transiciones.forEach((t, ti) => json.lugares.forEach((l, pi) => {
    if (json.pre[ti][pi] > 0) arcos.push({ tipo: 'pre', lugar: pi, transicion: ti, peso: json.pre[ti][pi], de: l.nombre, a: t.nombre });
    if (json.post[ti][pi] > 0) arcos.push({ tipo: 'post', lugar: pi, transicion: ti, peso: json.post[ti][pi], de: t.nombre, a: l.nombre });
  }));
  return { lugares, transiciones, arcos };
}
