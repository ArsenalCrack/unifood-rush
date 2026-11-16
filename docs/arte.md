# Guía de estilo · UniFood Rush

Dirección de arte del simulador. Lo que se dibuja sale del modelo: una apariencia por cada estado de `docs/modelo/automatas.md` y una forma por cada tipo de token de `docs/modelo/petri.md`.
Todo el arte se dibuja en código (`src/arte/`); no hay archivos de imagen. Se revisa en `hoja-arte.html`.

## 1. Formato

| Dato | Valor |
|---|---|
| Juego | 960 × 540 px, escala FIT, renderer WebGL; el lienzo se agranda hasta llenar la ventana sin deformarse |
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
