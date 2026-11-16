# UniFood Rush

Simulador interactivo isométrico 2.5D de un comedor universitario, guiado por un modelo formal: autómatas de estado finito (Unidad 2) y una red de Petri (Unidad 3).

Proyecto 13 del Laboratorio 1 de Modelado y Simulación de Sistemas de Eventos Discretos (167413), Universidad de Pamplona.
Equipo: José Alejandro Morales, Amir Sarmiento, Carlos Antolinez.

Simulador en línea: **https://dinamyt.org/unifood/** · Código: https://github.com/ArsenalCrack/unifood-rush

## Requisitos

- Node.js 24 LTS o 22 LTS (incluye npm)
- Google Chrome o Microsoft Edge 115 o superior
- Internet, para cargar Phaser 4.2.1 desde la CDN de jsDelivr

Phaser no se instala con npm: `index.html` lo carga por CDN y el código usa el objeto global `Phaser`.

## Ejecutar

```bash
npm install
```

```bash
npm run dev
```

Abre la dirección que muestra la terminal, normalmente http://localhost:5173.

## Pruebas

```bash
npm test
```

50 pruebas con el ejecutor de Node (`node --test`), sin librerías extra:

| Archivo | Qué comprueba |
|---|---|
| `test/reloj.test.js` | Calendario de eventos en orden de tiempo, pausa, velocidad y semilla reproducible |
| `test/automatas.test.js` | Palabras aceptadas y rechazadas, determinismo, composición (30, 11, 59 y 90 estados), RegExp y DFA iguales en 20 palabras |
| `test/supervisor.test.js` | Estados prohibidos, 10 000 eventos aleatorios sin entrar a Violacion, intento bloqueado en el juego |
| `test/redPetri.test.js` | Pre, Post, A, AND-join, ecuación de estado, deadlock de la ficha en 72 disparos, monitores, invariantes P en 1000 disparos, árbol de cobertura y ω |
| `test/comedor.test.js` | Turno completo, deadlock en el juego, reintento, salida de amarillo a verde, consola de reparación, monitores, 2 minutos a ×4 |
| `test/arquitectura.test.js` | El núcleo no menciona el motor de juego, Phaser solo por CDN, la vista no cambia estados, `.jff` y PNML iguales a los JSON |

## Compilar y entregar

```bash
npm run build
```

```bash
npm run preview
```

Comprueba el juego en http://localhost:4173. Para el ZIP del aula virtual, comprime el **contenido** de `dist/` con `index.html` en la raíz. En PowerShell:

```powershell
Compress-Archive -Path dist\* -DestinationPath GrupoN_UniFoodRush.zip -Force
```

Cambia la N por el número del grupo. El ZIP pesa unos 40 KB.

## Despliegue en Internet (obligatorio)

**Juega aquí: https://dinamyt.org/unifood/**

El docente pidió un enlace público para que los compañeros prueben el simulador y para su revisión del simulador (SimJam): es este mismo enlace. El simulador es estático, así que se publica copiando `dist/` a un servidor con HTTPS:

```bash
npm run desplegar -- usuario@servidor /var/www/unifood-rush
```

El comando ejecuta las pruebas, compila y copia los archivos por SSH. La configuración del servidor web se hace una sola vez con `despliegue/instalar-en-caddy.sh`; los pasos están en `docs/despliegue.md`.

| Dato | Valor |
|---|---|
| Servicio usado | Servidor propio (VPS) con Caddy y HTTPS |
| Dirección pública del simulador | https://dinamyt.org/unifood/ (activa desde el 16 de noviembre de 2026) |
| Repositorio | https://github.com/ArsenalCrack/unifood-rush |

El juego ocupa toda la ventana del navegador: su resolución es 960 × 540 con escala FIT y Phaser lo agranda sin deformarlo. El `index.html` de la guía lo limitaba a 960 × 540 píxeles; el cambio se explica en `docs/despliegue.md`.

## Otros comandos

| Comando | Para qué |
|---|---|
| `npm run modelos` | Regenera `modelos/` (archivos `.jff` de JFLAP y PNML de PIPE2) desde los JSON de `src/sed/modelos/` |
| `npm run simular` | Corre los 3 turnos sin gráficos con 5 políticas de relevo y muestra el balance |
| `npm run dev` y abrir `/hoja-arte.html` | Hoja de arte: paleta, estados, tokens, planta de 8 × 8 y maqueta del HUD |

## Estructura

```
.agents/skills/        Tres habilidades: diseñador, ingeniero SED y director de arte
modelos/               Archivos para JFLAP (.jff) y PIPE2 (.xml y .pnml) y capturas
docs/GDD.md            Documento de diseño
docs/arte.md           Guía de estilo
docs/modelo/           automatas.md y petri.md: el modelo formal en tablas
docs/informe.md        Tablas de las secciones 5.2 y 5.9 y postmortem
docs/despliegue.md     Publicación en Internet en un servidor propio con Caddy
despliegue/            Script que activa la subcarpeta /unifood/ en Caddy
src/sed/               NÚCLEO FORMAL, sin motor de juego ni DOM
  automata.js          δ(q, σ): ejecutar(σ) es el único cambio de estado
  composicion.js       Producto síncrono y supervisor por estados prohibidos
  observador.js        Construcción de subconjuntos (Σuo)
  lenguaje.js          Lenguaje de reparación: RegExp anclada y DFA
  redPetri.js          Pre, Post, A, habilitada(t), disparar(t), conflictos, deadlock
  cobertura.js         Árbol de cobertura de Karp y Miller con ω y explorar() para el radar
  reloj.js             Reloj de simulación con calendario de eventos futuros
  aleatorio.js         Generador con semilla (mulberry32)
  modelos/             JSON de los autómatas y de las dos redes
src/simulacion/        Motor del comedor: une autómatas, red y reloj (también sin motor de juego)
src/iso/               Proyección isométrica 2:1
src/entrada/           Mouse, teclado y táctil producen las mismas acciones
src/arte/              Dibujo en código: formas, texturas, grafo del autómata, efectos
src/entidades/         Vista: escenario, multitud, personal y torniquetes
src/escenas/           Arranque, Titulo, Planta, HUDPartida, HUDMaquina, Inspector, Resultados
test/                  Pruebas del núcleo y del motor
scripts/               exportar-modelos.mjs, simular.mjs y desplegar.mjs
```

Regla del proyecto: ninguna máquina cambia de estado si no es por δ (`Automata.ejecutar`) y ningún recurso se mueve si no es por el disparo de una transición (`RedPetri.disparar`) o por un evento externo del reloj (`agregarTokens`). Las escenas solo leen el modelo y le envían solicitudes.

## Controles

| Acción | Mouse o táctil | Teclado |
|---|---|---|
| Servir al primero de una fila | Mostrador de la línea | Q y W |
| Ver el autómata de un torniquete o estudiante | Clic sobre él | – |
| Relevo a la línea o al lavado | Flechas del tablero de relevo o botones →LÍN y →LAV | L y V |
| Pausa, inspector, velocidad | Botones PAUSA, INSP y ×1 | P, I, 1 2 4 |
| Piloto de servir, monitores | Botones AUTO y MON | A, M |
| Cerrar panel, fps | Botón X | Esc, F1 |
| Cámara | Arrastre y rueda o pellizco | – |

## Guion para la sustentación

La semilla es fija (96), así que estos pasos se repiten igual en cada partida del turno 1.

1. **Autómata en vivo.** Clic en un estudiante de la fila: su grafo muestra En_Fila iluminado y el botón `s · servir` en rojo mientras el torniquete no registre `acceso_ok`. Clic en un torniquete: 5 estados y botones grises (eventos no controlables). La pestaña Composición muestra 30, 59 y 34 estados.
2. **Supervisor.** Pulsa un mostrador (o Q) antes de la luz verde: no se sirve, la cámara tiembla, se descuentan 5 puntos y aparece ¬(servir ∧ Registro = Sin_acceso).
3. **Reparación por expresión regular.** Con AUTO encendido, el torniquete 1 se bloquea cerca de 0:39. Ábrelo y escribe `RS1K` (inválida: una sola prueba de sensor), `RS4S1K` (inválida: el 4 queda en rojo) y `RS1S2K` (válida). La expresión es `^R(S[1-3]){2,}K$`.
4. **AND-join.** Clic en la estación de lavado con menos de 5 bandejas sucias: "t_lavar espera: falta Bandeja_sucia". Con monitores, pulsa L dos veces: el segundo relevo dice "falta Minimo_lavado".
5. **Deadlock provocado.** En el título desactiva los monitores. Para el deadlock de la ficha pulsa L dos veces al empezar y enciende AUTO: nadie lava y el carro se llena. Repara el torniquete 1 cuando se bloquee (0:39). El radar pasa a amarillo cerca de 1:15 y a rojo cerca de 1:19. Si no reparas el torniquete, el amarillo llega cerca de 1:57 y el cambio de turno de 2:00 trae 2 permisos: ahí puedes mostrar la salida de amarillo a verde con V, o gastar los permisos con V y L para llegar al rojo. El bloqueo simétrico es más corto: pulsa V dos veces al empezar y el radar pasa a rojo con el primer estudiante (0:03).
6. **Deadlock prevenido.** En la pantalla de game over pulsa "Reintentar con monitores" y repite: el segundo relevo ya no se dispara.
7. **Ecuación de estado.** Pulsa I: Pre, Post, A y la cuenta M_k = M_{k−1} + Aᵀ · u_k del último disparo. "Probar disparo" marca en rojo el lugar que no alcanza. La pestaña Árbol muestra 7 nodos desde M0 sin monitores y 5 con monitores.

## Modelo formal

- Autómatas: `docs/modelo/automatas.md`. Red de Petri: `docs/modelo/petri.md`.
- Pasos de verificación en JFLAP y PIPE2: `modelos/README.md`.

## Herramientas

El código se generó con un agente de programación a partir del modelo formal y del GDD, siguiendo los 17 prompts de la guía. El registro está en `PROMPTS.md`.
