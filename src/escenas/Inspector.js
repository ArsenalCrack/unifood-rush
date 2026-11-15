// Inspector de la red de Petri (tecla I): escena superpuesta que pausa la
// simulación. Muestra Pre, Post y A = Post − Pre, la cuenta de la ecuación de
// estado M_k = M_{k−1} + Aᵀ·u_k del último disparo, "probar disparo" (sin
// aplicarlo) y el árbol de cobertura desde M0 y desde el marcado actual.

import { ARBOL_PROFUNDIDAD, ARBOL_MAX_NODOS } from '../config.js';
import { PALETA, TEXTO, RADAR, estilo, estiloMono } from '../arte/paleta.js';
import { panel, boton } from '../arte/ui.js';
import { entrada } from '../entrada/gestorEntrada.js';
import { RedPetri } from '../sed/redPetri.js';
import { arbolCobertura, caminoHasta } from '../sed/cobertura.js';

const ABREV = {
  En_fila: 'Ef', Bandeja_limpia: 'BL', Personal_linea: 'PL', Con_bandeja: 'CB', Mesa_libre: 'ML', Almorzando: 'Al',
  Espacio_carro: 'EC', Bandeja_sucia: 'BS', Salida: 'Sa', Personal_lavado: 'PW', Relevo: 'Re', Minimo_lavado: 'mW', Minimo_linea: 'mL'
};
const celda = (v) => (v === Infinity ? '  ω' : String(v).padStart(3));
const ANCHO_ETIQUETA = 11;

export class Inspector extends Phaser.Scene {
  constructor() {
    super('Inspector');
  }

  create() {
    this.planta = this.scene.get('Planta');
    this.comedor = this.planta.comedor;
    this.red = this.comedor.red;
    this.contenido = [];
    this.prueba = null; // transición elegida en "probar disparo"

    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.55).setInteractive();
    panel(this, 8, 8, 944, 524, { alfa: 0.98 });
    this.add.text(20, 15, 'INSPECTOR DE LA RED DE PETRI', estilo(14, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.add.text(262, 18, `simulación en pausa · red ${this.comedor.monitor ? 'con monitores' : 'de la ficha'} · |P| = ${this.red.nP}, |T| = ${this.red.nT}`, estilo(10, TEXTO.tenue));
    boton(this, 926, 24, 'X', { ancho: 26, alto: 22, tam: 11, color: 0x2a3347 }, () => entrada.cerrar());
    this.botonEcuacion = boton(this, 82, 50, 'Ecuación de estado', { ancho: 136, alto: 22, tam: 10 }, () => this.abrir('ecuacion'));
    this.botonArbol = boton(this, 226, 50, 'Árbol de cobertura', { ancho: 136, alto: 22, tam: 10 }, () => this.abrir('arbol'));
    this.anchoLetra = this.add.text(0, -50, '0000000000', estiloMono(10)).width / 10;
    this.abrir('ecuacion');
  }

  abrir(pestana) {
    for (const o of this.contenido) o.destroy();
    this.contenido = [];
    this.botonEcuacion.fijarColor(pestana === 'ecuacion' ? PALETA.mantenimiento : 0x2a3347);
    this.botonArbol.fijarColor(pestana === 'arbol' ? PALETA.mantenimiento : 0x2a3347);
    this.pestana = pestana;
    if (pestana === 'ecuacion') this.pintarEcuacion(); else this.pintarArbol();
  }

  texto(x, y, cadena, formato) {
    const t = this.add.text(x, y, cadena, formato);
    this.contenido.push(t);
    return t;
  }

  encabezado() {
    return ' '.repeat(ANCHO_ETIQUETA) + this.red.lugares.map((l) => ABREV[l.nombre].padStart(3)).join('');
  }

  // Una fila de números bajo el encabezado de lugares.
  fila(x, y, etiqueta, valores, color = TEXTO.claro) {
    return this.texto(x, y, etiqueta.padEnd(ANCHO_ETIQUETA) + valores.map(celda).join(''), estiloMono(10, color));
  }

  // Tabla |T| x |P| con los nombres de lugares y transiciones.
  matriz(x, y, titulo, datos) {
    const habilitadas = new Set(this.red.habilitadas());
    this.texto(x, y, titulo, estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.texto(x, y + 16, this.encabezado(), estiloMono(10, TEXTO.tenue));
    datos.forEach((valores, t) => {
      // Las transiciones habilitadas en el marcado actual se resaltan en verde.
      this.fila(x, y + 29 + t * 12, this.red.transiciones[t].nombre, valores, habilitadas.has(t) ? TEXTO.verde : TEXTO.claro);
    });
  }

  // Marca en rojo una casilla de una fila (el lugar que no alcanza).
  marcar(x, y, columna) {
    const g = this.add.graphics();
    g.fillStyle(PALETA.fallo, 0.55);
    g.fillRect(x + (ANCHO_ETIQUETA + columna * 3) * this.anchoLetra, y - 1, 3 * this.anchoLetra, 13);
    this.contenido.push(g);
  }

  // ---------- pestaña Ecuación de estado ----------

  pintarEcuacion() {
    const red = this.red;
    const paso = (ANCHO_ETIQUETA + red.nP * 3) * this.anchoLetra + 18;
    this.matriz(20, 70, 'Pre  (entradas)', red.pre);
    this.matriz(20 + paso, 70, 'Post  (salidas)', red.post);
    this.matriz(20 + 2 * paso, 70, 'A = Post − Pre', red.A);
    this.texto(20, 174, 'Verde: transición habilitada en el marcado actual (M ≥ Pre). PIPE2 muestra Aᵀ (lugares en filas).', estilo(9.5, TEXTO.tenue));

    // Cuenta del último disparo.
    const u = red.ultimo;
    const y0 = 196;
    this.texto(20, y0, 'Ecuación de estado del último disparo:  M_k = M_{k−1} + Aᵀ · u_k', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.texto(20, y0 + 17, this.encabezado(), estiloMono(10, TEXTO.tenue));
    if (u) {
      const delta = red.A[u.t];
      const cuenta = u.anterior.map((m, p) => m + delta[p]);
      const coincide = cuenta.every((m, p) => m === u.marcado[p]);
      this.fila(20, y0 + 30, 'M_{k-1}', u.anterior);
      this.fila(20, y0 + 42, 'Aᵀ·u_k', delta, TEXTO.naranja);
      this.fila(20, y0 + 54, 'M_k', u.marcado, TEXTO.verde);
      this.texto(20 + paso + 40, y0 + 30, `u_k = (${u.u.join(', ')})  →  ${u.nombre}`, estiloMono(10, TEXTO.naranja));
      this.texto(20 + paso + 40, y0 + 44, `k = ${red.secuencia.length} disparos en este turno`, estiloMono(10, TEXTO.tenue));
      this.texto(20 + paso + 40, y0 + 58, coincide ? 'Comprobado: M_{k−1} + Aᵀ·u_k = M_k' : 'ERROR: la cuenta no coincide', estilo(10, coincide ? TEXTO.verde : TEXTO.rojo, { fontStyle: 'bold' }));
    } else {
      this.texto(20, y0 + 32, 'Todavía no se ha disparado ninguna transición con esta red.', estilo(10, TEXTO.tenue));
    }
    this.fila(20, y0 + 70, 'M actual', red.M, TEXTO.claro);
    this.texto(20 + paso + 40, y0 + 72, 'M actual incluye los tokens de eventos externos (llegadas y relevo).', estilo(9.5, TEXTO.tenue));

    // Probar disparo: el marcado que resultaría, sin aplicarlo.
    const y1 = 296;
    this.texto(20, y1, 'Probar disparo (no cambia el marcado):', estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    red.transiciones.forEach((t, i) => {
      this.contenido.push(boton(this, 318 + i * 104, y1 + 8, t.nombre, {
        ancho: 98, alto: 22, tam: 10, color: this.prueba === i ? PALETA.mantenimiento : 0x2a3347
      }, () => { this.prueba = i; this.abrir('ecuacion'); }));
    });
    if (this.prueba === null) {
      this.texto(20, y1 + 30, 'Elige una transición para ver M\' = M + Aᵀ·u sin dispararla.', estilo(10, TEXTO.tenue));
    } else {
      const t = this.prueba;
      const nombre = red.transiciones[t].nombre;
      const faltantes = red.faltantes(t);
      this.texto(20, y1 + 30, this.encabezado(), estiloMono(10, TEXTO.tenue));
      this.fila(20, y1 + 43, 'M', red.M);
      this.fila(20, y1 + 55, `Pre(${nombre.slice(2, 8)})`, red.pre[t], TEXTO.tenue);
      this.fila(20, y1 + 67, 'Aᵀ·u', red.A[t], TEXTO.naranja);
      if (faltantes.length === 0) {
        this.fila(20, y1 + 79, 'M\'', red.resultado(t), TEXTO.verde);
        this.texto(20, y1 + 96, `${nombre} está habilitada: M ≥ Pre en todos sus lugares de entrada. M' es el marcado que resultaría.`, estilo(10, TEXTO.verde));
      } else {
        // La tabla señala los lugares que no alcanzan.
        for (const f of faltantes) { this.marcar(20, y1 + 43, red.iP(f.lugar)); this.marcar(20, y1 + 55, red.iP(f.lugar)); }
        this.texto(20, y1 + 82, `${nombre} NO está habilitada: ${faltantes.map((f) => `${f.lugar} tiene ${f.tiene} y necesita ${f.necesita} (${f.motivo})`).join('; ')}.`,
          estilo(10, TEXTO.rojo, { wordWrap: { width: 900 } }));
      }
    }

    // Conflictos e invariantes P en el marcado actual.
    const y2 = 428;
    const conflictos = red.conflictos();
    this.texto(20, y2, 'Conflictos (choice): ' + (conflictos.length
      ? conflictos.map((c) => `${c.transiciones.join(' y ')} compiten por ${c.lugar}`).join(' · ')
      : 'ninguno en este marcado'), estilo(10, conflictos.length ? TEXTO.naranja : TEXTO.tenue, { wordWrap: { width: 900 } }));
    this.texto(20, y2 + 30, 'Invariantes P: ' + red.json.invariantes.map((inv) =>
      `${Object.keys(inv.lugares).map((l) => ABREV[l]).join('+')} = ${red.valorInvariante(inv)}`).join('   '), estiloMono(10, TEXTO.verde));
    this.texto(20, y2 + 46, `Marcado muerto: ${red.esMuerto() ? 'sí' : 'no'} · reposo: ${red.esReposo() ? 'sí' : 'no'} · interbloqueo: ${red.esBloqueo() ? 'SÍ' : 'no'}`
      + ` · radar: ${this.comedor.radar.estado}`, estilo(10, red.esBloqueo() ? TEXTO.rojo : TEXTO.claro));
    this.texto(20, y2 + 64, 'Abreviaturas: ' + red.lugares.map((l) => `${ABREV[l.nombre]} ${l.nombre}`).join(' · '), estilo(8.5, TEXTO.tenue, { wordWrap: { width: 910 } }));
  }

  // ---------- pestaña Árbol de cobertura ----------

  pintarArbol() {
    // Desde M0: la misma red con su marcado inicial.
    const inicial = new RedPetri(this.red.json);
    const desdeM0 = arbolCobertura(inicial, inicial.M0, ARBOL_MAX_NODOS);
    const desdeM = arbolCobertura(this.red, this.red.M, ARBOL_MAX_NODOS, { profundidadMax: ARBOL_PROFUNDIDAD });
    this.detalle = this.texto(20, 470, 'Pasa el cursor (o toca) un nodo para ver su marcado y el camino desde la raíz.', estiloMono(9.5, TEXTO.claro, { wordWrap: { width: 910 } }));
    this.dibujarArbol(inicial, desdeM0, { x: 20, y: 96, w: 330, h: 330 }, 'Desde M0 (árbol completo, con ω si la red no fuera acotada)', true);
    this.dibujarArbol(this.red, desdeM, { x: 372, y: 96, w: 568, h: 330 }, `Desde el marcado actual, profundidad ${ARBOL_PROFUNDIDAD}`, false);
    this.texto(20, 440, 'Blanco: marcado nuevo · gris: duplicado · azul: muerto de reposo · rojo: interbloqueo · amarillo: frontera sin expandir',
      estilo(9.5, TEXTO.tenue));
  }

  dibujarArbol(red, arbol, area, titulo, conEtiquetas) {
    this.texto(area.x, area.y - 26, titulo, estilo(11, TEXTO.amarillo, { fontStyle: 'bold' }));
    this.texto(area.x, area.y - 11, `${arbol.nodos.length} nodos · ${arbol.marcadosDistintos} marcados distintos · ${arbol.muertos.length} muertos · `
      + `${arbol.bloqueos.length} interbloqueos${arbol.truncado ? ' · truncado' : ''}${arbol.acotada ? '' : ' · no acotada (ω)'}`, estilo(9.5, TEXTO.claro));
    const niveles = [];
    for (const nodo of arbol.nodos) (niveles[nodo.profundidad] ??= []).push(nodo);
    const altoNivel = Math.min(70, area.h / Math.max(1, niveles.length - 1 || 1));
    const posicion = new Map();
    niveles.forEach((nivel, d) => nivel.forEach((nodo, i) => {
      posicion.set(nodo.id, { x: area.x + ((i + 0.5) / nivel.length) * area.w, y: area.y + 14 + d * altoNivel });
    }));
    const g = this.add.graphics();
    this.contenido.push(g);
    g.lineStyle(1, 0xffffff, 0.22);
    for (const arista of arbol.aristas) {
      const a = posicion.get(arista.de);
      const b = posicion.get(arista.a);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    const radio = arbol.nodos.length > 120 ? 2.2 : arbol.nodos.length > 40 ? 3.5 : 7;
    for (const nodo of arbol.nodos) {
      const p = posicion.get(nodo.id);
      const esBloqueo = nodo.tipo === 'muerto' && !nodo.reposo;
      const color = esBloqueo ? RADAR.rojo : nodo.tipo === 'muerto' ? PALETA.mantenimiento
        : nodo.tipo === 'duplicado' ? 0x6b7686 : nodo.tipo === 'frontera' ? RADAR.amarillo : 0xf3f1e7;
      g.fillStyle(color, 1);
      g.fillCircle(p.x, p.y, esBloqueo ? radio + 1.5 : radio);
      const zona = this.add.zone(p.x, p.y, Math.max(8, radio * 2 + 4), Math.max(8, radio * 2 + 4)).setInteractive();
      const mostrar = () => this.detalle.setText(`${nodo.tipo}${nodo.reposo ? ' (reposo)' : esBloqueo ? ' (INTERBLOQUEO)' : ''} · camino: ${caminoHasta(arbol, nodo.id).join(' → ') || 'raíz'}\n`
        + red.lugares.map((l, i) => `${ABREV[l.nombre]}=${nodo.marcado[i] === Infinity ? 'ω' : nodo.marcado[i]}`).join(' '));
      zona.on('pointerover', mostrar);
      zona.on('pointerdown', mostrar);
      this.contenido.push(zona);
      if (conEtiquetas && arbol.nodos.length <= 12) {
        const m = red.comoObjeto(nodo.marcado);
        this.texto(p.x, p.y + 10, `${nodo.transicion ? nodo.transicion.replace('t_a_', '→') + '\n' : 'M0\n'}línea ${m.Personal_linea} · lavado ${m.Personal_lavado}\nRelevo ${m.Relevo}`,
          estilo(8, TEXTO.tenue, { align: 'center' })).setOrigin(0.5, 0);
      }
    }
  }
}
