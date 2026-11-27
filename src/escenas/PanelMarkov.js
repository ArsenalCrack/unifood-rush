// Panel analítico de Markov (tecla M, botón MARKOV o clic derecho): escena superpuesta
// de 640 x 400 que NO pausa la simulación (GDD 16.10). Selector de cadena (Oleada o
// Mesas) y cinco pestañas: Matriz, Transitorio, Chapman-Kolmogorov, Largo plazo y
// Datos de la partida. Solo lee el núcleo; las compras salen por el gestor de entrada.

import { MARKOV } from '../sed/modelos/index.js';
import { CadenaMarkov, potencia, multiplicar, diferenciaMaxima } from '../sed/markov.js';
import { UMBRAL_RIESGO, PASOS_RIESGO, COSTOS, TIEMPOS } from '../config.js';
import { PASO_K_S } from '../simulacion/flujo.js';
import { PALETA, TEXTO, estilo, estiloMono, css } from '../arte/paleta.js';
import { prepararCamara } from '../arte/resolucion.js';
import { panel, boton } from '../arte/ui.js';
import { mapaCalor, barras, leyenda, colorCalor, estiloEstado, vectorTexto, numero, PANEL } from '../arte/markov.js';
import { entrada } from '../entrada/gestorEntrada.js';

const X = 160;
const Y = 70;
const W = 640;
const H = 400;
const PESTANAS = [
  ['matriz', 'Matriz', 72], ['transitorio', 'Transitorio', 90], ['ck', 'Chapman-Kolmogorov', 146],
  ['largo', 'Largo plazo', 96], ['datos', 'Datos de la partida', 136]
];
const NOMBRE = { oleada: 'Oleada', mesas: 'Mesas' };
const pct = (p) => `${Math.round(p * 100)} %`;

export class PanelMarkov extends Phaser.Scene {
  constructor() {
    super('PanelMarkov');
  }

  create(datos) {
    prepararCamara(this);
    this.planta = this.scene.get('Planta');
    this.comedor = this.planta.comedor;
    this.cadena = datos?.cadena ?? 'oleada';
    this.pestana = 'matriz';
    this.n = 5;          // n de pi^(n)
    this.desdeFicha = false;
    this.m = 2;          // m y n de Chapman-Kolmogorov
    this.nCK = 3;
    this.contenido = [];

    this.add.zone(X + W / 2, Y + H / 2, W, H).setInteractive(); // el panel absorbe los clics
    panel(this, X, Y, W, H, { alfa: 0.97, borde: PALETA.mantenimiento, alfaBorde: 0.75 });
    this.titulo = this.add.text(X + 14, Y + 9, '', estilo(14, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.subtitulo = this.add.text(X + 14, Y + 28, '', estilo(9.5, TEXTO.tenue));
    this.botonesCadena = {
      oleada: boton(this, X + 470, Y + 20, 'OLEADA', { ancho: 74, alto: 22, tam: 10 }, () => this.elegirCadena('oleada')),
      mesas: boton(this, X + 550, Y + 20, 'MESAS', { ancho: 74, alto: 22, tam: 10 }, () => this.elegirCadena('mesas'))
    };
    boton(this, X + W - 20, Y + 20, 'X', { ancho: 24, alto: 22, tam: 11, color: 0x2a3347 }, () => this.cerrar());
    let x = X + 14;
    this.botonesPestana = {};
    for (const [clave, nombre, ancho] of PESTANAS) {
      this.botonesPestana[clave] = boton(this, x + ancho / 2, Y + 58, nombre, { ancho, alto: 22, tam: 10, color: 0x2a3347 }, () => this.abrir(clave));
      x += ancho + 6;
    }
    // El panel se vuelve a dibujar en cada paso k (los datos de la partida cambian).
    this.alPaso = () => { if (this.sys.isActive()) this.pintar(true); };
    this.comedor.on('markov', this.alPaso);
    this.events.once('shutdown', () => this.comedor.off('markov', this.alPaso));
    this.elegirCadena(this.cadena);
  }

  cerrar() {
    this.scene.stop();
  }

  // Cadena del juego o, en el modo de la Fase 1, la cadena teórica del JSON.
  objeto() {
    if (this.comedor.markov) return this.comedor.markov[this.cadena];
    this.teoricas ??= { oleada: new CadenaMarkov(MARKOV.oleada), mesas: new CadenaMarkov(MARKOV.mesas) };
    return this.teoricas[this.cadena];
  }

  elegirCadena(cadena) {
    this.cadena = cadena;
    for (const [clave, b] of Object.entries(this.botonesCadena)) b.fijarColor(clave === cadena ? PALETA.mantenimiento : 0x2a3347);
    this.abrir(this.pestana);
  }

  abrir(pestana) {
    this.pestana = pestana;
    for (const [clave, b] of Object.entries(this.botonesPestana)) b.fijarColor(clave === pestana ? PALETA.mantenimiento : 0x2a3347);
    this.pintar(false);
  }

  limpiar() {
    for (const o of this.contenido) o.destroy();
    this.contenido = [];
  }

  agregar(...objetos) {
    for (const o of objetos.flat()) this.contenido.push(o);
    return objetos[0];
  }

  texto(x, y, cadena, formato) {
    return this.agregar(this.add.text(x, y, cadena, formato));
  }

  // Barras que crecen con un tween (pulido de la Fase 2).
  animarBarras(rects, animar) {
    for (const r of rects) {
      if (!animar) continue;
      r.setScale(1, 0);
      this.tweens.add({ targets: r, scaleY: 1, duration: 380, ease: 'Cubic.easeOut' });
    }
  }

  pintar(animar) {
    this.limpiar();
    const cadena = this.objeto();
    const json = MARKOV[this.cadena];
    const modo = this.comedor.markov ? `paso k = ${cadena.k} · estado actual ${cadena.estado}` : 'modo Fase 1: solo la teoría (sin pasos)';
    this.titulo.setText(`PANEL DE MARKOV · ${NOMBRE[this.cadena].toUpperCase()}`);
    const papel = json.referencia ? 'modelo de referencia observado en la red de Petri'
      : this.comedor.markov ? 'gobierna las llegadas' : 'con Markov gobierna las llegadas';
    this.subtitulo.setText(`${modo} · 1 paso = ${PASO_K_S} s · ${papel} · la simulación sigue`);
    const pintores = { matriz: this.pintarMatriz, transitorio: this.pintarTransitorio, ck: this.pintarCK, largo: this.pintarLargoPlazo, datos: this.pintarDatos };
    pintores[this.pestana].call(this, cadena, json, animar);
  }

  // ---------- 1. Matriz: mapa de calor de P con la fila del estado actual ----------

  pintarMatriz(cadena, json) {
    const P = cadena.matrizVigente();
    const i = cadena.iEstado;
    const grande = cadena.n === 3;
    this.texto(X + 24, Y + 82, 'Matriz de transición P (fila = estado actual, columna = siguiente)', estilo(10.5, TEXTO.claro, { fontStyle: 'bold' }));
    this.agregar(mapaCalor(this, X + 96, Y + 122, {
      M: P, filas: cadena.estados, ancho: grande ? 72 : 62, alto: grande ? 40 : 34, decimales: 2, resaltar: i, tam: 12
    }));
    // Escala de color.
    const g = this.agregar(this.add.graphics());
    for (let s = 0; s < 100; s++) { g.fillStyle(colorCalor(s / 99), 1); g.fillRect(X + 96 + s * 2.1, Y + 300, 2.2, 10); }
    this.texto(X + 96, Y + 314, '0', estilo(9, TEXTO.tenue));
    this.texto(X + 306, Y + 314, '1', estilo(9, TEXTO.tenue)).setOrigin(1, 0);
    this.texto(X + 201, Y + 314, 'escala de blanco a rojo', estilo(9, TEXTO.tenue)).setOrigin(0.5, 0);
    const sumas = P.map((fila) => fila.reduce((s, p) => s + p, 0));
    this.texto(X + 24, Y + 336, `Cada fila suma 1: ${sumas.map((s) => numero(s, 2)).join(' · ')}. Sin valores negativos: P es estocástica.`, estilo(9.5, TEXTO.tenue));

    // Lectura de la fila activa.
    const xd = X + 384;
    const e = estiloEstado(NOMBRE[this.cadena], cadena.estado);
    this.texto(xd, Y + 104, 'Fila activa', estilo(10, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.texto(xd, Y + 120, cadena.estado, estilo(20, css(e.color), { fontStyle: 'bold' }));
    this.texto(xd, Y + 148, `Efecto: ${e.detalle}`, estilo(10, TEXTO.claro));
    this.texto(xd, Y + 168, 'En el próximo paso:', estilo(10, TEXTO.claro));
    P[i].forEach((p, j) => this.texto(xd + 12, Y + 186 + j * 16, `${cadena.estados[j].padEnd(8)} ${pct(p)}`, estiloMono(10.5, p > 0 ? TEXTO.claro : TEXTO.tenue)));
    const notas = json.referencia
      ? 'Mesas no se sortea: en cada paso se observa M(Almorzando) de la red y se discretiza en cuartos.'
      : 'En cada paso: u ~ U(0, 1) del generador con semilla; el siguiente estado es el primero con acumulada > u.';
    this.texto(xd, Y + 262, notas, estilo(9.5, TEXTO.tenue, { wordWrap: { width: 240 } }));
    if (cadena.franjas) this.texto(xd, Y + 318, `P vigente: ${cadena.franjas[cadena.franja()].nombre}`, estilo(9.5, TEXTO.naranja));
  }

  // ---------- 2. Transitorio: pi^(n) = pi^(0) · P^n y riesgo en 1, 3 y 5 pasos ----------

  pintarTransitorio(cadena, json, animar) {
    const P = cadena.matrizVigente();
    const pi0 = this.desdeFicha ? cadena.pi0 : cadena.vectorDe();
    const pin = cadena.distribucion(this.n, pi0, P);
    const origen = this.desdeFicha ? 'π^(0) de la ficha' : `e_${cadena.estado}`;
    this.texto(X + 24, Y + 82, `π^(n) = π^(0) · P^n desde ${this.desdeFicha ? 'la apertura (π^(0) de la ficha)' : 'el estado actual'}`, estilo(10.5, TEXTO.claro, { fontStyle: 'bold' }));
    // Deslizador de n (0..10) con botones.
    const x0 = X + 70;
    const x1 = X + 300;
    const yS = Y + 112;
    const g = this.agregar(this.add.graphics());
    g.lineStyle(3, 0xffffff, 0.25);
    g.lineBetween(x0, yS, x1, yS);
    for (let k = 0; k <= 10; k++) g.fillStyle(0xffffff, 0.35).fillCircle(x0 + ((x1 - x0) * k) / 10, yS, 2);
    const asa = this.agregar(this.add.circle(x0 + ((x1 - x0) * this.n) / 10, yS, 8, PALETA.espera).setStrokeStyle(2, 0xffffff, 0.8));
    const etiquetaN = this.texto(X + 352, yS - 8, `n = ${this.n}`, estiloMono(13, TEXTO.amarillo, { fontStyle: 'bold' }));
    asa.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(asa);
    // Al arrastrar se mueve el asa y la etiqueta; las barras se redibujan al soltar.
    asa.on('drag', (puntero, dx) => {
      const n = Math.round((Math.max(x0, Math.min(x1, dx)) - x0) / ((x1 - x0) / 10));
      asa.x = x0 + ((x1 - x0) * n) / 10;
      etiquetaN.setText(`n = ${n}`);
      this.nArrastre = n;
    });
    asa.on('dragend', () => {
      if (this.nArrastre != null && this.nArrastre !== this.n) { this.n = this.nArrastre; this.pintar(true); }
      this.nArrastre = null;
    });
    this.agregar(boton(this, X + 40, yS, '−', { ancho: 24, alto: 20, tam: 12, color: 0x2a3347 }, () => { this.n = Math.max(0, this.n - 1); this.pintar(true); }));
    this.agregar(boton(this, X + 330, yS, '+', { ancho: 24, alto: 20, tam: 12, color: 0x2a3347 }, () => { this.n = Math.min(10, this.n + 1); this.pintar(true); }));
    this.agregar(boton(this, X + 515, yS, this.desdeFicha ? 'Desde: π^(0) ficha' : 'Desde: estado actual', { ancho: 150, alto: 22, tam: 9.5, color: 0x2a3347 }, () => {
      this.desdeFicha = !this.desdeFicha;
      this.pintar(true);
    }));
    const colores = cadena.estados.map((e) => estiloEstado(NOMBRE[this.cadena], e).color);
    const { objetos, rects } = barras(this, X + 70, Y + 142, {
      ancho: 270, alto: 140, categorias: cadena.estados, series: [{ valores: pin, colores }], max: 1, decimales: 3
    });
    this.agregar(objetos);
    this.animarBarras(rects, animar);
    this.texto(X + 24, Y + 312, `π^(${this.n}) = ${origen} · P^${this.n} = ${vectorTexto(pin, 4)}`, estiloMono(10, TEXTO.claro));
    if (this.desdeFicha && this.n === 5) this.texto(X + 24, Y + 328, 'Igual a analisis/resultados_python.json (transitorio, n = 5).', estilo(9.5, TEXTO.verde));
    else this.texto(X + 24, Y + 328, 'Chapman-Kolmogorov: P^n es la matriz de n pasos; la fila de π^(0) da la distribución.', estilo(9.5, TEXTO.tenue));

    // Riesgo de llegar a un estado peligroso en los próximos 1, 3 y 5 pasos.
    const xr = X + 404;
    const peligro = json.peligrosos[0];
    this.texto(xr, Y + 146, `Llegar a ${peligro} en los próximos k pasos`, estilo(10, TEXTO.amarillo, { fontStyle: 'bold' }));
    [1, 3, 5].forEach((k, fila) => {
      const p = cadena.probAlcanzar(json.peligrosos, k);
      const alto = k === PASOS_RIESGO && p >= UMBRAL_RIESGO;
      this.texto(xr, Y + 170 + fila * 38, `k ≤ ${k}`, estilo(12, TEXTO.tenue));
      this.texto(xr + 70, Y + 162 + fila * 38, pct(p), estilo(24, alto ? TEXTO.amarillo : p >= 0.5 ? TEXTO.naranja : TEXTO.verde, { fontStyle: 'bold' }));
    });
    this.texto(xr, Y + 280, `Umbral del GDD: ${pct(UMBRAL_RIESGO)} en ${PASOS_RIESGO} pasos. ${this.cadena === 'oleada' ? 'Por encima, abre la línea 3.' : ''}`,
      estilo(9.5, TEXTO.tenue, { wordWrap: { width: 220 } }));
    this.texto(xr, Y + 312, `${peligro} absorbente: primera llegada.`, estilo(9, TEXTO.tenue));
  }

  // ---------- 3. Chapman-Kolmogorov: P^(m+n) = P^m · P^n ----------

  pintarCK(cadena) {
    const P = cadena.matrizVigente();
    const izquierda = potencia(P, this.m + this.nCK);
    const derecha = multiplicar(potencia(P, this.m), potencia(P, this.nCK));
    const diferencia = diferenciaMaxima(izquierda, derecha);
    this.texto(X + 24, Y + 82, 'Ecuaciones de Chapman-Kolmogorov: p_ij^(m+n) = Σ_k p_ik^(m) · p_kj^(n)', estilo(10.5, TEXTO.claro, { fontStyle: 'bold' }));
    const selector = (x, etiqueta, valor, fijar) => {
      this.texto(x, Y + 106, `${etiqueta} = ${valor}`, estiloMono(12, TEXTO.amarillo, { fontStyle: 'bold' }));
      this.agregar(boton(this, x + 70, Y + 114, '−', { ancho: 22, alto: 20, tam: 12, color: 0x2a3347 }, () => { fijar(Math.max(1, valor - 1)); this.pintar(false); }));
      this.agregar(boton(this, x + 96, Y + 114, '+', { ancho: 22, alto: 20, tam: 12, color: 0x2a3347 }, () => { fijar(Math.min(5, valor + 1)); this.pintar(false); }));
    };
    selector(X + 30, 'm', this.m, (v) => { this.m = v; });
    selector(X + 170, 'n', this.nCK, (v) => { this.nCK = v; });
    const ancho = cadena.n === 3 ? 64 : 56;
    this.texto(X + 70, Y + 150, `P^(m+n) = P^${this.m + this.nCK}`, estilo(11, TEXTO.claro, { fontStyle: 'bold' }));
    this.agregar(mapaCalor(this, X + 70, Y + 186, { M: izquierda, filas: cadena.estados, ancho, alto: 30, decimales: 4, tam: 10 }));
    const xd = X + 70 + cadena.n * ancho + 70;
    this.texto(xd, Y + 150, `P^${this.m} · P^${this.nCK}`, estilo(11, TEXTO.claro, { fontStyle: 'bold' }));
    this.agregar(mapaCalor(this, xd, Y + 186, { M: derecha, filas: cadena.estados, ancho, alto: 30, decimales: 4, tam: 10, etiquetas: false }));
    this.texto(xd - 38, Y + 186 + (cadena.n * 30) / 2 - 12, '=', estilo(22, TEXTO.verde, { fontStyle: 'bold' }));
    const iguales = diferencia < 1e-12;
    this.texto(X + 24, Y + 326, `Diferencia máxima |P^(m+n) − P^m · P^n| = ${diferencia.toExponential(1).replace('.', ',')}`, estiloMono(10.5, iguales ? TEXTO.verde : TEXTO.rojo));
    this.texto(X + 24, Y + 344, iguales
      ? 'Son iguales (error de redondeo): la probabilidad de ir de i a j en m + n pasos suma todas las rutas por un estado intermedio k.'
      : 'No coinciden: revisa P.', estilo(9.5, TEXTO.tenue, { wordWrap: { width: 590 } }));
  }

  // ---------- 4. Largo plazo: clasificación, pi contra frecuencias y dimensionamiento ----------

  pintarLargoPlazo(cadena, json, animar) {
    const clasificacion = cadena.clasificar();
    const pi = cadena.estacionaria();
    const retorno = cadena.tiemposRetorno();
    const frecuencias = cadena.frecuencias();
    this.texto(X + 24, Y + 82, 'Clasificación de estados', estilo(10.5, TEXTO.claro, { fontStyle: 'bold' }));
    this.texto(X + 24, Y + 100, 'Estado    Clase  Tipo         Periodo  1/π', estiloMono(9.5, TEXTO.tenue));
    clasificacion.estados.forEach((e, i) => {
      this.texto(X + 24, Y + 116 + i * 15,
        `${e.nombre.padEnd(9)} ${String(e.clase + 1).padEnd(6)} ${e.tipo.padEnd(12)} ${String(e.periodo ?? '–').padEnd(8)} ${numero(retorno[i], 2)}`,
        estiloMono(9.5, TEXTO.claro));
    });
    const veredicto = clasificacion.ergodica ? 'Irreducible y aperiódica: ergódica.' : 'No es ergódica.';
    this.texto(X + 24, Y + 120 + cadena.n * 15, veredicto, estilo(9.5, clasificacion.ergodica ? TEXTO.verde : TEXTO.naranja, { fontStyle: 'bold' }));

    // pi teórico contra frecuencias observadas en la partida.
    const xb = X + 352;
    this.texto(xb - 30, Y + 82, `π teórico y frecuencias de la partida (${cadena.k} pasos)`, estilo(10.5, TEXTO.claro, { fontStyle: 'bold' }));
    const series = [
      { valores: pi, color: PANEL.serieTeorica, etiqueta: 'π teórico' },
      { valores: frecuencias, color: PANEL.serieObservada, etiqueta: 'observado' }
    ];
    const { objetos, rects } = barras(this, xb, Y + 106, { ancho: 250, alto: 104, categorias: cadena.estados, series, max: 0.6, decimales: 2, tam: 8.5 });
    this.agregar(objetos);
    this.animarBarras(rects, animar);
    this.agregar(leyenda(this, xb, Y + 238, series));

    // Calculadora de dimensionamiento del GDD.
    const yc = Y + 262;
    const g = this.agregar(this.add.graphics());
    g.lineStyle(1, 0xffffff, 0.15);
    g.lineBetween(X + 16, yc - 6, X + W - 16, yc - 6);
    if (this.cadena === 'oleada') this.pintarCalculadora(pi, yc);
    else this.pintarOcupacion(pi, frecuencias, yc);
  }

  pintarCalculadora(pi, y) {
    const c = this.comedor;
    const llegadas = MARKOV.oleada.estados.map((e) => MARKOV.oleada.llegadasPorPaso[e]);
    const demanda = pi.reduce((s, p, i) => s + p * llegadas[i], 0);
    const personal = c.red.tokens('Personal_linea');
    const ciclo = TIEMPOS.presentarCarne + TIEMPOS.lectura + TIEMPOS.reaccionPiloto + (TIEMPOS.servirBase * 2) / Math.max(1, personal);
    const porLinea = PASO_K_S / ciclo;
    const abiertas = c.lineas.filter((l) => l.abierta).length;
    this.texto(X + 24, y, 'Calculadora de dimensionamiento (con π)', estilo(10.5, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.texto(X + 24, y + 18, `Demanda media π · (4; 10; 18) = ${numero(demanda, 2)} por paso (en Alta, 18)`, estilo(10, TEXTO.claro));
    this.texto(X + 24, y + 34, `Capacidad con ${personal} en la línea (servir ${numero(ciclo, 1)} s por estudiante):`, estilo(9.5, TEXTO.tenue));
    [2, 3].forEach((lineas, fila) => {
      const capacidad = lineas * porLinea;
      const actual = lineas === abiertas ? ' ← ahora' : '';
      this.texto(X + 24, y + 50 + fila * 15,
        `${lineas} líneas: ${numero(capacidad, 1)}/paso · ρ ${numero(demanda / capacidad, 2)} · Alta ${numero(18 / capacidad, 2)}${actual}`,
        estiloMono(9.5, 18 / capacidad > 1 ? TEXTO.naranja : TEXTO.verde));
    });
    this.texto(X + 24, y + 84, `Costo de la línea 3: ${COSTOS.linea3Apertura} al abrir y ${COSTOS.linea3Paso} por paso. Abierta solo en Alta (π = ${numero(pi[2], 3)}) cuesta ${numero(pi[2] * COSTOS.linea3Paso, 2)} por paso en promedio.`,
      estilo(9.5, TEXTO.tenue, { wordWrap: { width: 370 } }));
    const disponible = Boolean(c.markov) && !c.terminado && !c.gameOver;
    const linea3 = this.agregar(boton(this, X + 510, y + 30, c.lineas[2].abierta ? 'Cerrar línea 3' : `Abrir línea 3 (−${COSTOS.linea3Apertura})`,
      { ancho: 200, alto: 26, tam: 10, color: c.lineas[2].abierta ? PALETA.fallo : PALETA.operacion }, () => { entrada.linea3(); this.pintar(false); }));
    const relevo = this.agregar(boton(this, X + 510, y + 64, `Comprar permiso de relevo (−${COSTOS.relevoExtra})`,
      { ancho: 200, alto: 26, tam: 10, color: PALETA.relevo }, () => { entrada.comprarRelevo(); this.pintar(false); }));
    if (!disponible) { linea3.activar(false); relevo.activar(false); }
    this.texto(X + 420, y + 86, `Relevo ${c.red.tokens('Relevo')}/2: el permiso es un token de la red de la Fase 1.`, estilo(8.5, TEXTO.tenue));
  }

  pintarOcupacion(pi, frecuencias, y) {
    const medios = [2, 7, 12, 17.5]; // mesas ocupadas en el centro de cada cuarto
    const esperada = pi.reduce((s, p, i) => s + p * medios[i], 0);
    const observada = frecuencias.reduce((s, p, i) => s + p * medios[i], 0);
    this.texto(X + 24, y, 'Comparación con la red de Petri', estilo(10.5, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.texto(X + 24, y + 20, `Ocupación media según la cadena de referencia: ${numero(esperada, 1)} de 20 mesas.`, estilo(10, TEXTO.claro));
    this.texto(X + 24, y + 38, this.comedor.markov
      ? `Ocupación media observada en la partida (por cuartos): ${numero(observada, 1)} mesas · ahora M(Almorzando) = ${this.comedor.red.tokens('Almorzando')}.`
      : 'En el modo de la Fase 1 no hay pasos k observados.', estilo(10, TEXTO.claro));
    this.texto(X + 24, y + 62, 'Si las frecuencias se alejan de π, la red de Petri (llegadas por oleada, 20 mesas y almuerzo de 30 a 42 s) no se comporta como la cadena de referencia de la ficha: es un resultado del análisis, no un error del juego.',
      estilo(9.5, TEXTO.tenue, { wordWrap: { width: 590 } }));
  }

  // ---------- 5. Datos de la partida: P estimada y prueba chi-cuadrado ----------

  pintarDatos(cadena, json) {
    const { P: Pest, conteos, totales } = cadena.matrizEstimada();
    const chi = cadena.chiCuadrado();
    const total = totales.reduce((s, n) => s + n, 0);
    this.texto(X + 24, Y + 82, `P estimada p̂_ij = n_ij / n_i con ${total} transiciones observadas`, estilo(10.5, TEXTO.claro, { fontStyle: 'bold' }));
    const ancho = cadena.n === 3 ? 72 : 62;
    this.agregar(mapaCalor(this, X + 96, Y + 120, { M: Pest, filas: cadena.estados, ancho, alto: 36, decimales: 2, resaltar: total > 0 ? cadena.iEstado : null, tam: 11 }));
    conteos.forEach((fila, i) => fila.forEach((nij, j) => {
      this.texto(X + 96 + j * ancho + ancho - 6, Y + 120 + i * 36 + 30, `n=${nij}`, estiloMono(7.5, Pest[i][j] > 0.55 ? TEXTO.claro : TEXTO.oscuro)).setOrigin(1, 1);
    }));
    const dif = diferenciaMaxima(Pest, cadena.matrizVigente());
    this.texto(X + 24, Y + 128 + cadena.n * 36, `n_i por fila: ${totales.join(' · ')} · |P̂ − P| máxima = ${numero(dif, 3)}`, estiloMono(9.5, TEXTO.tenue));

    const xd = X + 404;
    this.texto(xd, Y + 110, 'Prueba chi-cuadrado (α = 0,05)', estilo(10.5, TEXTO.amarillo, { fontStyle: 'bold' }));
    const filas = [
      ['Transiciones', String(chi.transiciones)],
      ['χ²', numero(chi.estadistico, 3)],
      ['Grados de libertad', String(chi.gl)],
      ['Valor p', chi.transiciones > 0 ? numero(chi.valorP, 4) : '–'],
      ['Imposibles (p_ij = 0)', String(chi.imposibles)]
    ];
    filas.forEach(([nombre, valor], i) => {
      this.texto(xd, Y + 134 + i * 18, nombre, estilo(10, TEXTO.claro));
      this.texto(xd + 210, Y + 134 + i * 18, valor, estiloMono(10.5, TEXTO.amarillo)).setOrigin(1, 0);
    });
    const color = chi.transiciones === 0 ? TEXTO.tenue : chi.rechaza && chi.confiable ? TEXTO.rojo : chi.confiable ? TEXTO.verde : TEXTO.amarillo;
    const conclusion = this.texto(xd, Y + 226, chi.conclusion, estilo(9.5, color, { fontStyle: 'bold', wordWrap: { width: 216 } }));
    const nota = json.referencia
      ? 'Aquí los datos salen de la red de Petri: un rechazo dice que la ocupación real no sigue la cadena de referencia.'
      : !chi.confiable ? 'Deja correr el turno 4 a ×8 unos 100 pasos para que todos los esperados lleguen a 5.'
        : 'La oleada se sortea con P: la prueba no debería rechazarla.';
    this.texto(xd, Math.max(Y + 300, conclusion.y + conclusion.height + 8), nota, estilo(9, TEXTO.tenue, { wordWrap: { width: 216 } }));
  }
}
