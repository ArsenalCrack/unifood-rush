// Árbol de cobertura de Karp y Miller y exploración acotada para el radar.
// ω se representa con Infinity: un lugar marcado con ω puede crecer sin límite.
// Si la red es acotada, el árbol coincide con el árbol de alcanzabilidad.
// Núcleo formal: no depende del motor de juego ni del DOM.

export const OMEGA = Infinity;

const clave = (M) => M.map((x) => (x === OMEGA ? 'w' : x)).join(',');

// ¿a ≤ b en todos los lugares?
const cubre = (b, a) => a.every((x, p) => x <= b[p]);

// Árbol de cobertura desde M0.
// opciones.profundidadMax limita la profundidad (para el árbol local del inspector).
// Devuelve nodos, aristas, marcados muertos, bloqueos y si quedó truncado.
// Tipos de nodo: 'nuevo' (expandido), 'duplicado' (su marcado ya está en el
// árbol), 'muerto' (sin sucesores) y 'frontera' (no expandido por el límite).
export function arbolCobertura(red, M0 = red.M0, maxNodos = 2000, opciones = {}) {
  const profundidadMax = opciones.profundidadMax ?? Infinity;
  const raiz = { id: 0, marcado: [...M0], padre: null, transicion: null, profundidad: 0, tipo: 'nuevo' };
  const nodos = [raiz];
  const aristas = [];
  const vistos = new Map([[clave(raiz.marcado), 0]]);
  const pendientes = [raiz];
  let truncado = false;
  let acotada = true;

  while (pendientes.length > 0 && !truncado) {
    const nodo = pendientes.shift(); // en anchura: el primer camino a un marcado es el más corto
    const habilitadas = red.habilitadas(nodo.marcado);
    if (habilitadas.length === 0) {
      nodo.tipo = 'muerto';
      nodo.reposo = red.esReposo(nodo.marcado);
      continue;
    }
    if (nodo.profundidad >= profundidadMax) { nodo.tipo = 'frontera'; continue; }

    for (const t of habilitadas) {
      const marcado = red.resultado(t, nodo.marcado);

      // Regla de ω: si el nuevo marcado cubre estrictamente a un antecesor,
      // los lugares que crecieron pueden crecer sin límite y se marcan con ω.
      for (let a = nodo; a !== null; a = a.padre === null ? null : nodos[a.padre]) {
        if (cubre(marcado, a.marcado) && clave(marcado) !== clave(a.marcado)) {
          for (let p = 0; p < marcado.length; p++) {
            if (a.marcado[p] < marcado[p]) { marcado[p] = OMEGA; acotada = false; }
          }
        }
      }

      const hijo = {
        id: nodos.length, marcado, padre: nodo.id,
        transicion: red.transiciones[t].nombre, profundidad: nodo.profundidad + 1, tipo: 'nuevo'
      };
      nodos.push(hijo);
      aristas.push({ de: nodo.id, a: hijo.id, transicion: hijo.transicion });

      const k = clave(marcado);
      if (vistos.has(k)) {
        hijo.tipo = 'duplicado';       // hoja: ese marcado ya se expande en otro nodo
        hijo.igualA = vistos.get(k);
      } else {
        vistos.set(k, hijo.id);
        pendientes.push(hijo);
      }
      if (nodos.length >= maxNodos) { truncado = true; break; }
    }
  }
  if (truncado) for (const n of pendientes) n.tipo = 'frontera';

  const muertos = nodos.filter((n) => n.tipo === 'muerto');
  return {
    nodos, aristas, truncado, acotada,
    marcadosDistintos: vistos.size,                 // estados del grafo de alcanzabilidad
    muertos: muertos.map((n) => n.id),              // todos los marcados sin sucesores
    bloqueos: muertos.filter((n) => !n.reposo).map((n) => n.id) // muertos con estudiantes en proceso
  };
}

// Secuencia de transiciones desde la raíz hasta un nodo del árbol.
export function caminoHasta(arbol, idNodo) {
  const camino = [];
  for (let n = arbol.nodos[idNodo]; n.padre !== null; n = arbol.nodos[n.padre]) camino.unshift(n.transicion);
  return camino;
}

// Exploración para el Radar del Árbol de Cobertura: mira "profundidad"
// disparos hacia adelante desde M.
//   rojo:     el marcado actual es un interbloqueo.
//   amarillo: hay un interbloqueo alcanzable en esos disparos.
//   verde:    no lo hay.
export function explorar(red, M = red.M, profundidad = 3) {
  if (red.esBloqueo(M)) {
    return { estado: 'rojo', bloqueos: [{ marcado: [...M], camino: [], distancia: 0 }], explorados: 1 };
  }
  const arbol = arbolCobertura(red, M, 5000, { profundidadMax: profundidad });
  const bloqueos = arbol.bloqueos.map((id) => ({
    marcado: arbol.nodos[id].marcado,
    camino: caminoHasta(arbol, id),
    distancia: arbol.nodos[id].profundidad
  }));
  bloqueos.sort((a, b) => a.distancia - b.distancia);
  return { estado: bloqueos.length > 0 ? 'amarillo' : 'verde', bloqueos, explorados: arbol.nodos.length };
}
