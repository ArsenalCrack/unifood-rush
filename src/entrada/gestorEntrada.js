// Gestor de entrada: mouse, teclado y táctil producen las MISMAS acciones y
// se emiten como eventos. Las escenas no leen teclas ni punteros directamente
// para actuar sobre el modelo: llaman a estos métodos o escuchan estas acciones.
//
// Acciones: seleccionar(idEntidad), solicitarEvento(idEntidad, evento, extra),
// solicitarDisparo(transicion), servirLinea(idLinea), pausa, inspector,
// velocidad(1|2|4), cerrar, piloto, monitor, fps.

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

  // Teclado: P pausa, I inspector, 1-2-4 velocidad, Esc cerrar, Q/W servir,
  // L/V relevo, A piloto, M monitores, F1 fps.
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
        case '1': case '2': case '4': this.velocidad(Number(tecla.key)); break;
        case 'q': this.servirLinea(1); break;
        case 'w': this.servirLinea(2); break;
        case 'l': this.solicitarDisparo('t_a_linea'); break;
        case 'v': this.solicitarDisparo('t_a_lavado'); break;
        case 'a': this.piloto(); break;
        case 'm': this.monitor(); break;
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
}

export const entrada = new GestorEntrada();
