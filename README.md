# UniFood Rush

Simulador interactivo isométrico 2.5D de un comedor universitario, guiado por un modelo formal: autómatas de estado finito (Unidad 2), una red de Petri (Unidad 3), Cadenas de Markov en tiempo discreto (Unidad 4) y un Event Log para minería de procesos (Unidad 5).

Proyecto 13 de Modelado y Simulación de Sistemas de Eventos Discretos (167413), Universidad de Pamplona. Laboratorio 1 (Fase 1) y Laboratorio 2 (Fase 2, rama `fase2`).
Equipo: José Alejandro Morales, Amir Sarmiento, Carlos Antolinez.

Simulador en línea (Fase 1): **https://dinamyt.org/unifood/** · Código: https://github.com/ArsenalCrack/unifood-rush

## Qué agrega la Fase 2

- **Cadena de Markov Oleada** (ficha D.13): cada paso k (30 s de simulación) la oleada de llegada es Baja, Media o Alta y trae 4, 10 o 18 estudiantes. Un `Phaser.Time.TimerEvent` da el paso; el núcleo `src/sed/markov.js` sortea con la semilla y calcula π^(n), π, la clasificación, la absorción y la prueba χ². La **cadena Mesas** es el modelo de referencia que se compara con la ocupación real de la red de Petri.
- **Línea 3**: el jugador la abre cuando el panel anticipa una oleada alta; cuesta puntos por paso.
- **Panel de Markov** (tecla M): matriz P en mapa de calor, π^(n) con deslizador, Chapman-Kolmogorov, largo plazo con la calculadora de dimensionamiento y datos de la partida con χ².
- **Event Log**: cada estudiante es un caso (EST-0001) con seis actividades, recurso y estado de Markov; se descarga en CSV y XES desde el navegador (tecla E) y la simulación acelerada «Generar log» produce 300 casos cerrados sin dibujar.
- **Análisis** en `analisis/`: validación de las cadenas en Python y minería de procesos con PM4Py.

Con la opción «Ola fija (Fase 1)» de la pantalla de título el juego vuelve a ser el de la Fase 1.

## Requisitos

- Node.js 24 LTS o 22 LTS (incluye npm)
- Google Chrome o Microsoft Edge 115 o superior
- Internet, para cargar Phaser 4.2.1 desde la CDN de jsDelivr
- Para el análisis: Python 3.11 o superior con las librerías de `analisis/requirements.txt` y Graphviz

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

93 pruebas con el ejecutor de Node (`node --test`), sin librerías extra:

| Archivo | Qué comprueba |
|---|---|
| `test/reloj.test.js` | Calendario de eventos en orden de tiempo, pausa, velocidad y semilla reproducible |
| `test/automatas.test.js` | Palabras aceptadas y rechazadas, determinismo, composición (30, 11, 59 y 90 estados), RegExp y DFA iguales en 20 palabras |
| `test/supervisor.test.js` | Estados prohibidos, 10 000 eventos aleatorios sin entrar a Violacion, intento bloqueado en el juego |
| `test/redPetri.test.js` | Pre, Post, A, AND-join, ecuación de estado, deadlock de la ficha en 72 disparos, monitores, invariantes P en 1000 disparos, árbol de cobertura y ω |
| `test/comedor.test.js` | Turno completo, deadlock en el juego, reintento, salida de amarillo a verde, consola de reparación, monitores, 2 minutos a ×4 |
| `test/markov.test.js` | Fase 2: P estocástica, Chapman-Kolmogorov, π^(n), π, retorno, riesgo y clasificación iguales a `analisis/resultados_python.json` (1e-6), absorción con la ficha D.1, 10 000 pasos a menos de 0,02 de π, semilla, χ² y franjas |
| `test/fase2.test.js` | Fase 2: 4, 10 o 18 llegadas por paso, paso k en k · 30 s, el temporizador externo da la misma partida a ×1, ×4 y ×8, cadena Mesas observada en la red, línea 3, compra de relevo, puntaje, reintento y turno continuo |
| `test/registrador.test.js` | Fase 2: actividades en orden normativo, Case_ID únicos, tiempos crecientes desde el reloj de simulación, recursos, rechazos como lecturas repetidas, casos incompletos, misma semilla y mismo log |
| `test/exportar.test.js` | Fase 2: CSV con BOM y 7 columnas, XES válido de 5 trazas, 300 casos y 1838 eventos con «Generar log», mejora base contra mejorada |
| `test/arquitectura.test.js` | El núcleo y la telemetría no mencionan el motor de juego, solo `descarga.js` usa el DOM, no hay `Math.random()`, Phaser solo por CDN, la vista no cambia estados, `.jff` y PNML iguales a los JSON |
| `test/resolucion.test.js` | Factor de resolución del lienzo según la pantalla |

## Compilar y entregar

```bash
npm run build
```

```bash
npm run preview
```

Comprueba el juego en http://localhost:4173. Para el ZIP del aula virtual (el contenido de `dist/`, con `index.html` en la raíz), escribe el número del grupo; este equipo es el grupo 3:

```bash
npm run zip -- 3
```

Compila y crea `Grupo3_UniFoodRush_Fase2.zip`, de unos 60 KB. No uses `Compress-Archive` de Windows PowerShell 5.1: guarda las rutas como `assets\…` y, al descomprimirlo en el aula virtual, el juego no encuentra su carpeta `assets/`.

## Despliegue en Internet

La Fase 1 está publicada en **https://dinamyt.org/unifood/**. El simulador es estático: se publica copiando `dist/` al servidor con HTTPS.

```bash
npm run desplegar -- usuario@servidor /var/www/unifood-rush
```

El comando ejecuta las pruebas, compila y copia los archivos por SSH. La configuración del servidor web se hace una sola vez con `despliegue/instalar-en-caddy.sh`; los pasos están en `docs/despliegue.md`. La Fase 2 se publica igual cuando el equipo lo decida (en la Fase 2 el despliegue es opcional).

## Otros comandos

| Comando | Para qué |
|---|---|
| `npm run log` | Genera `analisis/logs/entrega/base` y `mejorado` (CSV y XES, 300 casos cerrados, semilla 96) |
| `npm run log -- --pasos 1000` | Validación estadística: 1000 pasos k en `analisis/logs/validacion_1000_pasos.json` |
| `npm run normativo` | Escribe la Workflow Net normativa en `analisis/modelo_normativo.pnml` y su versión para PIPE2 |
| `npm run modelos` | Regenera `modelos/` (archivos `.jff` de JFLAP y PNML de PIPE2) desde los JSON de `src/sed/modelos/` |
| `npm run simular` | Corre los 3 turnos de la Fase 1 sin gráficos con 5 políticas de relevo |
| `npm run dev` y abrir `/hoja-arte.html` o `/hoja-arte-fase2.html` | Hojas de arte de la Fase 1 y de la Fase 2 |

## Estructura

```
.agents/skills/        Cinco habilidades: diseñador, ingeniero SED, director de arte,
                       ingeniero estocástico y analista de procesos
analisis/              Fase 2: validación de las cadenas en Python, modelo normativo,
                       mineria.py, logs de la entrega y salidas (ver analisis/README.md)
modelos/               Archivos para JFLAP (.jff) y PIPE2 (.xml y .pnml), capturas de la verificación
docs/GDD.md            Documento de diseño (capítulo 16: Fase 2)
docs/arte.md           Guía de estilo (sección 9: Fase 2)
docs/modelo/           automatas.md, petri.md y markov.md: el modelo formal en tablas
docs/log.md            Diseño del Event Log: caso, actividades, recursos y modelo normativo
docs/informe.md        Tablas de las secciones 5.2, 5.9 y 5.10 de las dos fases y postmortem
src/sed/               NÚCLEO FORMAL, sin motor de juego ni DOM
  automata.js          δ(q, σ): ejecutar(σ) es el único cambio de estado
  composicion.js       Producto síncrono y supervisor por estados prohibidos
  redPetri.js          Pre, Post, A, habilitada(t), disparar(t), conflictos, deadlock
  cobertura.js         Árbol de cobertura de Karp y Miller con ω y explorar() para el radar
  markov.js            Fase 2: CadenaMarkov (paso, π^(n), estacionaria, clasificar, absorción, χ²)
  reloj.js             Reloj de simulación con calendario de eventos futuros (×1, ×2, ×4, ×8)
  aleatorio.js         Generador con semilla (mulberry32): todo el azar del juego
  modelos/             JSON de los autómatas, de las dos redes y de las cadenas (markov/)
src/simulacion/        Motor del comedor: une autómatas, red, reloj y cadenas (sin motor de juego);
                       politica.js (política automática) y acelerada.js (Generar log)
src/telemetria/        Fase 2: registrador.js, exportarCSV.js, exportarXES.js y descarga.js
src/escenas/           Arranque, Titulo, Planta, HUDPartida, HUDMaquina, Inspector, PanelMarkov,
                       GenerarLog, Resultados
src/arte/              Dibujo en código; markov.js tiene el arte de la Fase 2
test/                  Pruebas del núcleo, del motor, del registro y de la arquitectura
scripts/               exportar-modelos, simular, generar-log, modelo-normativo, empaquetar, desplegar
```

Reglas del proyecto: ninguna máquina cambia de estado si no es por δ (`Automata.ejecutar`); ningún recurso se mueve si no es por el disparo de una transición (`RedPetri.disparar`) o por un evento externo (`agregarTokens`); todo el azar sale del generador con semilla y de las cadenas; el log se arma con los eventos del núcleo, nunca desde las escenas.

## Controles

| Acción | Mouse o táctil | Teclado |
|---|---|---|
| Servir al primero de una fila | Mostrador de la línea | Q y W (la línea 3, con clic en su mostrador) |
| Ver el autómata de un torniquete o estudiante | Clic sobre él | – |
| Relevo a la línea o al lavado | Flechas del tablero de relevo o botones →LÍN y →LAV | → y ← (o V) |
| Pausa, inspector, velocidad | Botones PAUSA, INSP y ×1 | P, I, 1 2 4 8 |
| Piloto de servir, monitores | Botones AUTO y MON | A, N |
| Panel de Markov | Botón MARKOV o clic derecho (sobre las mesas abre la cadena Mesas) | M |
| Últimos 10 eventos del log | Botón LOG | L |
| Exportar el Event Log (CSV o XES) | Botón EXPORTAR | E |
| Abrir o cerrar la línea 3 | Botón LÍNEA 3 | 3 |
| Mapa de calor de las esperas | Botón CALOR | H |
| Terminar el turno 4 continuo | Botón FIN | – |
| Cerrar panel, fps | Botón X | Esc, F1 |
| Cámara | Arrastre y rueda o pellizco | – |

En la Fase 2, M y L pasaron al panel de Markov y a la lista de eventos, como pide la guía; los monitores quedaron en N y el relevo a la línea en →.

## Guion para la sustentación de la Fase 2

La semilla es fija (96) y cada turno tiene su propia secuencia de oleadas. En el turno 3, después de los pasos 1 a 13, la oleada es siempre: Baja, Alta, Alta, Media, Media, Media, Media, Media, Baja, Media, Media, Alta y Alta.

1. **La cadena.** Abre el panel (M) en la pestaña Matriz: P de la ficha, fila activa resaltada. En Largo plazo: clase única recurrente de periodo 1, ergódica, π = (0,3179; 0,3931; 0,2890).
2. **π^(n) que pida el docente.** Pestaña Transitorio: mueve n con el deslizador. Con «Desde: π^(0) ficha» y n = 5 sale (0,3313; 0,3910; 0,2777), igual a `analisis/resultados_python.json`. Chapman-Kolmogorov: P^(m+n) = P^m · P^n con diferencia del orden de 10^−16.
3. **Anticipar un fallo.** Turno 3 con piloto: en el paso 10 la oleada pasa de Baja a Media y el indicador del HUD parpadea en amarillo (riesgo 0,509 de Alta en 3 pasos). Abre la línea 3 (tecla 3): en el paso 12 llega la oleada Alta con la línea ya abierta (pronóstico acertado, +15).
4. **Dimensionamiento.** Largo plazo, calculadora: demanda media 10,40 por paso; con 2 líneas la utilización en Alta es 1,44 y con 3 líneas 0,96.
5. **χ².** Turno 4 a ×8 durante 100 pasos o más: Datos de la partida muestra la P estimada y que χ² no rechaza P. Sin esperar: `npm run log -- --pasos 1000` (χ² = 4,23 con 6 gl, valor p 0,646). Con pocos pasos el panel avisa que la aproximación no es confiable.
6. **Event Log.** E y «Descargar CSV» o «Descargar XES»; o «Generar log» en el título. Se importa en PM4Py (`analisis/mineria.py`), ProM o Disco.
7. **Minería.** Descubrimiento: el Inductive Miner encuentra el lazo de `Pasar_torniquete`. Conformidad: el 88,3 % de los casos sigue el modelo normativo; el desvío es la lectura repetida por rechazo del carné. Desempeño: el cuello de botella es `Esperar_fila` (154 min de espera total en el log base). Mejora: con la línea 3 anticipada, el ciclo medio baja 36,5 % y la llegada a la bandeja en oleada Alta pasa de 33,8 s a 6,8 s.

El guion de la Fase 1 (autómatas, supervisor, reparación, deadlock e inspector) se repite igual con la opción «Ola fija (Fase 1)» del título; ver `docs/informe.md`.

## Modelo formal

- Autómatas: `docs/modelo/automatas.md`. Red de Petri: `docs/modelo/petri.md`. Cadenas de Markov: `docs/modelo/markov.md`. Event Log: `docs/log.md`.
- Verificación de la Fase 1 en JFLAP 7.1 y PIPE2 4.3.0, con resultados y capturas: `modelos/README.md`.

## Herramientas

El código se generó con un agente de programación (Claude Code) a partir del modelo formal y del GDD, siguiendo los prompts de las guías. El registro está en `PROMPTS.md`.
