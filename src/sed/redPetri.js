// Red de Petri N = (P, T, Pre, Post, M0) con capacidad k por lugar.
// Pre y Post son de tamaño |T| x |P| (una fila por transición).
// A = Post − Pre y la ecuación de estado es M_k = M_{k−1} + A^T · u_k.
// Ningún recurso del juego cambia si no es por disparar(t) o por un evento
// externo del reloj (agregarTokens), como indica la ficha.
// Núcleo formal: sin Phaser ni DOM.

export class RedPetri {
  constructor(json) {
    this.json = json;
    this.lugares = json.lugares;
    this.transiciones = json.transiciones;
    this.nP = this.lugares.length;
    this.nT = this.transiciones.length;
    this.pre = json.pre.map((fila) => [...fila]);
    this.post = json.post.map((fila) => [...fila]);
    if (this.pre.length !== this.nT || this.pre.some((f) => f.length !== this.nP)) {
      throw new Error('Pre debe ser de tamaño |T| x |P|');
    }
    // Matriz de incidencia A = Post − Pre (fila por transición).
    this.A = this.post.map((fila, t) => fila.map((valor, p) => valor - this.pre[t][p]));
    this.M0 = this.lugares.map((l) => l.m0);
    this.M = [...this.M0];          // marcado actual
    this.ultimo = null;             // último disparo: { t, u, anterior, marcado }
    this.secuencia = [];            // nombres de las transiciones disparadas
    this.oyentes = [];
    this.indiceP = new Map();
    this.indiceT = new Map();
    this.lugares.forEach((l, i) => { this.indiceP.set(l.nombre, i); this.indiceP.set(l.id, i); });
    this.transiciones.forEach((t, i) => { this.indiceT.set(t.nombre, i); this.indiceT.set(t.id, i); });
    this.lugaresProceso = this.lugares.map((l, i) => (l.proceso ? i : -1)).filter((i) => i >= 0);
  }

  // Acepta índice, id ("p1") o nombre ("En_fila").
  iP(lugar) {
    const i = typeof lugar === 'number' ? lugar : this.indiceP.get(lugar);
    if (i === undefined || i < 0 || i >= this.nP) throw new Error(`Lugar desconocido: ${lugar}`);
    return i;
  }

  iT(transicion) {
    const i = typeof transicion === 'number' ? transicion : this.indiceT.get(transicion);
    if (i === undefined || i < 0 || i >= this.nT) throw new Error(`Transición desconocida: ${transicion}`);
    return i;
  }

  marcado() { return [...this.M]; }
  tokens(lugar) { return this.M[this.iP(lugar)]; }

  // Lugares que impiden disparar t en el marcado M: tokens de entrada que
  // faltan (M < Pre) o capacidad estricta que se superaría.
  faltantes(transicion, M = this.M) {
    const t = this.iT(transicion);
    // 1) Sincronización AND-join: tokens de entrada que faltan.
    const sinTokens = [];
    for (let p = 0; p < this.nP; p++) {
      if (M[p] < this.pre[t][p]) {
        sinTokens.push({ lugar: this.lugares[p].nombre, tiene: M[p], necesita: this.pre[t][p], motivo: 'faltan tokens' });
      }
    }
    if (sinTokens.length > 0) return sinTokens;
    // 2) Acotación: lugares de capacidad estricta que superarían k.
    const llenos = [];
    for (let p = 0; p < this.nP; p++) {
      const lugar = this.lugares[p];
      if (lugar.capacidad === 'estricta' && lugar.k != null && M[p] + this.A[t][p] > lugar.k) {
        llenos.push({ lugar: lugar.nombre, tiene: M[p], necesita: lugar.k, motivo: 'capacidad k llena' });
      }
    }
    return llenos;
  }

  // t está habilitada si M ≥ Pre(t) en cada lugar de entrada (AND-join) y no
  // supera la capacidad de ningún lugar de capacidad estricta.
  habilitada(transicion, M = this.M) {
    return this.faltantes(transicion, M).length === 0;
  }

  // Índices de las transiciones habilitadas en M.
  habilitadas(M = this.M) {
    const lista = [];
    for (let t = 0; t < this.nT; t++) if (this.habilitada(t, M)) lista.push(t);
    return lista;
  }

  // Grado de habilitación: cuántas veces seguidas podría dispararse t con los
  // tokens de entrada de M (para la semántica temporal de varios servidores).
  grado(transicion, M = this.M) {
    const t = this.iT(transicion);
    let grado = Infinity;
    for (let p = 0; p < this.nP; p++) {
      if (this.pre[t][p] > 0) grado = Math.min(grado, Math.floor(M[p] / this.pre[t][p]));
    }
    return grado;
  }

  // Ecuación de estado: M' = M + A^T · u (u: vector de disparo de tamaño |T|).
  ecuacionEstado(M, u) {
    const nuevo = new Array(this.nP);
    for (let p = 0; p < this.nP; p++) {
      let suma = 0;
      for (let t = 0; t < this.nT; t++) suma += this.A[t][p] * u[t];
      nuevo[p] = M[p] + suma; // ω (Infinity) + n sigue siendo ω
    }
    return nuevo;
  }

  // Vector de disparo one-hot de la transición t.
  vectorDisparo(transicion) {
    const u = new Array(this.nT).fill(0);
    u[this.iT(transicion)] = 1;
    return u;
  }

  // Marcado que resultaría de disparar t en M, sin aplicarlo ("probar disparo").
  resultado(transicion, M = this.M) {
    return this.ecuacionEstado(M, this.vectorDisparo(transicion));
  }

  // Dispara t: único punto en el que una transición mueve tokens.
  disparar(transicion) {
    const t = this.iT(transicion);
    if (!this.habilitada(t)) {
      const falta = this.faltantes(t).map((f) => `${f.lugar} (${f.tiene}/${f.necesita})`).join(', ');
      throw new Error(`${this.transiciones[t].nombre} no está habilitada: ${falta}`);
    }
    const u = this.vectorDisparo(t);
    const anterior = [...this.M];
    this.M = this.ecuacionEstado(anterior, u);
    this.ultimo = { t, nombre: this.transiciones[t].nombre, u, anterior, marcado: [...this.M] };
    this.secuencia.push(this.transiciones[t].nombre);
    this.notificar({ tipo: 'disparo', ...this.ultimo });
    return this.marcado();
  }

  // Evento externo del reloj (llegada de estudiantes, permisos de relevo):
  // agrega tokens a un lugar. Capacidad estricta: solo entra lo que cabe.
  // Capacidad desborde: entra todo y se informa cuánto supera k.
  agregarTokens(lugar, cantidad = 1) {
    const p = this.iP(lugar);
    const info = this.lugares[p];
    let agregados = cantidad;
    if (info.capacidad === 'estricta' && info.k != null) agregados = Math.max(0, Math.min(cantidad, info.k - this.M[p]));
    this.M[p] += agregados;
    const desborde = info.capacidad === 'desborde' && info.k != null ? Math.max(0, this.M[p] - info.k) : 0;
    this.notificar({ tipo: 'externo', lugar: info.nombre, agregados, desborde, marcado: [...this.M] });
    return { agregados, desborde };
  }

  // Conflictos (choice): lugares de entrada compartidos por dos o más
  // transiciones habilitadas, que por tanto compiten por sus tokens.
  conflictos(M = this.M) {
    const habilitadas = this.habilitadas(M);
    const lista = [];
    for (let p = 0; p < this.nP; p++) {
      const compiten = habilitadas.filter((t) => this.pre[t][p] > 0);
      if (compiten.length >= 2) {
        lista.push({ lugar: this.lugares[p].nombre, transiciones: compiten.map((t) => this.transiciones[t].nombre) });
      }
    }
    return lista;
  }

  // Marcado muerto: ninguna transición habilitada.
  esMuerto(M = this.M) {
    return this.habilitadas(M).length === 0;
  }

  // Marcado de reposo: no hay tokens en los lugares de proceso (ningún
  // estudiante dentro del comedor). El comedor solo espera llegadas externas.
  esReposo(M = this.M) {
    return this.lugaresProceso.every((p) => M[p] === 0);
  }

  // Interbloqueo (deadlock): marcado muerto con estudiantes en proceso.
  esBloqueo(M = this.M) {
    return this.esMuerto(M) && !this.esReposo(M);
  }

  // Valor de un invariante P (suma ponderada de tokens) en el marcado M.
  valorInvariante(invariante, M = this.M) {
    return Object.entries(invariante.lugares).reduce((suma, [lugar, peso]) => suma + peso * M[this.iP(lugar)], 0);
  }

  // Marcado como objeto { nombre: tokens } para mostrarlo o compararlo.
  comoObjeto(M = this.M) {
    return Object.fromEntries(this.lugares.map((l, p) => [l.nombre, M[p]]));
  }

  fijarMarcado(M) {
    if (M.length !== this.nP) throw new Error('Marcado de tamaño incorrecto');
    this.M = [...M];
  }

  alCambiar(oyente) {
    this.oyentes.push(oyente);
    return () => { this.oyentes = this.oyentes.filter((o) => o !== oyente); };
  }

  notificar(cambio) {
    for (const oyente of this.oyentes) oyente(cambio, this);
  }

  exportar() {
    return { M: [...this.M], ultimo: this.ultimo ? structuredClone(this.ultimo) : null, secuencia: [...this.secuencia] };
  }

  importar(dato) {
    this.M = [...dato.M];
    this.ultimo = dato.ultimo ? structuredClone(dato.ultimo) : null;
    this.secuencia = [...dato.secuencia];
  }
}
