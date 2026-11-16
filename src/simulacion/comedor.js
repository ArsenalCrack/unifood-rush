// Motor de simulación del comedor, parte 2: lo que solicita el jugador.
// Eventos controlables (servir, reiniciar) y transiciones de disparo "jugador"
// (t_servir, t_a_linea, t_a_lavado). Cada solicitud pasa por el supervisor, por
// δ y por la red de Petri; si alguno no la permite, no se ejecuta.
// No depende del motor de juego ni del DOM: se prueba en Node.

import { FlujoComedor } from './flujo.js';
import { nombreCompuesto, componer, componerVarios, ejecutarConjunto } from '../sed/composicion.js';
import { MODELOS } from '../sed/modelos/index.js';
import { TIEMPOS, PUNTOS, META_LOGRO_FILA, META_LOGRO_PICO } from '../config.js';

export class Comedor extends FlujoComedor {
  // ---------- consultas de solo lectura para la vista ----------

  linea(idLinea) {
    return this.lineas[idLinea - 1];
  }

  // Estudiante en cabeza de la fila de una línea (o null).
  cabeza(idLinea) {
    const id = this.lineas[idLinea - 1].fila[0];
    return id ? this.estudiantes.get(id) : null;
  }

  // Tupla (Estudiante, Torniquete de su línea, Registro_Acceso) y su nombre compuesto.
  tupla(est) {
    return [est.automata.estado, this.lineas[est.linea - 1].torniquete.estado, est.registro.estado];
  }

  estadoCompuesto(est) {
    return nombreCompuesto(this.tupla(est));
  }

  // Eventos controlables que el supervisor deshabilita para ese estudiante ahora.
  eventosDeshabilitados(est) {
    return this.supervisor.deshabilitados.get(this.estadoCompuesto(est)) ?? [];
  }

  // Duración de servir: depende de los tokens de Personal_linea (GDD).
  duracionServir() {
    return (TIEMPOS.servirBase * 2) / Math.max(1, this.red.tokens('Personal_linea'));
  }

  // Tamaños de las composiciones, para la pestaña "Composición" del HUD.
  infoComposicion() {
    if (!this.cacheComposicion) {
      const et = componer(MODELOS.estudiante, MODELOS.torniquete);
      const alcanzable = componerVarios([MODELOS.estudiante, MODELOS.torniquete, MODELOS.registroAcceso]);
      const prohibidos = alcanzable.estados.filter((q) => alcanzable.tuplas[q][2] === 'Violacion').length;
      const tc = componer(MODELOS.torniquete, MODELOS.contadorRechazos);
      this.cacheComposicion = {
        estudianteTorniquete: et.estados.length,
        conRegistro: alcanzable.estados.length,
        prohibidos,
        supervisor: alcanzable.estados.length - prohibidos,
        productoCompleto: this.composicion.estados.length,
        torniqueteContador: tc.estados.length
      };
    }
    return this.cacheComposicion;
  }

  // ---------- acciones del jugador ----------

  // Solicita un evento controlable sobre una entidad ("E12" o "T1").
  solicitarEvento(idEntidad, evento, extra = {}) {
    let resultado;
    if (idEntidad.startsWith('T')) {
      resultado = evento === 'reiniciar'
        ? this.reparar(Number(idEntidad.slice(1)), extra.palabra ?? '')
        : { ok: false, motivo: 'no_controlable' };
    } else {
      const est = this.estudiantes.get(idEntidad);
      if (!est) resultado = { ok: false, motivo: 'desconocido' };
      else resultado = evento === 'servir' ? this.servir(est) : { ok: false, motivo: 'no_controlable' };
    }
    this.cerrarAccion();
    return resultado;
  }

  // Clic en el mostrador de una línea: servir al estudiante en cabeza.
  servirLinea(idLinea) {
    const cabeza = this.cabeza(idLinea);
    const resultado = cabeza ? this.servir(cabeza) : { ok: false, motivo: 'fila_vacia' };
    this.cerrarAccion();
    return resultado;
  }

  // servir (c) sincronizado con t_servir: supervisor -> δ -> red de Petri.
  servir(est) {
    const linea = this.lineas[est.linea - 1];
    if (!est.automata.puede('servir')) {
      return { ok: false, motivo: 'automata', detalle: `δ(${est.automata.estado}, servir) no está definida` };
    }
    // 1) Supervisor: ¿la composición quedaría en un estado prohibido?
    const estado = this.estadoCompuesto(est);
    if (!this.supervisor.permite(estado, 'servir')) {
      const razon = this.supervisor.razonDe(estado, 'servir');
      this.stats.intentosBloqueados++;
      this.rachaServir = 0;
      this.sumar(PUNTOS.intentoBloqueado, 'intento bloqueado');
      this.emitir('bloqueado', { id: est.id, linea: linea.id, evento: 'servir', estado, razon });
      return { ok: false, motivo: 'supervisor', razon, estado };
    }
    // 2) Red de Petri: AND-join En_fila + Bandeja_limpia + Personal_linea.
    const faltantes = this.red.faltantes('t_servir');
    if (faltantes.length > 0) {
      this.emitir('falta', { transicion: 't_servir', faltantes, linea: linea.id });
      return { ok: false, motivo: 'tokens', faltantes };
    }
    // 3) Disparo y evento sincronizados.
    this.red.disparar('t_servir');
    ejecutarConjunto('servir', [est.automata, est.registro]);
    linea.fila.splice(linea.fila.indexOf(est.id), 1);
    linea.mostrador = est.id;
    est.tServido = this.reloj.tiempo;
    const duracion = this.duracionServir();
    this.reloj.programarEn(duracion, { tipo: 'buscar_mesa', estudiante: est.id });
    this.stats.servidos++;
    this.rachaServir++;
    if (this.rachaServir >= META_LOGRO_FILA) this.otorgar('fila_legal');
    this.emitir('estudiante', { id: est.id, evento: 'servir', linea: linea.id, duracion });
    return { ok: true };
  }

  // Transiciones de relevo del personal (t_a_linea, t_a_lavado).
  solicitarDisparo(nombre) {
    const info = this.red.transiciones[this.red.iT(nombre)];
    let resultado;
    if (info.disparo !== 'jugador' || info.evento) {
      resultado = { ok: false, motivo: 'no_jugador' };
    } else {
      const faltantes = this.red.faltantes(nombre);
      if (faltantes.length > 0) {
        this.emitir('falta', { transicion: nombre, faltantes });
        resultado = { ok: false, motivo: 'tokens', faltantes };
      } else {
        this.red.disparar(nombre);
        this.emitir('personal', { transicion: nombre });
        this.revisarLavado();
        resultado = { ok: true };
      }
    }
    this.cerrarAccion();
    return resultado;
  }

  // Consola de reparación: la palabra w debe pertenecer a L (RegExp y DFA).
  enviarReparacion(idLinea, palabra) {
    const resultado = this.reparar(idLinea, palabra);
    this.cerrarAccion();
    return resultado;
  }

  reparar(idLinea, palabra) {
    const linea = this.lineas[idLinea - 1];
    if (!linea.torniquete.puede('reiniciar')) {
      return { ok: false, motivo: 'automata', detalle: `δ(${linea.torniquete.estado}, reiniciar) no está definida` };
    }
    const validacion = this.lenguaje.validar(palabra);
    linea.intentosReparacion++;
    if (!validacion.pertenece) {
      this.stats.palabrasInvalidas++;
      this.sumar(PUNTOS.palabraInvalida, 'palabra inválida');
      this.emitir('reparacion', { linea: idLinea, ok: false, palabra });
      return { ok: false, motivo: 'lenguaje', validacion, analisis: this.lenguaje.analizar(palabra) };
    }
    // w ∈ L: se ejecuta el evento de reparación de la ficha, que pasa por δ.
    linea.torniquete.ejecutar(MODELOS.reparacion.eventoReparacion);
    this.stats.reparaciones++;
    this.sumar(PUNTOS.reparacion, 'reparación');
    if (linea.intentosReparacion === 1 && !linea.ayudaUsada) this.otorgar('tecnico');
    this.emitir('reparacion', { linea: idLinea, ok: true, palabra });
    this.emitir('torniquete', { linea: idLinea, evento: 'reiniciar' });
    this.programarLectura(linea);
    return { ok: true, validacion };
  }

  // Muestra la expresión regular de la ficha (cuesta puntos una vez por bloqueo).
  pedirAyuda(idLinea) {
    const linea = this.lineas[idLinea - 1];
    if (!linea.ayudaUsada) {
      linea.ayudaUsada = true;
      this.stats.ayudas++;
      this.sumar(PUNTOS.ayuda, 'ayuda');
    }
    return { expresion: this.lenguaje.expresion };
  }

  // Activa o desactiva la regla de prevención (lugares monitor).
  fijarMonitor(activo) {
    if (activo === this.monitor) return { ok: true };
    const marcado = this.red.comoObjeto();
    if (activo) {
      // El marcado de los monitores sale de sus invariantes P.
      marcado.Minimo_lavado = marcado.Personal_lavado - 1;
      marcado.Minimo_linea = marcado.Personal_linea - 1;
      if (marcado.Minimo_lavado < 0 || marcado.Minimo_linea < 0) {
        return { ok: false, motivo: 'invariante', detalle: 'Debe haber al menos 1 persona en lavado y 1 en la línea.' };
      }
      this.sinMonitor = false;
    }
    this.crearRed(activo, marcado);
    this.trasCambioRed({ tipo: 'inicio', etiqueta: activo ? 'monitor ON' : 'monitor OFF' });
    this.emitir('red_cambiada', { monitor: activo });
    this.revisarLavado();
    this.cerrarAccion();
    return { ok: true };
  }

  // ---------- piloto automático (solo solicita servir cuando está permitido) ----------

  fijarPiloto(activo) {
    this.piloto = activo;
    this.cerrarAccion();
  }

  cerrarAccion() {
    super.cerrarAccion();
    if (this.piloto) for (const linea of this.lineas) this.avisarPiloto(linea);
  }

  avisarPiloto(linea) {
    if (linea.pilotoPendiente || this.gameOver || this.terminado) return;
    const cabeza = this.cabeza(linea.id);
    if (!cabeza || !cabeza.automata.puede('servir')) return;
    if (!this.supervisor.permite(this.estadoCompuesto(cabeza), 'servir')) return;
    if (!this.red.habilitada('t_servir')) return;
    linea.pilotoPendiente = true;
    this.reloj.programarEn(TIEMPOS.reaccionPiloto, { tipo: 'piloto', linea: linea.id });
  }

  turnoPiloto({ linea: idLinea }) {
    const linea = this.lineas[idLinea - 1];
    linea.pilotoPendiente = false;
    const cabeza = this.cabeza(idLinea);
    if (!this.piloto || !cabeza || !cabeza.automata.puede('servir')) return;
    if (this.supervisor.permite(this.estadoCompuesto(cabeza), 'servir') && this.red.habilitada('t_servir')) {
      this.servir(cabeza);
    }
  }

  // ---------- fin del turno ----------

  // Vuelve al último marcado verde guardado (inicio del turno o último relevo).
  // Con desdeInicio = true vuelve al comienzo del turno.
  reintentar(desdeInicio = false) {
    const instantanea = desdeInicio ? this.instantaneaInicio : this.instantaneaVerde;
    if (!instantanea) return { ok: false };
    this.restaurar(instantanea);
    return { ok: true };
  }

  finTurno() {
    if (this.terminado) return;
    this.terminado = true;
    const total = this.turno.estudiantes;
    const fraccion = this.stats.completados / total;
    const sinBloqueo = !this.gameOver;
    let bono = 0;
    if (sinBloqueo) {
      this.sumar(PUNTOS.turnoSinDeadlock, 'turno sin interbloqueo');
      if (this.sinMonitor) {
        bono = Math.max(0, Math.round(this.puntaje * PUNTOS.bonoRiesgo));
        this.sumar(bono, 'bono de riesgo');
        this.otorgar('sin_red');
      }
      if (fraccion >= META_LOGRO_PICO) this.otorgar('hora_pico');
    }
    this.resumen = {
      turno: this.turno.id, nombre: this.turno.nombre, completados: this.stats.completados, total,
      fraccion, victoria: sinBloqueo && fraccion >= this.turno.meta, interbloqueo: !sinBloqueo,
      puntaje: this.puntaje, bono, monitor: !this.sinMonitor, tiempo: this.reloj.tiempo,
      stats: { ...this.stats }
    };
    this.reloj.pausar();
    this.emitir('fin_turno', this.resumen);
  }
}
