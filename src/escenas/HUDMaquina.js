// HUD de máquina: escena superpuesta que se lanza en paralelo a la planta (no
// pausa la simulación). Muestra en vivo el autómata de la entidad elegida:
// grafo con el estado actual iluminado, un botón por evento de Γ(q) (verde
// controlable, gris no controlable, rojo deshabilitado por el supervisor), la
// palabra observada, la pestaña Composición y la consola de reparación.

import { PALETA, TEXTO, ESTADOS, estilo, estiloMono, css } from '../arte/paleta.js';
import { panel, boton } from '../arte/ui.js';
import { crearGrafo, leyendaEventos } from '../arte/grafo.js';
import { entrada } from '../entrada/gestorEntrada.js';
import { puedeConjunto } from '../sed/composicion.js';
import { MODELOS } from '../sed/modelos/index.js';

const X = 400;
const Y = 112;
const W = 552;
const H = 304;
const GRIS = 0x55606e;

export class HUDMaquina extends Phaser.Scene {
  constructor() {
    super('HUDMaquina');
  }

  init(datos) {
    this.id = datos.id;
  }

  create() {
    this.planta = this.scene.get('Planta');
    this.comedor = this.planta.comedor;
    this.esTorniquete = this.id.startsWith('T');
    this.pestana = 'automata';
    this.palabra = '';       // texto de la consola de reparación
    this.mensaje = '';       // resultado del último intento
    this.dinamicos = [];     // objetos que se rehacen al cambiar el estado
    this.fijos = [];         // objetos de la pestaña actual
    this.grafo = null;
    this.firma = null;

    this.add.zone(X + W / 2, Y + H / 2, W, H).setInteractive(); // el panel absorbe los clics
    panel(this, X, Y, W, H, { alfa: 0.96 });
    this.titulo = this.add.text(X + 12, Y + 7, '', estilo(13, TEXTO.claro, { fontStyle: 'bold' }));
    this.textoEstado = this.add.text(X + W - 40, Y + 8, '', estilo(12, TEXTO.claro, { fontStyle: 'bold' })).setOrigin(1, 0);
    boton(this, X + W - 18, Y + 17, 'X', { ancho: 24, alto: 22, tam: 11, color: 0x2a3347 }, () => entrada.cerrar());
    this.botonAutomata = boton(this, X + 58, Y + 38, 'Autómata', { ancho: 92, alto: 20, tam: 10 }, () => this.abrirPestana('automata'));
    this.botonComposicion = boton(this, X + 158, Y + 38, 'Composición', { ancho: 100, alto: 20, tam: 10 }, () => this.abrirPestana('composicion'));
    this.info = this.add.text(X + 12, Y + 234, '', estilo(10, TEXTO.tenue, { wordWrap: { width: W - 24 } }));

    this.events.once('shutdown', () => {
      entrada.capturaTexto = null;
      if (this.grafo) this.grafo.destruir();
    });
    this.abrirPestana('automata');
  }

  // Autómatas de la entidad seleccionada (o null si el estudiante ya salió).
  entidad() {
    if (this.esTorniquete) {
      const linea = this.comedor.linea(Number(this.id.slice(1)));
      return { automata: linea.torniquete, linea, json: MODELOS.torniquete };
    }
    const est = this.comedor.estudiantes.get(this.id);
    return est ? { automata: est.automata, est, linea: this.comedor.linea(est.linea), json: MODELOS.estudiante } : null;
  }

  limpiar(lista) {
    for (const objeto of lista) objeto.destroy();
    lista.length = 0;
  }

  abrirPestana(pestana) {
    const e = this.entidad();
    if (!e) return;
    this.pestana = pestana;
    this.limpiar(this.fijos);
    if (this.grafo) { this.grafo.destruir(); this.grafo = null; }
    this.botonAutomata.fijarColor(pestana === 'automata' ? PALETA.mantenimiento : 0x2a3347);
    this.botonComposicion.fijarColor(pestana === 'composicion' ? PALETA.mantenimiento : 0x2a3347);
    if (pestana === 'automata') {
      // El grafo se dibuja desde el JSON del modelo, con la distribución del .jff.
      this.grafo = crearGrafo(this, e.json, { x: X + 8, y: Y + 52, w: W - 16, h: 134 });
      this.fijos.push(this.add.text(X + 12, Y + 190, leyendaEventos(e.json), estilo(9, TEXTO.tenue)));
    } else if (this.esTorniquete) {
      this.grafo = crearGrafo(this, MODELOS.contadorRechazos, { x: X + 8, y: Y + 150, w: W - 16, h: 84 }, { radio: 13 });
    }
    this.firma = null; // fuerza el repintado en el siguiente update
  }

  update() {
    const e = this.entidad();
    if (!e) { entrada.cerrar(); return; }
    const linea = e.linea;
    const firma = [e.automata.estado, e.automata.historial.length, linea.torniquete.estado, linea.contador.estado,
      e.est ? e.est.registro.estado : '', this.pestana].join('|');
    if (firma === this.firma) return;
    const cambioDeEstado = this.firma !== null && this.pasos !== e.automata.historial.length;
    this.firma = firma;
    this.pasos = e.automata.historial.length;
    this.repintar(e, cambioDeEstado);
  }

  repintar(e, cambioDeEstado) {
    const { automata, linea } = e;
    const color = ESTADOS[e.json.nombre][automata.estado].color;
    this.titulo.setText(this.esTorniquete ? `${this.id} · Torniquete de la línea ${linea.id}` : `${this.id} · Estudiante de la línea ${linea.id}`);
    this.textoEstado.setText(automata.estado).setColor(css(color));
    this.limpiar(this.dinamicos);
    if (this.pestana === 'automata') this.pintarAutomata(e, cambioDeEstado);
    else this.pintarComposicion(e);
  }

  // ---------- pestaña Autómata ----------

  pintarAutomata(e, cambioDeEstado) {
    const { automata, linea } = e;
    this.grafo.actualizar(automata.estado);
    const ultimo = automata.historial.at(-1);
    if (cambioDeEstado && ultimo) this.grafo.parpadear(ultimo.origen, ultimo.destino);

    // Un botón por evento de Γ(q).
    const deshabilitados = e.est ? this.comedor.eventosDeshabilitados(e.est) : [];
    let razonVisible = '';
    automata.eventosActivos().forEach((evento, i) => {
      const datos = automata.eventos.get(evento);
      const bloqueo = deshabilitados.find((d) => d.evento === evento);
      // En el torniquete, la composición con Contador_Rechazos puede impedir un evento.
      const sincroniza = !this.esTorniquete || puedeConjunto(evento, [linea.torniquete, linea.contador]);
      const colorBoton = bloqueo ? PALETA.fallo : datos.controlable ? PALETA.operacion : GRIS;
      const razon = bloqueo ? `Supervisor: ${bloqueo.razon}`
        : !sincroniza ? `${evento} no está habilitado en Torniquete ‖ Contador_Rechazos (contador en ${linea.contador.estado})`
          : datos.controlable ? `${evento} es controlable y está habilitado` : `${evento} no es controlable: ocurre solo, lo programa el reloj`;
      const b = boton(this, X + 86 + i * 158, Y + 216, `${datos.codigo} · ${evento}`, { ancho: 148, alto: 24, tam: 11, color: colorBoton },
        () => this.pulsarEvento(evento, razon));
      b.on('pointerover', () => this.info.setText(razon).setColor(bloqueo ? TEXTO.rojo : TEXTO.tenue));
      if (!sincroniza) b.activar(false);
      if (bloqueo) razonVisible = razon;
      this.dinamicos.push(b);
    });
    if (automata.eventosActivos().length === 0) {
      this.dinamicos.push(this.add.text(X + 12, Y + 208, 'Γ(q) = ∅: estado final, sin eventos posibles', estilo(11, TEXTO.tenue)));
    }
    this.info.setText(this.mensaje || razonVisible).setColor(razonVisible && !this.mensaje ? TEXTO.rojo : TEXTO.tenue);

    if (this.esTorniquete && automata.puede('reiniciar')) this.pintarConsola();
    else {
      entrada.capturaTexto = null;
      this.pintarHistorial(automata);
    }
  }

  pulsarEvento(evento, razon) {
    this.mensaje = '';
    if (this.esTorniquete) {
      this.info.setText(evento === 'reiniciar' ? 'reiniciar exige una palabra de L: escríbela en la consola y pulsa Enviar' : razon).setColor(TEXTO.tenue);
      return;
    }
    if (evento !== 'servir') { this.info.setText(razon).setColor(TEXTO.tenue); return; }
    // La solicitud sale por el gestor de entrada, igual que el clic en el mostrador.
    entrada.solicitarEvento(this.id, 'servir', {
      alResponder: (r) => {
        if (r.ok) return;
        const texto = r.motivo === 'supervisor' ? `Intento bloqueado (−5). ${r.razon}`
          : r.motivo === 'tokens' ? `t_servir no se dispara: ${this.planta.textoFaltantes(r.faltantes)}`
            : r.detalle ?? 'No se pudo servir';
        this.info.setText(texto).setColor(TEXTO.rojo);
      }
    });
  }

  // Últimos 10 eventos de la máquina: su palabra observada.
  pintarHistorial(automata) {
    const ultimos = automata.historial.slice(-10);
    const palabra = ultimos.map((p) => p.codigo).join(' ') || '(vacía)';
    const nombres = ultimos.map((p) => p.evento).join(' → ');
    this.dinamicos.push(
      this.add.text(X + 12, Y + 256, 'Palabra observada (últimos 10 eventos):', estilo(10, TEXTO.amarillo, { fontStyle: 'bold' })),
      this.add.text(X + 232, Y + 254, palabra, estiloMono(13, TEXTO.claro, { fontStyle: 'bold' })),
      this.add.text(X + 12, Y + 274, nombres, estilo(9, TEXTO.tenue, { wordWrap: { width: W - 24 } }))
    );
    if (this.esTorniquete) {
      const n = Number(this.entidad().linea.contador.estado.slice(1));
      this.dinamicos.push(this.add.text(X + W - 12, Y + 256, `Rechazos contados: ${n} de 3`, estilo(10, n >= 2 ? TEXTO.naranja : TEXTO.tenue)).setOrigin(1, 0));
    }
  }

  // ---------- consola de reparación (torniquete Bloqueado) ----------

  pintarConsola() {
    const lenguaje = this.comedor.lenguaje;
    const analisis = lenguaje.analizar(this.palabra);
    const caja = this.add.graphics();
    caja.fillStyle(0x05080f, 1);
    caja.fillRoundedRect(X + 12, Y + 250, 176, 24, 4);
    caja.lineStyle(1.5, analisis.error ? PALETA.fallo : analisis.aceptada ? PALETA.operacion : PALETA.mantenimiento, 1);
    caja.strokeRoundedRect(X + 12, Y + 250, 176, 24, 4);
    this.dinamicos.push(caja);
    // Cada símbolo en verde si el DFA avanzó, en rojo si no tiene transición.
    analisis.pasos.forEach((paso, i) => {
      const color = paso.ok ? TEXTO.verde : paso.origen ? TEXTO.rojo : TEXTO.tenue;
      this.dinamicos.push(this.add.text(X + 20 + i * 10, Y + 254, paso.simbolo, estiloMono(14, color, { fontStyle: 'bold' })));
    });
    this.dinamicos.push(this.add.text(X + 20 + this.palabra.length * 10, Y + 254, '_', estiloMono(14, TEXTO.claro)));

    const progreso = analisis.error
      ? `"${analisis.error.simbolo}" no tiene transición desde ${analisis.error.estado}: se esperaba ${analisis.error.esperados.join(' o ')}`
      : analisis.aceptada ? `DFA en ${analisis.estadoFinal} (final): w ∈ L. Pulsa Enviar`
        : `DFA en ${analisis.estadoFinal} · se espera ${analisis.esperados.join(' o ')}`;
    this.dinamicos.push(this.add.text(X + 196, Y + 248, `Consola de reparación · ${progreso}`,
      estilo(9.5, analisis.error ? TEXTO.rojo : analisis.aceptada ? TEXTO.verde : TEXTO.claro, { wordWrap: { width: W - 208 } })));

    // Botones con los comandos del alfabeto de reparación.
    const escribir = (texto) => { if (this.palabra.length + texto.length <= 16) { this.palabra += texto; this.mensaje = ''; this.firma = null; } };
    const borrar = () => { this.palabra = this.palabra.slice(0, -1); this.firma = null; };
    let x = X + 12;
    const poner = (etiqueta, ancho, color, accion) => {
      this.dinamicos.push(boton(this, x + ancho / 2, Y + 289, etiqueta, { ancho, alto: 22, tam: 10, color }, accion));
      x += ancho + 4;
    };
    for (const comando of MODELOS.reparacion.comandos) poner(comando.id, 34, 0x2a3347, () => escribir(comando.id));
    poner('Borrar', 50, 0x2a3347, borrar);
    poner('Enviar', 58, PALETA.operacion, () => this.enviar());
    poner('Ayuda (−15)', 84, PALETA.relevo, () => {
      const { expresion } = this.planta.pedirAyuda(this.entidad().linea.id);
      this.mensaje = `Expresión regular de la ficha: ${expresion}   (R reset · S1 a S3 pruebas de sensor · K confirmar)`;
      this.firma = null;
    });

    // El teclado escribe en la consola mientras está abierta.
    entrada.capturaTexto = (tecla) => {
      if (tecla.key === 'Enter') this.enviar();
      else if (tecla.key === 'Backspace') borrar();
      else if (/^[a-zA-Z0-9]$/.test(tecla.key)) escribir(tecla.key.toUpperCase());
    };
  }

  enviar() {
    const palabra = this.palabra;
    entrada.solicitarEvento(this.id, 'reiniciar', {
      palabra,
      alResponder: (r) => {
        if (r.ok) this.mensaje = `"${palabra}" ∈ L (RegExp y DFA): se ejecutó reiniciar y el torniquete volvió a Listo (+15)`;
        else if (r.motivo === 'lenguaje') {
          const a = r.analisis;
          this.mensaje = `"${palabra || '(vacía)'}" ∉ L (−10): ${a.error
            ? `"${a.error.simbolo}" sin transición desde ${a.error.estado}, se esperaba ${a.error.esperados.join(' o ')}`
            : `la palabra queda en ${a.estadoFinal}, que no es final`}. Sigue bloqueado.`;
        } else this.mensaje = r.detalle ?? 'No se pudo reiniciar';
        this.palabra = '';
        this.firma = null;
      }
    });
  }

  // ---------- pestaña Composición ----------

  pintarComposicion(e) {
    const info = this.comedor.infoComposicion();
    const { linea } = e;
    let lineas;
    if (this.esTorniquete) {
      const automatas = [linea.torniquete, linea.contador];
      const todos = ['leer', 'acceso_ok', 'rechazo', 'bloqueo', 'reiniciar'];
      const habilitados = todos.filter((ev) => puedeConjunto(ev, automatas));
      const impedidos = linea.torniquete.eventosActivos().filter((ev) => !habilitados.includes(ev));
      lineas = [
        [`Torniquete ‖ Contador_Rechazos: ${info.torniqueteContador} estados alcanzables de 20`, TEXTO.claro],
        ['Eventos comunes (ocurren a la vez en ambos): leer, rechazo, bloqueo', TEXTO.tenue],
        [`Estado compuesto actual: (${linea.torniquete.estado}, ${linea.contador.estado})`, TEXTO.amarillo],
        [`Habilitados en la composición: ${habilitados.join(', ') || 'ninguno'}`, TEXTO.verde],
        [impedidos.length ? `Impedidos por el contador: ${impedidos.join(', ')}` : 'El contador no impide ningún evento ahora', impedidos.length ? TEXTO.rojo : TEXTO.tenue],
        ['Abajo: Contador_Rechazos. El bloqueo solo está habilitado en C3 (tercer rechazo).', TEXTO.tenue]
      ];
      this.grafo.actualizar(linea.contador.estado);
    } else {
      const tupla = this.comedor.tupla(e.est);
      const deshabilitados = this.comedor.eventosDeshabilitados(e.est);
      lineas = [
        [`Planta G = Estudiante ‖ Torniquete T${linea.id}: ${info.estudianteTorniquete} estados (6 × 5, sin eventos comunes)`, TEXTO.claro],
        [`G ‖ Registro_Acceso (especificación): ${info.conRegistro} estados alcanzables`, TEXTO.claro],
        [`Estados prohibidos (Registro = Violacion): ${info.prohibidos} · Supervisor: ${info.supervisor} estados`, TEXTO.claro],
        // El torniquete es compartido: su Acceso puede ser el de otro estudiante de la fila.
        [`Estado compuesto actual: (${tupla.join(', ')})${tupla[1] === 'Acceso' && tupla[2] === 'Sin_acceso' ? '  · ese acceso_ok fue de otro estudiante' : ''}`, TEXTO.amarillo],
        [deshabilitados.length ? `Eventos deshabilitados por el supervisor: ${deshabilitados.map((d) => d.evento).join(', ')}`
          : 'El supervisor no deshabilita ningún evento en este estado', deshabilitados.length ? TEXTO.rojo : TEXTO.verde],
        [deshabilitados.length ? `Restricción formal: ${deshabilitados[0].razon}` : 'Restricción formal: ¬(servir ∧ Registro = Sin_acceso)', deshabilitados.length ? TEXTO.rojo : TEXTO.tenue],
        [`Registro_Acceso de ${this.id}: ${e.est.registro.estado} (palabra: ${e.est.registro.palabra() || 'vacía'})`, TEXTO.tenue],
        ['Compáralo con modelos/automatas/supervisor.jff y planta_con_especificacion.jff', TEXTO.tenue]
      ];
    }
    lineas.forEach(([texto, color], i) => {
      this.dinamicos.push(this.add.text(X + 14, Y + 58 + i * (this.esTorniquete ? 15 : 20), texto, estilo(10.5, color, { wordWrap: { width: W - 28 } })));
    });
    this.info.setText('');
    entrada.capturaTexto = null;
  }
}
