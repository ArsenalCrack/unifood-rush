// Cadena de Markov en tiempo discreto (CMTD) con espacio de estados finito.
// P = [p_ij] estocástica por filas; pi^(n) = pi^(0) · P^n (vector fila).
// Estacionario: pi = pi · P con suma 1. Absorción: [[Q, R], [0, I]], N = (I − Q)^−1,
// t = N·1, B = N·R. Estimador: p̂_ij = n_ij / n_i y prueba chi-cuadrado (alfa = 0,05).
// Todo el azar sale del generador con semilla que recibe (src/sed/aleatorio.js).
// Núcleo formal: no depende del motor de juego ni del DOM.

const TOLERANCIA_FILA = 1e-9;
const coma = (v, d) => v.toFixed(d).replace('.', ','); // decimales con coma, como en la ficha
const MAX_HISTORIAL = 1000; // los últimos pasos (los conteos n_ij guardan todo)

// ---------- álgebra de matrices pequeñas ----------

export const ceros = (filas, columnas = filas) => Array.from({ length: filas }, () => new Array(columnas).fill(0));
export const identidad = (n) => ceros(n).map((fila, i) => { fila[i] = 1; return fila; });
export const copiar = (M) => M.map((fila) => [...fila]);
export const traspuesta = (M) => M[0].map((_, j) => M.map((fila) => fila[j]));

export function multiplicar(A, B) {
  const filas = A.length;
  const columnas = B[0].length;
  const C = ceros(filas, columnas);
  for (let i = 0; i < filas; i++) {
    for (let k = 0; k < B.length; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      for (let j = 0; j < columnas; j++) C[i][j] += a * B[k][j];
    }
  }
  return C;
}

// Vector fila por matriz: v · M.
export function vectorPorMatriz(v, M) {
  return M[0].map((_, j) => v.reduce((suma, vi, i) => suma + vi * M[i][j], 0));
}

// P^n por cuadrados sucesivos (P^0 = I).
export function potencia(P, n) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`Exponente no válido: ${n}`);
  let resultado = identidad(P.length);
  let base = P;
  let e = n;
  while (e > 0) {
    if (e & 1) resultado = multiplicar(resultado, base);
    e >>= 1;
    if (e > 0) base = multiplicar(base, base);
  }
  return resultado;
}

export function diferenciaMaxima(A, B) {
  let maximo = 0;
  A.forEach((fila, i) => fila.forEach((v, j) => { maximo = Math.max(maximo, Math.abs(v - B[i][j])); }));
  return maximo;
}

// Resuelve A x = b por eliminación gaussiana con pivoteo parcial. Devuelve null si A es singular.
export function resolver(A, b) {
  const n = A.length;
  const M = A.map((fila, i) => [...fila, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivote = c;
    for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[pivote][c])) pivote = f;
    if (Math.abs(M[pivote][c]) < 1e-12) return null;
    [M[c], M[pivote]] = [M[pivote], M[c]];
    for (let f = 0; f < n; f++) {
      if (f === c || M[f][c] === 0) continue;
      const factor = M[f][c] / M[c][c];
      for (let k = c; k <= n; k++) M[f][k] -= factor * M[c][k];
    }
  }
  return M.map((fila, i) => fila[n] / fila[i]);
}

// Inversa por Gauss-Jordan (columna por columna). Devuelve null si A es singular.
export function invertir(A) {
  const n = A.length;
  const columnas = identidad(n).map((e) => resolver(A, e));
  if (columnas.some((c) => c === null)) return null;
  return traspuesta(columnas);
}

// ---------- chi-cuadrado ----------

function lnGamma(z) {
  // Aproximación de Lanczos (g = 7), error relativo menor que 1e-13.
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  const x = z - 1;
  let suma = c[0];
  for (let i = 1; i < 9; i++) suma += c[i] / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(suma);
}

// P(X > x) para X ~ chi-cuadrado con gl grados de libertad: Q(gl/2, x/2) regularizada.
export function chi2Supervivencia(x, gl) {
  if (!(gl > 0)) return 1;
  if (!(x > 0)) return 1;
  const a = gl / 2;
  const z = x / 2;
  const prefactor = Math.exp(-z + a * Math.log(z) - lnGamma(a));
  if (z < a + 1) {
    // Serie de la gamma incompleta inferior.
    let termino = 1 / a;
    let suma = termino;
    for (let n = 1; n < 1000; n++) {
      termino *= z / (a + n);
      suma += termino;
      if (Math.abs(termino) < Math.abs(suma) * 1e-15) break;
    }
    return Math.max(0, 1 - suma * prefactor);
  }
  // Fracción continua de Lentz para la gamma incompleta superior.
  const MINIMO = 1e-300;
  let b = z + 1 - a;
  let c = 1 / MINIMO;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < MINIMO) d = MINIMO;
    c = b + an / c;
    if (Math.abs(c) < MINIMO) c = MINIMO;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return Math.min(1, prefactor * h);
}

// Lanza un error si P no es cuadrada n x n, tiene negativos o una fila no suma 1.
export function validarEstocastica(P, estados, nombre = 'P') {
  if (!Array.isArray(P) || P.length !== estados.length) throw new Error(`${nombre}: P debe tener ${estados.length} filas`);
  P.forEach((fila, i) => {
    if (!Array.isArray(fila) || fila.length !== estados.length) throw new Error(`${nombre}: la fila ${estados[i]} debe tener ${estados.length} columnas`);
    if (fila.some((p) => !(p >= 0))) throw new Error(`${nombre}: la fila ${estados[i]} tiene un valor negativo o no numérico`);
    const suma = fila.reduce((s, p) => s + p, 0);
    if (Math.abs(suma - 1) > TOLERANCIA_FILA) throw new Error(`${nombre}: la fila ${estados[i]} suma ${suma}, no 1`);
  });
}

// ---------- la cadena ----------

export class CadenaMarkov {
  // json: { nombre, estados, pi0, P, absorbentes?, franjas?: [{ desde, P }], peligrosos? }
  // rng: función que devuelve un número en [0, 1) (generador con semilla). Una cadena de
  // referencia que solo observa estados (observar) puede crearse sin rng.
  constructor(json, rng = null) {
    this.json = json;
    this.nombre = json.nombre;
    this.estados = [...json.estados];
    this.n = this.estados.length;
    this.indice = new Map(this.estados.map((e, i) => [e, i]));
    validarEstocastica(json.P, this.estados, json.nombre);
    this.P = copiar(json.P);
    // Cadena por franjas (no homogénea): una P por franja, vigente desde el paso "desde".
    this.franjas = json.franjas
      ? [...json.franjas].sort((a, b) => a.desde - b.desde).map((f, i) => {
        validarEstocastica(f.P, this.estados, `${json.nombre}, franja ${i + 1}`);
        return { desde: f.desde, nombre: f.nombre ?? `Franja ${i + 1}`, P: copiar(f.P) };
      })
      : null;
    if (!Array.isArray(json.pi0) || json.pi0.length !== this.n || Math.abs(json.pi0.reduce((s, p) => s + p, 0) - 1) > TOLERANCIA_FILA) {
      throw new Error(`${json.nombre}: pi0 debe tener ${this.n} probabilidades que sumen 1`);
    }
    this.pi0 = [...json.pi0];
    this.peligrosos = [...(json.peligrosos ?? [])];
    this.rng = rng;
    this.reiniciar();
  }

  // Vuelve a k = 0 con el estado inicial de pi0 (sorteado si pi0 no es degenerada).
  reiniciar() {
    this.k = 0;
    const cierto = this.pi0.findIndex((p) => p === 1);
    this.estado = this.estados[cierto >= 0 ? cierto : this.sortear(this.pi0)];
    this.historial = [];                                   // { k, de, a }
    this.conteos = (this.franjas ?? [null]).map(() => ceros(this.n)); // n_ij por franja
    this.visitas = new Array(this.n).fill(0);              // visitas tras cada paso (como Python)
  }

  get iEstado() {
    return this.indice.get(this.estado);
  }

  i(estado) {
    const i = typeof estado === 'number' ? estado : this.indice.get(estado);
    if (i === undefined || i < 0 || i >= this.n) throw new Error(`${this.nombre}: estado desconocido ${estado}`);
    return i;
  }

  // Índice de la franja vigente en el paso k (0 si la cadena es homogénea).
  franja(k = this.k) {
    if (!this.franjas) return 0;
    let f = 0;
    this.franjas.forEach((franja, i) => { if (k >= franja.desde) f = i; });
    return f;
  }

  // P de la franja vigente en el paso k.
  matrizVigente(k = this.k) {
    return this.franjas ? this.franjas[this.franja(k)].P : this.P;
  }

  // Método de la transformada inversa: primer j con acumulada > u, u ~ U(0, 1).
  sortear(fila) {
    if (!this.rng) throw new Error(`${this.nombre}: la cadena no tiene generador con semilla`);
    const u = this.rng();
    let acumulada = 0;
    let ultimo = 0;
    for (let j = 0; j < fila.length; j++) {
      if (fila[j] <= 0) continue;
      acumulada += fila[j];
      ultimo = j;
      if (u < acumulada) return j;
    }
    return ultimo; // redondeo: la acumulada quedó apenas por debajo de 1
  }

  // Un paso k: muestrea el siguiente estado con la fila del estado actual.
  paso() {
    const fila = this.matrizVigente(this.k)[this.iEstado];
    const j = this.sortear(fila);
    return this.registrar(this.estado, this.estados[j]);
  }

  // Cadena de referencia: registra como paso k el estado observado (no sortea).
  observar(estado) {
    return this.registrar(this.estado, this.estados[this.i(estado)]);
  }

  registrar(de, a) {
    const franja = this.franja(this.k);
    this.conteos[franja][this.i(de)][this.i(a)] += 1;
    this.visitas[this.i(a)] += 1;
    this.k += 1;
    this.estado = a;
    const cambio = { k: this.k, de, a, cadena: this.nombre };
    this.historial.push(cambio);
    if (this.historial.length > MAX_HISTORIAL) this.historial.shift();
    return cambio;
  }

  // ---------- análisis (no cambian el estado) ----------

  matrizPotencia(n, P = this.matrizVigente()) {
    return potencia(P, n);
  }

  // pi^(n) = pi^(0) · P^n.
  distribucion(n, pi0 = this.pi0, P = this.matrizVigente()) {
    return vectorPorMatriz(pi0, potencia(P, n));
  }

  // Vector fila del estado actual (o de otro): e_i.
  vectorDe(estado = this.estado) {
    const v = new Array(this.n).fill(0);
    v[this.i(estado)] = 1;
    return v;
  }

  // pi = pi · P con suma 1: (P^T − I) pi^T = 0 cambiando la última ecuación por la suma.
  estacionaria(P = this.matrizVigente()) {
    const A = traspuesta(P).map((fila, i) => fila.map((v, j) => v - (i === j ? 1 : 0)));
    A[this.n - 1] = new Array(this.n).fill(1);
    const b = new Array(this.n).fill(0);
    b[this.n - 1] = 1;
    return resolver(A, b);
  }

  // Tiempo medio de retorno 1/pi_j, en pasos.
  tiemposRetorno(P = this.matrizVigente()) {
    const pi = this.estacionaria(P);
    return pi ? pi.map((p) => (p > 0 ? 1 / p : Infinity)) : null;
  }

  // Clases que se comunican, recurrente/transitorio/absorbente y periodo de cada clase.
  clasificar(P = this.matrizVigente()) {
    const n = this.n;
    const alcanza = P.map((fila) => fila.map((p) => p > 0));
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        if (!alcanza[i][k]) continue;
        for (let j = 0; j < n; j++) if (alcanza[k][j]) alcanza[i][j] = true;
      }
    }
    const clases = [];
    const claseDe = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (claseDe[i] >= 0) continue;
      const miembros = [];
      for (let j = 0; j < n; j++) if (j === i || (alcanza[i][j] && alcanza[j][i])) miembros.push(j);
      miembros.forEach((j) => { claseDe[j] = clases.length; });
      // En una cadena finita una clase es recurrente si es cerrada.
      const cerrada = miembros.every((a) => alcanza[a].every((llega, b) => !llega || miembros.includes(b)));
      // Periodo: mcd de (nivel[u] + 1 − nivel[v]) sobre los arcos u -> v de la clase.
      const nivel = new Map([[miembros[0], 0]]);
      const cola = [miembros[0]];
      let periodo = 0;
      const mcd = (a, b) => (b === 0 ? Math.abs(a) : mcd(b, a % b));
      while (cola.length > 0) {
        const u = cola.shift();
        for (const v of miembros) {
          if (P[u][v] <= 0) continue;
          if (!nivel.has(v)) { nivel.set(v, nivel.get(u) + 1); cola.push(v); }
          periodo = mcd(periodo, nivel.get(u) + 1 - nivel.get(v));
        }
      }
      const absorbente = miembros.length === 1 && P[miembros[0]][miembros[0]] === 1;
      clases.push({
        estados: miembros.map((j) => this.estados[j]),
        tipo: absorbente ? 'absorbente' : cerrada ? 'recurrente' : 'transitorio',
        periodo: periodo === 0 ? null : periodo
      });
    }
    const irreducible = clases.length === 1;
    const aperiodica = clases.every((c) => c.tipo === 'transitorio' || c.periodo === 1);
    return {
      clases,
      estados: this.estados.map((nombre, i) => ({ nombre, clase: claseDe[i], tipo: clases[claseDe[i]].tipo, periodo: clases[claseDe[i]].periodo })),
      irreducible,
      aperiodica,
      ergodica: irreducible && aperiodica
    };
  }

  // Cadena absorbente: N = (I − Q)^−1, t = N·1 (pasos esperados) y B = N·R.
  absorcion(P = this.matrizVigente()) {
    const absorbentes = [];
    const transitorios = [];
    P.forEach((fila, i) => (fila[i] === 1 ? absorbentes : transitorios).push(i));
    if (absorbentes.length === 0 || transitorios.length === 0) return null;
    const Q = transitorios.map((i) => transitorios.map((j) => P[i][j]));
    const R = transitorios.map((i) => absorbentes.map((j) => P[i][j]));
    const N = invertir(Q.map((fila, i) => fila.map((v, j) => (i === j ? 1 : 0) - v)));
    if (!N) return null;
    return {
      transitorios: transitorios.map((i) => this.estados[i]),
      absorbentes: absorbentes.map((i) => this.estados[i]),
      Q, R, N,
      t: N.map((fila) => fila.reduce((s, v) => s + v, 0)),
      B: multiplicar(N, R)
    };
  }

  // P(llegar al menos una vez a un estado objetivo en <= pasos pasos) desde "desde".
  // Los objetivos se vuelven absorbentes para contar solo la primera llegada.
  probAlcanzar(objetivos, pasos, desde = this.estado, P = this.matrizVigente()) {
    const indices = objetivos.map((o) => this.i(o));
    const i = this.i(desde);
    if (indices.includes(i)) return 1;
    const Pa = copiar(P);
    for (const j of indices) Pa[j] = this.vectorDe(j);
    const Pk = potencia(Pa, pasos);
    return indices.reduce((s, j) => s + Pk[i][j], 0);
  }

  // Riesgo de llegar a un estado peligroso de la ficha en los próximos pasos.
  riesgo(pasos, desde = this.estado) {
    return this.peligrosos.length > 0 ? this.probAlcanzar(this.peligrosos, pasos, desde) : 0;
  }

  // ---------- datos de la partida ----------

  // n_ij totales (suma de todas las franjas).
  conteoTotal() {
    return this.conteos.reduce((T, C) => T.map((fila, i) => fila.map((v, j) => v + C[i][j])), ceros(this.n));
  }

  // p̂_ij = n_ij / n_i (fila en ceros si no hubo salidas de i).
  matrizEstimada(conteo = this.conteoTotal()) {
    const totales = conteo.map((fila) => fila.reduce((s, v) => s + v, 0));
    return { P: conteo.map((fila, i) => fila.map((v) => (totales[i] > 0 ? v / totales[i] : 0))), conteos: copiar(conteo), totales };
  }

  // Fracción de los pasos que la cadena pasó en cada estado.
  frecuencias() {
    return this.visitas.map((v) => (this.k > 0 ? v / this.k : 0));
  }

  // Chi-cuadrado de las transiciones observadas frente a P: suma de (n_ij − n_i p_ij)² / (n_i p_ij)
  // sobre los p_ij > 0; gl = suma de (casillas posibles − 1) en las filas observadas.
  chiCuadrado(alfa = 0.05) {
    let estadistico = 0;
    let gl = 0;
    let imposibles = 0;
    let transiciones = 0;
    this.conteos.forEach((conteo, f) => {
      const P = this.franjas ? this.franjas[f].P : this.P;
      conteo.forEach((fila, i) => {
        const ni = fila.reduce((s, v) => s + v, 0);
        if (ni === 0) return;
        transiciones += ni;
        let posibles = 0;
        fila.forEach((nij, j) => {
          if (P[i][j] > 0) {
            const esperado = ni * P[i][j];
            estadistico += (nij - esperado) ** 2 / esperado;
            posibles += 1;
          } else if (nij > 0) {
            imposibles += nij;
          }
        });
        gl += posibles - 1;
      });
    });
    const valorP = imposibles > 0 ? 0 : chi2Supervivencia(estadistico, gl);
    const rechaza = transiciones > 0 && valorP < alfa;
    let conclusion;
    if (transiciones === 0) conclusion = 'Todavía no hay transiciones observadas.';
    else if (imposibles > 0) conclusion = `Se observaron ${imposibles} transiciones con p_ij = 0: el juego no respeta P.`;
    else if (rechaza) conclusion = `Valor p ${coma(valorP, 3)} < ${coma(alfa, 2)}: se rechaza que los datos sigan P.`;
    else conclusion = `Valor p ${coma(valorP, 3)} ≥ ${coma(alfa, 2)}: no se rechaza que los datos sigan P.`;
    return { estadistico, gl, valorP, alfa, rechaza, transiciones, imposibles, conclusion };
  }

  // ---------- guardar y restaurar ----------

  exportar() {
    return structuredClone({ estado: this.estado, k: this.k, historial: this.historial, conteos: this.conteos, visitas: this.visitas });
  }

  importar(dato) {
    const d = structuredClone(dato);
    Object.assign(this, { estado: d.estado, k: d.k, historial: d.historial, conteos: d.conteos, visitas: d.visitas });
  }
}
