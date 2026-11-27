// Gestor de entrada: mouse, teclado y táctil producen las MISMAS acciones y
// se emiten como eventos. Las escenas no leen teclas ni punteros directamente
// para actuar sobre el modelo: llaman a estos métodos o escuchan estas acciones.
//
// Acciones: seleccionar(idEntidad), solicitarEvento(idEntidad, evento, extra),
// solicitarDisparo(transicion), servirLinea(idLinea), pausa, inspector,
// velocidad(1|2|4|8), cerrar, piloto, monitor, fps.
// Fase 2: markov(cadena), log, exportar, linea3, comprarRelevo, calor, fin.

class GestorEntrada extends Phaser.Events.EventEmitter {
  constructor() {
    super();
    this.capturaTexto = null; // función que recibe las teclas mientras la consola está abierta
  }

  // Quita todos los oyentes (al empezar un turno nuevo).
  reiniciar() {
    this.removeAllListeners();
    this.capturaTexto = null;
  }

  // Teclado: P pausa, I inspector, 1-2-4-8 velocidad, Esc cerrar, Q/W servir,
  // → / ← (o V) relevo a la línea / al lavado, A piloto, N monitores, F1 fps.
  // Fase 2 (GDD 16.8): M panel de Markov, L últimos eventos, E exportar el log,
  // 3 línea 3, H mapa de calor. En la Fase 1 M era monitores y L relevo a la línea.
  conectarTeclado(escena) {
    const atendidas = new WeakSet();
    escena.input.keyboard.on('keydown', (tecla) => {
      // Si llegan varias teclas en el mismo cuadro, Phaser vuelve a despachar las
      // que siguen en su cola: cada evento se atiende una sola vez.
      if (atendidas.has(tecla)) return;
      atendidas.add(tecla);
      if (tecla.key === 'F1') { tecla.preventDefault(); this.emit('fps'); return; }
      if (tecla.key === 'Escape') { this.cerrar(); return; }
      if (this.capturaTexto) { this.capturaTexto(tecla); return; } // la consola de reparación escribe
      if (tecla.repeat) return; // mantener pulsada una tecla no repite la acción
      switch (tecla.key.toLowerCase()) {
        case 'p': this.pausa(); break;
        case 'i': this.inspector(); break;
        case '1': case '2': case '4': case '8': this.velocidad(Number(tecla.key)); break;
        case 'q': this.servirLinea(1); break;
        case 'w': this.servirLinea(2); break;
        case 'arrowright': tecla.preventDefault(); this.solicitarDisparo('t_a_linea'); break;
        case 'arrowleft': tecla.preventDefault(); this.solicitarDisparo('t_a_lavado'); break;
        case 'v': this.solicitarDisparo('t_a_lavado'); break;
        case 'a': this.piloto(); break;
        case 'n': this.monitor(); break;
        case 'm': this.markov(); break;
        case 'l': this.log(); break;
        case 'e': this.exportar(); break;
        case '3': this.linea3(); break;
        case 'h': this.calor(); break;
        default:
      }
    });
  }

  // Las mismas acciones para clic, toque y botones en pantalla.
  seleccionar(idEntidad) { this.emit('seleccionar', idEntidad); }
  solicitarEvento(idEntidad, evento, extra = {}) { this.emit('solicitarEvento', idEntidad, evento, extra); }
  solicitarDisparo(transicion) { this.emit('solicitarDisparo', transicion); }
  servirLinea(idLinea) { this.emit('servirLinea', idLinea); }
  pausa() { this.emit('pausa'); }
  inspector() { this.emit('inspector'); }
  velocidad(v) { this.emit('velocidad', v); }
  cerrar() { this.emit('cerrar'); }
  piloto() { this.emit('piloto'); }
  monitor() { this.emit('monitor'); }
  // Fase 2
  markov(cadena = null) { this.emit('markov', cadena); }
  log() { this.emit('log'); }
  exportar(formato = null) { this.emit('exportar', formato); }
  linea3() { this.emit('linea3'); }
  comprarRelevo() { this.emit('comprarRelevo'); }
  calor() { this.emit('calor'); }
  fin() { this.emit('fin'); }
}

export const entrada = new GestorEntrada();
