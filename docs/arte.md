# Guía de estilo · UniFood Rush

Dirección de arte del simulador. Lo que se dibuja sale del modelo: una apariencia por cada estado de `docs/modelo/automatas.md` y una forma por cada tipo de token de `docs/modelo/petri.md`.
Todo el arte se dibuja en código (`src/arte/`); no hay archivos de imagen. Se revisa en `hoja-arte.html`.

## 1. Formato

| Dato | Valor |
|---|---|
| Juego | 960 × 540 px, escala FIT, renderer WebGL; llena la ventana sin deformarse y se dibuja con los píxeles reales de la pantalla (`src/arte/resolucion.js`) |
| Rejilla | Isométrica 2:1, celdas de 64 × 32 px |
| Proyección | pantallaX = (x − y) · 32, pantallaY = (x + y) · 16 − z · 32, más el origen (416, 62) |
| Planta | 16 × 12 celdas |
| Orden de profundidad | Por (x + y): el objeto con mayor suma tapa al lejano |
| Luz | Desde arriba a la izquierda: tapa clara, cara izquierda media, cara derecha oscura |
| Tipografía | Trebuchet MS para textos, Consolas para tablas y marcados |

## 2. Paleta (14 colores)

| Uso | Nombre en `paleta.js` | Hexadecimal |
|---|---|---|
| Fondo y paneles | fondo | `#1d2433` |
| Suelo | suelo | `#d8d0bd` |
| Muros | muro | `#8a7968` |
| Máquinas (torniquete, mostrador, carro, lavado) | acero | `#7d8a93` |
| Mesas | madera | `#b9814d` |
| Estado de operación | operacion | `#2e9e5b` |
| Estado de espera | espera | `#e0b21b` |
| Estado de fallo | fallo | `#d64545` |
| Estado de mantenimiento | mantenimiento | `#3b7dd8` |
| Token bandeja limpia y textos | bandejaLimpia | `#f3f1e7` |
| Token bandeja sucia | bandejaSucia | `#8b6a3e` |
| Token personal | personal | `#7a52c7` |
| Token permiso de relevo y avisos | relevo | `#f08a24` |
| Piel de las personas | piel | `#e8b98a` |

Las caras en sombra usan el mismo color oscurecido entre 12 % y 32 %.

## 3. Color e ícono por estado

Cada estado tiene un color y un ícono distintos. El ícono va en una insignia oscura sobre la cabeza o sobre la máquina.

**Estudiante**

| Estado | Color | Ícono | Detalle |
|---|---|---|---|
| En_Fila | espera `#e0b21b` | tres puntos | De pie en su fila |
| Recibiendo_Bandeja | mantenimiento `#3b7dd8` | bandeja | En el mostrador, con bandeja |
| Buscando_Mesa | relevo `#f08a24` | signo de pregunta | Con bandeja, camina o espera mesa |
| Almorzando | operacion `#2e9e5b` | cubiertos | Sentado detrás de su mesa |
| Almorzando, esperando el carro | operacion `#2e9e5b` | admiración roja | Ya terminó de comer y falta Espacio_carro |
| Entregando_Menaje | bandejaSucia `#8b6a3e` | flecha | Camina hacia el carro |
| Salida | acero `#7d8a93` | visto | Sale por la puerta y se desvanece |

**Torniquete** (cuerpo de acero con una banda de luz del color del estado)

| Estado | Color de la banda | Ícono |
|---|---|---|
| Listo | acero `#7d8a93` | raya |
| Leyendo | espera `#e0b21b` | tres puntos |
| Acceso | operacion `#2e9e5b` | visto |
| Rechazo | relevo `#f08a24` | equis |
| Bloqueado | fallo `#d64545` | candado, con chispas |

## 4. Forma y color de cada token

| Lugar | Token | Forma | Color |
|---|---|---|---|
| En_fila, Con_bandeja, Almorzando | Estudiante | Persona con el color de su estado | según el estado |
| Bandeja_limpia | Bandeja limpia | Rombo plano en el estante del muro (30 casillas) | `#f3f1e7` |
| Bandeja_sucia | Bandeja sucia | Rombo con restos, sobre el carro | `#8b6a3e` |
| Espacio_carro | Hueco | Rombo vacío con borde, sobre el carro (10 posiciones) | borde blanco |
| Mesa_libre | Mesa libre | Mesa con una marca verde encima | marca `#2e9e5b` |
| Personal_linea, Personal_lavado | Persona de personal | Persona morada con gorro; ícono de cucharón o de gota | `#7a52c7` |
| Relevo | Permiso de relevo | Disco con dos flechas en el tablero | `#f08a24` |
| Minimo_lavado, Minimo_linea | Monitor | Escudo en el tablero | `#3b7dd8` |
| Salida | Contador | Rótulo en la puerta de salida | – |

Cada lugar lleva un rótulo con su contador m/k. El rótulo pasa a rojo cuando el lugar está en su límite crítico: En_fila por encima de k, Espacio_carro en 0 o Personal_lavado en 0.

## 5. Reglas del HUD

- **HUD de máquina** (escena superpuesta, 552 × 304 px a la derecha): nodos circulares de 16 px de radio, flechas con el código del evento en amarillo, flecha de entrada en el estado inicial, doble círculo en los marcados, estado actual relleno e iluminado con glow, última transición en amarillo parpadeando 0,5 s.
- **Botones de eventos**: verde `#2e9e5b` si el evento es controlable y está habilitado, gris `#55606e` si no es controlable, rojo `#d64545` si lo deshabilita el supervisor, con la restricción formal debajo.
- **Radar** (arriba a la derecha): luz verde `#2e9e5b`, amarilla `#e0b21b` parpadeando o roja `#d64545`; debajo, el mini-grafo de los últimos 6 marcados.
- **Zonas fijas**: reloj y turno arriba a la izquierda, puntaje arriba al centro, tokens por lugar abajo a la izquierda, alertas abajo a la derecha, botones táctiles abajo al centro.
- **Listo para servir**: marco verde que late sobre el mostrador cuando el estudiante en cabeza ya tiene `acceso_ok`.

## 6. Efectos de Phaser 4, cada uno con su propósito

| Efecto | Dónde | Qué comunica |
|---|---|---|
| Grupo de objetos y orden de profundidad | Multitud de estudiantes (`Multitud.js`) | Capacidad de la ficha: la multitud es un grupo con sprites reutilizados y ordenados por (x + y) |
| Filtro glow | Entidad seleccionada y estado actual del grafo | Qué máquina y qué estado se están mirando |
| Bloom (filtros en paralelo: umbral, desenfoque y suma) | Cámara, en bloqueo de torniquete, desborde e interbloqueo | Evento crítico |
| Partículas | Vapor en el lavado, chispas en el torniquete bloqueado, ráfaga al servir y al relevar, acumulación roja en el desborde | Flujo de tokens y fallos |
| Temblor de cámara | Intento bloqueado por el supervisor, bloqueo de torniquete, interbloqueo | La acción no se ejecutó o algo falló |
| Destello de cámara | Logro ganado | Recompensa |
| Tweens | Tokens que viajan entre lugares, caminatas, radar, aviso de logro | Cada disparo mueve tokens |
| Transiciones | Fundido entre Título, Planta y Resultados | Cambio de fase |

## 7. Recursos creados

| Recurso | Archivo o función | Tamaño (px) | Estados o variantes |
|---|---|---|---|
| Estudiante | `estudiante()` y `persona()` en `src/arte/formas.js`; texturas `est_*` | 40 × 64 | 6 estados y la variante "espera carro" |
| Torniquete | `torniquete()`; texturas `tor_*` | 60 × 76 | 5 estados |
| Personal | `persona()` con gorro; texturas `personal_linea` y `personal_lavado` | 40 × 64 | 2 puestos |
| Mesa | `mesa()`; texturas `mesa_libre` y `mesa_ocupada` | 56 × 44 | libre y ocupada |
| Mostradores | `prisma()` | 64 × 50 por tramo | 2 mostradores de 2 tramos |
| Carro de menaje | `carro()`; textura `carro` | 64 × 48 | 10 posiciones: hueco o bandeja sucia |
| Estación de lavado | `fregadero()`; textura `fregadero` | 72 × 68 | con vapor cuando lava |
| Tablero de relevo | `tablero()`; textura `tablero` | 48 × 60 | con fichas de relevo y escudos |
| Tokens | `bandeja()`, `fichaRelevo()`, `escudo()` | 26 × 16, 18 × 20 y 16 × 18 | bandeja limpia, bandeja sucia, relevo y monitor |
| Celdas de suelo, muros y carriles | `losa()`, `suelo()` y `muro()` | 64 × 32 | suelo ajedrezado, carril de fila, zona de lavado, acera |
| Íconos de estado | `icono()` | 16 × 16 | 12 íconos |
| HUD de máquina y radar | `crearGrafo()` en `src/arte/grafo.js`; `HUDMaquina.js` y `HUDPartida.js` | 552 × 304 y 210 × 98 | grafo por autómata; radar en 3 colores |

## 8. Lista de revisión de una captura

1. Cada sprite tiene el color y el ícono de su estado según la sección 3.
2. Ningún objeto cercano queda tapado por uno lejano.
3. El contador m/k de cada lugar coincide con los tokens dibujados.
4. El HUD ocupa sus zonas y no tapa el radar.
5. El estado iluminado en el grafo es el mismo que muestra el sprite.

## 9. Fase 2: estados de Markov, panel analítico y Event Log

Escrita con la habilidad `director-arte-isometrico`. Se revisa en `hoja-arte-fase2.html` (`npm run dev` y abrir `/hoja-arte-fase2.html`). Las funciones de dibujo están en `src/arte/markov.js`.

### Escala de color por estado (de menor a mayor riesgo)

**Oleada** (entidad estocástica global): chip junto a la entrada y tapete del color del estado en las baldosas de la entrada.

| Estado | Color | Ícono | Efecto |
|---|---|---|---|
| Baja | operacion `#2e9e5b` | 1 persona | 4 llegadas por paso |
| Media | espera `#e0b21b` | 2 personas | 10 llegadas por paso |
| Alta | fallo `#d64545` | 3 personas | 18 llegadas por paso; temblor leve de cámara y destello |

**Mesas** (cadena de referencia, observada en la red): chip debajo del rótulo de Mesa_libre.

| Estado | Color | Ícono |
|---|---|---|
| 0-25% | mantenimiento `#3b7dd8` | círculo con 1 cuarto lleno |
| 25-50% | operacion `#2e9e5b` | 2 cuartos |
| 50-75% | espera `#e0b21b` | 3 cuartos |
| 75-100% | fallo `#d64545` | círculo lleno |

Al cambiar de estado, el chip cambia de color con un tween de 300 ms, crece y vuelve (300 ms) y aparece una etiqueta flotante con «Oleada X → Y».

### Línea 3

Cerrada: carril, mostrador y torniquete T3 al 25 %, 40 % y 40 % de opacidad, y el letrero «LÍNEA 3 CERRADA · tecla 3». Abierta: todo al 100 %, una persona de refuerzo detrás del mostrador y el letrero en verde.

### Colores del panel analítico

| Uso | Color |
|---|---|
| Fondo del panel | `#0f1524` |
| Borde del panel y pestaña elegida | mantenimiento `#3b7dd8` |
| Fila del estado actual en el mapa de calor | `#f0c53a` |
| Mapa de calor de P | de `#fbfaf6` (0) a fallo `#d64545` (1), valores con dos decimales; texto oscuro sobre celdas claras y claro sobre oscuras |
| π teórico | `#7fb0f5` |
| Frecuencia observada en la partida | relevo `#f08a24` |
| Barras de π^(n) | el color de cada estado |

### Recursos creados

| Recurso | Archivo o función | Tamaño (px) | Estados o variantes |
|---|---|---|---|
| Entidad estocástica 1: Oleada | `chipEstado()` en `src/arte/markov.js`, tapete en `Escenario.pintarMarkov()`; íconos `personas1` a `personas3` en `formas.js` | 92 × 20 (mapa), 78 × 20 (HUD) | Baja, Media, Alta |
| Entidad estocástica 2: Mesas | `chipEstado()`; íconos `cuarto1` a `cuarto4` | 86 × 20 | 0-25%, 25-50%, 50-75%, 75-100% |
| Mapa de calor de P | `mapaCalor()` y `colorCalor()` | celdas de 72 × 40 (3 estados) o 62 × 34 (4) | fila del estado actual resaltada |
| Barras de π^(n) y de π contra frecuencias | `barras()` y `leyenda()` | 270 × 140 y 250 × 104 | 1 o 2 series, crecen con un tween de 380 ms |
| Indicador de Markov y contador del log | `HUDPartida.crearIndicadorMarkov()` y `textoLog` | 142 × 58 y una línea de 9 px | parpadeo amarillo con riesgo ≥ 0,5 |
| Botón de exportación | `botonExportar()` | 150 × 30 | reposo, al pasar el mouse, descargando |
| Mapa de calor de las esperas (H) | `Planta.pintarCalor()` | baldosas de 62 × 31 | de blanco a rojo según la espera |

### Efectos de Phaser 4 de la Fase 2

| Efecto | Dónde | Qué comunica |
|---|---|---|
| Tween de color de 300 ms | Chips de Oleada y Mesas, tapete de la entrada | Cambio de estado de la cadena en el paso k |
| Temblor leve de cámara y bloom | Entrada a oleada Alta | Estado peligroso de la cadena |
| Partículas rojas en la entrada | Entrada a oleada Alta | Llegada de una oleada grande |
| Barras animadas | Panel de Markov y Resultados | Datos nuevos al cambiar n o en cada paso |
| Parpadeo | Indicador de Markov del HUD | Riesgo de oleada Alta en 3 pasos ≥ 0,5 |
| Barrido (wipe) | Paso a Resultados | Fin del turno |
| Mapa de calor sobre el piso | Filas, mostradores, zona de espera de mesa y carro | Dónde se forman las colas, según el registrador |

La cadena Oleada es ergódica y la de Mesas también: no hay estados absorbentes, así que no se usan las partículas de absorción de la guía.
