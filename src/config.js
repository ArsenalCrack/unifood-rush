// Constantes del GDD de UniFood Rush. Sin Phaser ni DOM: también las usan
// el motor de simulación y las pruebas de Node.

// --- Pantalla y rejilla isométrica 2:1 ---
export const ANCHO = 960;
export const ALTO = 540;
export const TILE_W = 64;
export const TILE_H = 32;
export const PLANTA = { columnas: 16, filas: 12 }; // celdas del comedor (x, y)
export const ORIGEN = { x: 416, y: 62 };           // píxel de la celda (0, 0)

// --- Simulación ---
export const VELOCIDADES = [1, 2, 4];
export const SEMILLA = 96;              // semilla fija: primer bloqueo de torniquete a los ~39 s del turno 1
export const RADAR_PROFUNDIDAD = 3;     // disparos que mira el radar hacia adelante
export const ARBOL_PROFUNDIDAD = 4;     // profundidad del árbol local del inspector
export const ARBOL_MAX_NODOS = 2000;

// --- Tiempos en segundos de simulación (GDD, sección "Tiempos") ---
export const TIEMPOS = {
  presentarCarne: 0.4,   // el estudiante en cabeza acerca el carné (antes de leer)
  lectura: 0.8,          // leer -> acceso_ok o rechazo
  reintento: 1.0,        // tras un rechazo, nueva lectura del mismo estudiante
  bloqueo: 0.5,          // tras el 3.er rechazo ocurre bloqueo
  servirBase: 3.0,       // servir con 2 personas en línea; dura servirBase*2/M(Personal_linea)
  comerMin: 30,          // almuerzo: uniforme entre comerMin y comerMax
  comerMax: 42,
  entregar: 3.0,         // caminar al carro y entregar el menaje
  lavar: 10.0,           // un lote de 5 bandejas por persona de lavado
  relevo: 120,           // cambio de turno del personal: llegan permisos de relevo
  reaccionPiloto: 0.6,   // demora del piloto automático antes de servir
  margenFinal: 90        // tiempo extra tras la última llegada antes de cerrar el turno
};

// --- Puntaje en puntos (GDD, sección "Puntaje") ---
export const PUNTOS = {
  completado: 10,        // estudiante que llega a Salida (palabra sbmte)
  servicioRapido: 5,     // extra si esperó menos de esperaRapida s en la fila
  esperaRapida: 20,
  reparacion: 15,        // torniquete reparado con una palabra de L
  lavado: 2,             // disparo de t_lavar
  turnoSinDeadlock: 50,  // terminar el turno sin interbloqueo
  intentoBloqueado: -5,  // insistir en servir sin acceso_ok
  palabraInvalida: -10,  // palabra w que no pertenece a L
  ayuda: -15,            // ver la expresión regular en la consola
  desborde: -3,          // cada llegada con En_fila por encima de k
  bonoRiesgo: 0.2        // +20 % del puntaje del turno si se jugó sin monitores
};

// --- Turnos con dificultad creciente (GDD, sección "Turnos") ---
// estudiantes llegan durante "llegadas" s; pRechazo es la probabilidad de rechazo
// de una lectura; meta es la fracción mínima en Salida para aprobar el turno.
export const TURNOS = [
  { id: 1, nombre: 'Desayuno',  estudiantes: 60,  llegadas: 240, pRechazo: 0.10, meta: 0.75 },
  { id: 2, nombre: 'Almuerzo',  estudiantes: 90,  llegadas: 300, pRechazo: 0.10, meta: 0.75 },
  { id: 3, nombre: 'Hora pico', estudiantes: 120, llegadas: 300, pRechazo: 0.10, meta: 0.75 }
];

// --- Logros (GDD, sección "Logros") ---
export const LOGROS = [
  { id: 'primera_bandeja', nombre: 'Primera bandeja',        condicion: 'Un estudiante completa el ciclo y llega a Salida.' },
  { id: 'tecnico',         nombre: 'Técnico de torniquetes', condicion: 'Reparar un torniquete al primer intento y sin pedir ayuda.' },
  { id: 'fila_legal',      nombre: 'Fila legal',             condicion: '15 servir seguidos sin intentos bloqueados por el supervisor.' },
  { id: 'ciclo_cerrado',   nombre: 'Ciclo cerrado',          condicion: '6 disparos de t_lavar en un turno (30 bandejas recicladas).' },
  { id: 'sin_red',         nombre: 'Sin red de seguridad',   condicion: 'Terminar un turno con los monitores desactivados y sin interbloqueo.' },
  { id: 'hora_pico',       nombre: 'Hora pico superada',     condicion: 'Terminar un turno sin interbloqueo con 90 % o más en Salida.' }
];
export const META_LOGRO_FILA = 15;
export const META_LOGRO_LAVADOS = 6;
export const META_LOGRO_PICO = 0.9;

// --- Distribución de la planta en celdas (x, y) ---
export const MAPA = {
  lineas: [
    { id: 1, y: 1, torniquete: { x: 6, y: 1 }, mostrador: { x: 8, y: 1 } },
    { id: 2, y: 3, torniquete: { x: 6, y: 3 }, mostrador: { x: 8, y: 3 } }
  ],
  cabezaFila: 5,                 // x de la primera posición de cada fila
  posicionesFila: 8,             // posiciones dibujadas por fila (2 x 8 = k de En_fila)
  barra: [{ x: 7, y: 2 }, { x: 8, y: 2 }, { x: 9, y: 2 }], // barra de servicio entre las dos líneas
  pilaLimpias: { x: 7, y: 2 },   // lugar Bandeja_limpia
  personalLinea: [{ x: 8, y: 2 }, { x: 9, y: 2 }, { x: 8.5, y: 2.45 }, { x: 9.5, y: 2.45 }],
  espera: { x: 9.6, y: 4.6 },    // zona de Buscando_Mesa cuando no hay mesa libre
  mesas: { xs: [10, 11, 13, 14], ys: [1, 3, 5, 7, 9] }, // 4 x 5 = 20 mesas
  carro: { x: 6, y: 8 },         // lugares Espacio_carro y Bandeja_sucia
  lavado: { x: 3, y: 9 },        // estación t_lavar
  personalLavado: [{ x: 2, y: 8.4 }, { x: 4, y: 8.4 }, { x: 2, y: 10 }, { x: 4, y: 10 }],
  relevo: { x: 4, y: 5.5 },      // tablero de relevo (lugar Relevo)
  entrada: { x: -1, y: 2 },
  salida: { x: 0, y: 6.5 }
};
