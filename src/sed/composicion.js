// Composición síncrona (producto paralelo) y supervisor por estados prohibidos.
// G1 ‖ G2: los eventos comunes ocurren a la vez en ambos autómatas y los
// privados en cada uno. Sobre el producto se calcula qué eventos controlables
// hay que deshabilitar para no entrar nunca a un estado prohibido.
// Núcleo formal: sin Phaser ni DOM.

const SEPARADOR = '|';

// Nombre del estado compuesto a partir de la tupla de estados componentes.
export function nombreCompuesto(tupla) {
  return tupla.join(SEPARADOR);
}

function tablaDelta(json) {
  const delta = new Map(json.estados.map((q) => [q, new Map()]));
  for (const [origen, evento, destino] of json.transiciones) delta.get(origen).set(evento, destino);
  return delta;
}

// Producto síncrono de dos autómatas en formato JSON. Devuelve otro JSON.
// completo = false: solo los estados alcanzables desde (q0_1, q0_2).
// completo = true: todas las tuplas de Q1 x Q2 (sirve cuando varios procesos
// comparten una máquina y el juego puede mostrar tuplas no alcanzables por uno solo).
export function componer(g1, g2, { completo = false } = {}) {
  const d1 = tablaDelta(g1);
  const d2 = tablaDelta(g2);
  const ev1 = new Map(g1.eventos.map((e) => [e.id, e]));
  const ev2 = new Map(g2.eventos.map((e) => [e.id, e]));

  // Σ = Σ1 ∪ Σ2. Un evento común debe tener la misma controlabilidad en ambos.
  const eventos = [...g1.eventos.map((e) => ({ ...e }))];
  for (const e of g2.eventos) {
    if (!ev1.has(e.id)) eventos.push({ ...e });
    else if (ev1.get(e.id).controlable !== e.controlable) {
      throw new Error(`Evento común ${e.id} con controlabilidad distinta`);
    }
  }

  // δ((q1, q2), σ) según a quién pertenece σ. Devuelve la tupla destino o null.
  const paso = (q1, q2, sigma) => {
    const en1 = ev1.has(sigma);
    const en2 = ev2.has(sigma);
    const n1 = en1 ? d1.get(q1).get(sigma) : q1;
    const n2 = en2 ? d2.get(q2).get(sigma) : q2;
    if (n1 === undefined || n2 === undefined) return null; // alguno no la permite
    return [n1, n2];
  };

  // Cada estado de un producto recuerda su tupla plana (para productos de 3 o más).
  const plana = (g, q) => (g.tuplas ? g.tuplas[q] : [q]);

  const tuplas = {};
  const estados = [];
  const transiciones = [];
  const marcados = [];
  const m1 = new Set(g1.marcados);
  const m2 = new Set(g2.marcados);

  const pendientes = [];
  const agregar = (q1, q2) => {
    const nombre = nombreCompuesto([...plana(g1, q1), ...plana(g2, q2)]);
    if (tuplas[nombre]) return nombre;
    tuplas[nombre] = [...plana(g1, q1), ...plana(g2, q2)];
    estados.push(nombre);
    if (m1.has(q1) && m2.has(q2)) marcados.push(nombre);
    pendientes.push([q1, q2, nombre]);
    return nombre;
  };

  const inicial = agregar(g1.inicial, g2.inicial);
  if (completo) for (const q1 of g1.estados) for (const q2 of g2.estados) agregar(q1, q2);

  // Exploración en anchura de los estados compuestos.
  while (pendientes.length > 0) {
    const [q1, q2, nombre] = pendientes.shift();
    for (const e of eventos) {
      const destino = paso(q1, q2, e.id);
      if (destino) transiciones.push([nombre, e.id, agregar(destino[0], destino[1])]);
    }
  }

  return {
    nombre: `${g1.nombre} ‖ ${g2.nombre}`,
    componentes: [...(g1.componentes ?? [g1.nombre]), ...(g2.componentes ?? [g2.nombre])],
    estados, inicial, marcados, eventos, transiciones, tuplas
  };
}

// Producto de varios autómatas: ((G1 ‖ G2) ‖ G3) ‖ ...
export function componerVarios(lista, opciones = {}) {
  return lista.slice(1).reduce((acumulado, g) => componer(acumulado, g, opciones), lista[0]);
}

// Composición "en vivo" sobre instancias de Automata, sin construir el producto:
// un evento solo puede ocurrir si TODOS los autómatas que lo tienen en su
// alfabeto pueden ejecutarlo, y entonces lo ejecutan a la vez.
export function puedeConjunto(evento, automatas) {
  const participantes = automatas.filter((a) => a.eventos.has(evento));
  return participantes.length > 0 && participantes.every((a) => a.puede(evento));
}

export function ejecutarConjunto(evento, automatas) {
  if (!puedeConjunto(evento, automatas)) {
    throw new Error(`El evento ${evento} no está habilitado en la composición`);
  }
  for (const a of automatas) if (a.eventos.has(evento)) a.ejecutar(evento);
}

// Supervisor por estados prohibidos (Ramadge y Wonham).
// prohibidos: lista de nombres de estado o función (tupla, nombre) => boolean.
// razon: texto o función (estado, evento, destino) => texto de la restricción formal.
// Devuelve los estados malos y, para cada estado bueno, los eventos controlables
// que el supervisor deshabilita.
export function supervisor(composicion, prohibidos, razon = 'lleva a un estado prohibido') {
  const delta = tablaDelta(composicion);
  const controlable = new Map(composicion.eventos.map((e) => [e.id, e.controlable === true]));
  const esProhibido = typeof prohibidos === 'function'
    ? (q) => prohibidos(composicion.tuplas?.[q] ?? [q], q)
    : (q) => prohibidos.includes(q);

  const estadosProhibidos = new Set(composicion.estados.filter(esProhibido));
  const malos = new Set(estadosProhibidos);
  const marcados = new Set(composicion.marcados);

  let cambio = true;
  while (cambio) {
    cambio = false;

    // 1) Un estado que llega a uno malo por un evento NO controlable también es
    //    malo: el supervisor no puede impedir ese evento.
    let crece = true;
    while (crece) {
      crece = false;
      for (const q of composicion.estados) {
        if (malos.has(q)) continue;
        for (const [sigma, destino] of delta.get(q)) {
          if (!controlable.get(sigma) && malos.has(destino)) { malos.add(q); crece = true; break; }
        }
      }
    }

    // 2) No bloqueo: un estado bueno debe poder llegar a un estado marcado
    //    pasando solo por estados buenos (coaccesibilidad).
    const coaccesibles = new Set(composicion.estados.filter((q) => !malos.has(q) && marcados.has(q)));
    crece = true;
    while (crece) {
      crece = false;
      for (const q of composicion.estados) {
        if (malos.has(q) || coaccesibles.has(q)) continue;
        for (const destino of delta.get(q).values()) {
          if (coaccesibles.has(destino)) { coaccesibles.add(q); crece = true; break; }
        }
      }
    }
    for (const q of composicion.estados) {
      if (!malos.has(q) && !coaccesibles.has(q)) { malos.add(q); cambio = true; }
    }
  }

  // Eventos controlables deshabilitados en cada estado bueno.
  const deshabilitados = new Map();
  for (const q of composicion.estados) {
    if (malos.has(q)) continue;
    const lista = [];
    for (const [sigma, destino] of delta.get(q)) {
      if (controlable.get(sigma) && malos.has(destino)) {
        lista.push({ evento: sigma, destino, razon: typeof razon === 'function' ? razon(q, sigma, destino) : razon });
      }
    }
    deshabilitados.set(q, lista);
  }

  return {
    prohibidos: estadosProhibidos,
    malos,
    deshabilitados,
    existe: !malos.has(composicion.inicial),
    numEstadosBuenos: composicion.estados.length - malos.size,
    // ¿El supervisor deja ocurrir el evento en ese estado compuesto?
    permite(estado, evento) {
      return !(deshabilitados.get(estado) ?? []).some((d) => d.evento === evento);
    },
    // Restricción formal que deshabilita el evento, o null si está permitido.
    razonDe(estado, evento) {
      return (deshabilitados.get(estado) ?? []).find((d) => d.evento === evento)?.razon ?? null;
    }
  };
}
