// Lenguaje de reparación: una palabra w repara la máquina solo si w ∈ L.
// L se comprueba de dos formas que deben coincidir (teorema de Kleene):
//   1) con la expresión regular anclada (^...$) de la ficha, y
//   2) con el DFA mínimo equivalente (el mismo que se verifica en JFLAP).
// Núcleo formal: sin Phaser ni DOM.

import { Automata } from './automata.js';

export class Lenguaje {
  constructor(json) {
    if (!json.expresion.startsWith('^') || !json.expresion.endsWith('$')) {
      throw new Error('La expresión regular debe estar anclada con ^ y $');
    }
    this.json = json;
    this.expresion = json.expresion;
    this.regexp = new RegExp(json.expresion);
    this.dfa = new Automata(json.dfa);
    this.alfabeto = json.dfa.eventos.map((e) => e.id);
  }

  // w ∈ L según la expresión regular.
  validarRegExp(palabra) {
    return this.regexp.test(palabra);
  }

  // w ∈ L según el DFA (δ parcial: un símbolo sin transición rechaza).
  validarDFA(palabra) {
    return this.dfa.acepta(palabra);
  }

  // Valida con los dos métodos. "pertenece" exige que ambos acepten.
  validar(palabra) {
    const regexp = this.validarRegExp(palabra);
    const dfa = this.validarDFA(palabra);
    return { palabra, regexp, dfa, coincide: regexp === dfa, pertenece: regexp && dfa };
  }

  // Recorre el DFA símbolo por símbolo para mostrar el progreso en la consola.
  // Devuelve cada paso, el estado final, si la palabra es aceptada, el primer
  // error (símbolo sin transición y lo que se esperaba) y qué símbolos siguen.
  analizar(palabra) {
    const pasos = [];
    let q = this.dfa.inicial;
    let error = null;
    [...palabra].forEach((simbolo, posicion) => {
      if (error) { pasos.push({ simbolo, origen: null, destino: null, ok: false }); return; }
      const destino = this.dfa.siguiente(q, simbolo);
      if (destino === undefined) {
        error = { posicion, simbolo, estado: q, esperados: this.dfa.eventosActivos(q) };
        pasos.push({ simbolo, origen: q, destino: null, ok: false });
      } else {
        pasos.push({ simbolo, origen: q, destino, ok: true });
        q = destino;
      }
    });
    return {
      pasos,
      estadoFinal: error ? null : q,
      aceptada: !error && this.dfa.esMarcado(q),
      error,
      esperados: error ? [] : this.dfa.eventosActivos(q)
    };
  }
}
