// La multitud de estudiantes: un grupo de objetos de Phaser con reutilización
// de sprites y orden de profundidad por (x + y). Cada sprite muestra el estado
// del autómata Estudiante de su entidad y nunca lo cambia: solo escucha al núcleo.

import { MAPA, TIEMPOS } from '../config.js';
import { poner, cambiar } from '../arte/texturas.js';
import { colocar, caminar, duracionRuta, volar } from './movimiento.js';

const VELOCIDAD = 5; // celdas por segundo de simulación

// Celda de la mesa i (0..19) y asiento del estudiante (detrás de la mesa).
export function celdaMesa(i) {
  const { xs, ys } = MAPA.mesas;
  return { x: xs[i % xs.length], y: ys[Math.floor(i / xs.length)] };
}
const asiento = (i) => ({ x: celdaMesa(i).x - 0.4, y: celdaMesa(i).y - 0.4 });

export class Multitud {
  constructor(escena, comedor) {
    this.escena = escena;
    this.comedor = comedor;
    this.grupo = escena.add.group();   // grupo de objetos: la multitud
    this.sprites = new Map();          // id de estudiante -> sprite
    this.alSeleccionar = null;         // lo fija la escena

    comedor.on('llegada', (e) => this.llegar(e));
    comedor.on('estudiante', (e) => this.cambiarEstado(e));
    comedor.on('torniquete', (e) => { if (e.evento === 'acceso_ok' || e.evento === 'rechazo') this.reaccionar(e); });
  }

  linea(id) {
    return MAPA.lineas[id - 1];
  }

  // Posición k de la fila: 8 puestos dibujados por fila y, después, el desborde afuera.
  celdaFila(idLinea, k) {
    const y = this.linea(idLinea).y;
    if (k < MAPA.posicionesFila) return { x: MAPA.cabezaFila - k, y };
    const extra = k - MAPA.posicionesFila;
    return { x: -3.3 - (extra % 5) * 0.5, y: y + (Math.floor(extra / 5) % 2 === 0 ? -0.4 : 0.4) };
  }

  // Toma un sprite libre del grupo (o crea uno) para el estudiante.
  crear(id, celda, textura) {
    let sprite = this.grupo.getFirstDead(false);
    if (sprite) {
      cambiar(sprite, textura).setActive(true).setVisible(true).setAlpha(1);
    } else {
      sprite = poner(this.escena, textura, 0, 0);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', (puntero, lx, ly, evento) => {
        evento.stopPropagation();
        if (this.alSeleccionar && sprite.active) this.alSeleccionar(sprite.idEntidad, sprite);
      });
      this.grupo.add(sprite);
    }
    sprite.idEntidad = id;
    sprite.celda = { ...celda };
    sprite.sesgo = 0;
    this.sprites.set(id, colocar(sprite));
    return sprite;
  }

  liberar(id) {
    const sprite = this.sprites.get(id);
    if (!sprite) return;
    if (sprite.caminata) { sprite.caminata.stop(); sprite.caminata = null; }
    this.grupo.killAndHide(sprite);
    this.sprites.delete(id);
  }

  // Reordena los sprites de una fila según el orden del núcleo.
  ordenarFila(idLinea) {
    this.comedor.linea(idLinea).fila.forEach((id, k) => {
      const sprite = this.sprites.get(id);
      if (!sprite) return;
      const destino = this.celdaFila(idLinea, k);
      caminar(this.escena, sprite, [destino], duracionRuta(sprite.celda, [destino], VELOCIDAD));
    });
  }

  llegar({ id, linea }) {
    this.crear(id, { x: -7, y: this.linea(linea).y }, 'est_En_Fila');
    this.ordenarFila(linea);
  }

  // Pequeño salto cuando el torniquete responde al estudiante en el lector.
  reaccionar({ estudiante, evento }) {
    const sprite = this.sprites.get(estudiante);
    if (!sprite) return;
    this.escena.tweens.add({
      targets: sprite, scaleY: evento === 'acceso_ok' ? 1.12 : 0.9, duration: 90, yoyo: true
    });
  }

  // El núcleo avisa de un evento del autómata Estudiante: cambia textura y camina.
  cambiarEstado(e) {
    const sprite = this.sprites.get(e.id);
    const est = this.comedor.estudiantes.get(e.id);
    if (!sprite) return;
    const escena = this.escena;
    switch (e.evento) {
      case 'servir': {
        const m = this.linea(e.linea).mostrador;
        cambiar(sprite, 'est_Recibiendo_Bandeja');
        caminar(escena, sprite, [m], 450);
        volar(escena, 'bandeja_limpia', MAPA.pilaLimpias, m, 380); // token Bandeja_limpia -> Con_bandeja
        this.ordenarFila(e.linea);
        break;
      }
      case 'buscar_mesa': {
        cambiar(sprite, 'est_Buscando_Mesa');
        const k = this.comedor.esperandoMesa.indexOf(e.id);
        const espera = { x: MAPA.espera.x + (k % 3) * 0.55, y: MAPA.espera.y + Math.floor(k / 3) * 0.55 };
        caminar(escena, sprite, [{ x: 9.3, y: sprite.celda.y }, espera], 900);
        break;
      }
      case 'sentarse': {
        cambiar(sprite, 'est_Almorzando');
        const a = asiento(e.mesa);
        const pasillo = celdaMesa(e.mesa).y - 1;
        const ruta = [{ x: 9.3, y: sprite.celda.y }, { x: 9.3, y: pasillo }, { x: a.x, y: pasillo }, a];
        sprite.sesgo = -3; // el asiento queda detrás de la mesa
        caminar(escena, sprite, ruta, duracionRuta(sprite.celda, ruta, VELOCIDAD));
        break;
      }
      case 'fin_comer':
        // Sigue en Almorzando: espera un token de Espacio_carro para terminar.
        if (est && est.automata.estado === 'Almorzando') cambiar(sprite, 'est_espera_carro');
        break;
      case 'terminar': {
        cambiar(sprite, 'est_Entregando_Menaje');
        sprite.sesgo = 0;
        const pasillo = celdaMesa(e.mesa).y - 1;
        const junto = { x: MAPA.carro.x + 1.1, y: MAPA.carro.y + 0.3 };
        const ruta = [{ x: sprite.celda.x, y: pasillo }, { x: 9.3, y: pasillo }, { x: 9.3, y: junto.y }, junto];
        caminar(escena, sprite, ruta, TIEMPOS.entregar * 1000 * 0.92);
        // El token Bandeja_sucia viaja de la mesa al carro.
        volar(escena, 'bandeja_sucia', celdaMesa(e.mesa), MAPA.carro, 700);
        break;
      }
      case 'entregar': {
        cambiar(sprite, 'est_Salida');
        this.sprites.delete(e.id); // ya no es una entidad del núcleo: solo sale caminando
        const ruta = [{ x: 4.6, y: MAPA.salida.y }, { x: -1, y: MAPA.salida.y }, { x: -5, y: MAPA.salida.y }];
        caminar(escena, sprite, ruta, duracionRuta(sprite.celda, ruta, VELOCIDAD), () => this.grupo.killAndHide(sprite));
        escena.tweens.add({ targets: sprite, alpha: 0.35, delay: 1600, duration: 700 });
        break;
      }
      default:
    }
  }

  sprite(id) {
    return this.sprites.get(id) ?? null;
  }

  // Tras restaurar una partida: reconstruye todos los sprites desde el núcleo.
  reconstruir() {
    this.grupo.getChildren().forEach((s) => {
      if (s.caminata) { s.caminata.stop(); s.caminata = null; }
      this.escena.tweens.killTweensOf(s);
      this.grupo.killAndHide(s);
    });
    this.sprites.clear();
    const c = this.comedor;
    for (const est of c.estudiantes.values()) {
      const estado = est.automata.estado;
      const linea = c.linea(est.linea);
      let celda;
      if (estado === 'En_Fila') celda = this.celdaFila(est.linea, linea.fila.indexOf(est.id));
      else if (estado === 'Recibiendo_Bandeja') celda = this.linea(est.linea).mostrador;
      else if (estado === 'Buscando_Mesa') celda = MAPA.espera;
      else if (estado === 'Almorzando') celda = asiento(est.mesa);
      else celda = { x: MAPA.carro.x + 1.1, y: MAPA.carro.y + 0.3 };
      const textura = estado === 'Almorzando' && c.quierenTerminar.includes(est.id) ? 'est_espera_carro' : `est_${estado}`;
      const sprite = this.crear(est.id, celda, textura);
      if (estado === 'Almorzando') { sprite.sesgo = -3; colocar(sprite); }
    }
  }
}
