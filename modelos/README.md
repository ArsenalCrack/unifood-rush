# modelos/ · Verificación en software académico

Estos archivos son la especificación del comportamiento. Se generan con `npm run modelos` desde los JSON de `src/sed/modelos/`, y `test/arquitectura.test.js` falla si dejan de coincidir. Si algún número no coincide con el software académico, se corrige el modelo y se vuelve a generar; el juego no se corrige a mano.

**Verificado el 16 y el 17 de noviembre de 2026** con JFLAP 7.1 y PIPE2 4.3.0. Los resultados están en las tablas de las secciones 5.2 y 5.9 de `docs/informe.md` y las capturas en `capturas/`. Todo coincide con `npm test`. Hay dos salvedades de PIPE, explicadas abajo: su "Deadlock: true" incluye los reposos, y con monitores su análisis de invariantes lista solo 2.

## Autómatas en JFLAP 7.1 (`automatas/`)

| Archivo | Qué es | Estados | Inicial | Finales (Qm) | JFLAP 7.1 |
|---|---|---|---|---|---|
| `estudiante.jff` | Autómata Estudiante de la ficha | 6 | En_Fila | Salida | 6 estados, 5 transiciones, determinista |
| `torniquete.jff` | Autómata Torniquete de la ficha | 5 | Listo | Listo, Acceso | 5 estados, 7 transiciones, determinista |
| `contador_rechazos.jff` | Extensión: bloqueo tras 3 rechazos | 4 | C0 | C0, C1, C2 | 4 estados, 7 transiciones, determinista |
| `registro_acceso.jff` | Especificación del supervisor | 3 | Sin_acceso | Sin_acceso, Con_acceso | 3 estados, 6 transiciones, determinista |
| `reparacion_regex.jff` | Expresión regular `RS(1+2+3)S(1+2+3)(S(1+2+3))*K` | – | – | – | NFA de 40 estados → DFA de 15 (16 con trampa) → DFA mínimo de 7 |
| `reparacion_dfa.jff` | DFA mínimo de la reparación | 7 | q0 | q6 | 7 estados, 11 transiciones; igual al que da JFLAP desde la expresión |
| `composicion_estudiante_torniquete.jff` | Producto Estudiante ‖ Torniquete | 30 | En_Fila\|Listo | Salida con Listo o Acceso | 30 estados, 67 transiciones |
| `composicion_torniquete_contador.jff` | Producto Torniquete ‖ Contador_Rechazos | 11 | Listo\|C0 | – | 11 estados, 14 transiciones |
| `planta_con_especificacion.jff` | Estudiante ‖ Torniquete ‖ Registro_Acceso | 59 | En_Fila\|Listo\|Sin_acceso | – | 59 estados (25 con Violacion), 132 transiciones |
| `supervisor.jff` | El anterior sin los 25 estados de Violacion | 34 | En_Fila\|Listo\|Sin_acceso | – | 34 estados, 73 transiciones, ninguno con Violacion |

Ningún archivo tiene estados no deterministas. Se contaron con el mismo detector que usa Test > Highlight Nondeterminism.

Códigos de una letra: Estudiante `s` servir, `b` buscar_mesa, `m` sentarse, `t` terminar, `e` entregar. Torniquete `l` leer, `a` acceso_ok, `r` rechazo, `x` bloqueo, `i` reiniciar.

Las palabras de prueba están en `automatas/palabras_*.txt`, una por línea, listas para Input > Multiple Run > Load Inputs. La primera línea vacía de `palabras_torniquete.txt` es la palabra vacía; en JFLAP se escribe con Enter Lambda. Son las de la sección 7 de `docs/modelo/automatas.md`. Las 23 dan en JFLAP lo mismo que en `npm test`.

## Red de Petri en PIPE2 (`petri/`)

Los `.xml` están en el dialecto de PIPE 4.3; los `.pnml` son PNML estándar para WoPeD u otros editores. Se usó PIPE2 4.3.0 porque PIPE 5.0.2 no trae los módulos de incidencia ni de invariantes.

| Archivo | Marcado inicial | Para qué |
|---|---|---|
| `ficha_M0.xml` y `.pnml` | M0 del juego | Matrices, invariantes y árbol desde M0 |
| `monitor_M0.xml` y `.pnml` | M0 con monitores | Lo mismo con la regla de prevención |
| `ficha_escenarioA.xml` | En_fila = 3, Relevo = 0 | Juego de tokens de la operación normal |
| `ficha_escenarioB.xml` | En_fila = 2, Relevo = 2 | Camino más corto a un interbloqueo |
| `monitor_escenarioB.xml` | Igual, con monitores | Comprobar que el interbloqueo desaparece |
| `ficha_escenarioC.xml` | A 3 disparos del deadlock de la ficha | Marcado muerto de la ficha |
| `monitor_escenarioC.xml` | El mismo instante con personal 3 y 1 | Comprobar la prevención |
| `ficha_deadlock30.xml` | En_fila = 30 | Secuencia completa de 72 disparos |

### Resultados de PIPE2 4.3.0

| Red | Módulo | Resultado |
|---|---|---|
| `ficha_M0` | Incidence & Marking | 11 lugares, 6 transiciones; I⁺, I⁻ y C = I⁺ − I⁻ iguales a Pre, Post y A de `docs/modelo/petri.md`; t_lavar con peso 5. Initial = 0 30 2 0 20 0 10 0 0 2 2 |
| `ficha_M0` | Invariant Analysis | 5 invariantes P: bandejas (5·… = 150), mesas (20), carro (5·… = 50), personal (4) y estudiantes (En_fila + Con_bandeja + Almorzando + Salida = 0); ningún invariante T |
| `ficha_M0` | State Space Analysis | Bounded: true · Safe: false · Deadlock: true por el camino t_a_linea, t_a_linea (reposo: no hay estudiantes) |
| `ficha_M0` | Reachability/Coverability Graph | 6 marcados |
| `monitor_M0` | Incidence & Marking | 13 lugares, 6 transiciones; Minimo_lavado y Minimo_linea empiezan en 1 |
| `monitor_M0` | Invariant Analysis | Solo 2 invariantes P (estudiantes y bandejas), también en una sesión nueva de PIPE. Los otros cinco se comprueban con la matriz de la captura: mesas, carro, personal, Personal_linea + Minimo_lavado = 3 y Personal_lavado + Minimo_linea = 3 cumplen yᵀ · C = 0 |
| `monitor_M0` | State Space Analysis | Bounded: true · Safe: false · Deadlock: true por t_a_linea, t_a_lavado (reposo) |
| `monitor_M0` | Reachability/Coverability Graph | 4 marcados: desaparecen los de todo el personal en un lado, (4, 0) y (0, 4) |
| `ficha_escenarioA` | Animation mode | t_servir, t_sentarse, t_terminar: En_fila 2, Bandeja_limpia 29, Salida 1, Bandeja_sucia 1, Espacio_carro 9; t_servir sigue habilitada |
| `ficha_escenarioB` | State Space Analysis | Deadlock: true. PIPE da un camino de 8 disparos que deja a los 2 estudiantes en Salida (reposo). El interbloqueo de 2 disparos (t_a_lavado, t_a_lavado) también existe, pero la búsqueda de PIPE no recorre por niveles |
| `monitor_escenarioB` | State Space Analysis | Deadlock: true por un camino de 8 disparos que termina en reposo |
| `ficha_escenarioC` | State Space Analysis y Animation mode | Deadlock: true por t_servir, t_terminar, t_sentarse. Al dispararlas no queda nada habilitado: M_d = (0, 0, 4, 0, 0, 20, 0, 10, 10, 0, 0), el marcado muerto de la ficha |
| `monitor_escenarioC` | State Space Analysis | El camino de PIPE (t_servir, t_sentarse, 21 t_terminar, 6 t_lavar) termina con los 30 estudiantes en Salida y las bandejas lavadas: reposo |

PIPE2 responde "Deadlock: true" ante cualquier marcado muerto, también los de reposo. Hay interbloqueo solo si en el marcado muerto queda algún token en En_fila, Con_bandeja o Almorzando; así los separan el juego y `npm test`. Con esa regla, los valores del núcleo son estos:

| Escenario | Estados del grafo | Marcados muertos | Interbloqueos | Camino más corto a un interbloqueo |
|---|---|---|---|---|
| `ficha_M0` | 6 | 3 | 0 | Solo relevos; los muertos son de reposo |
| `monitor_M0` | 4 | 1 | 0 | – |
| `ficha_escenarioA` | 20 | 1 | 0 | El muerto es el final: los 3 estudiantes en Salida |
| `ficha_escenarioB` | 60 | 5 | 2 | t_a_lavado, t_a_lavado |
| `monitor_escenarioB` | 40 | 1 | 0 | – |
| `ficha_escenarioC` | 5 | 1 | 1 | t_servir, t_terminar, t_sentarse |
| `monitor_escenarioC` | 139 | 1 | 0 | – |

El árbol de cobertura del juego cuenta además las hojas duplicadas: 7, 5, 31, 129, 89, 6 y 287 nodos.

## Capturas (`capturas/`)

| Captura | Qué muestra |
|---|---|
| `jflap_estudiante_palabras.png` | Estudiante en Multiple Run: `sbmte` acepta; `sbmt`, `bsmte`, `sbtme`, `ssbmte` rechazan |
| `jflap_torniquete_palabras.png` | Torniquete en Multiple Run: vacía, `la`, `lrla`, `lrlrlrxi` aceptan; `l`, `lrx`, `lax`, `li` rechazan |
| `jflap_torniquete_determinismo.png` | Torniquete tras Test > Highlight Nondeterminism: ningún estado resaltado |
| `jflap_contador_palabras.png` | Contador_Rechazos: `lrlrlrx` acepta; `rx`, `rrrl` rechazan |
| `jflap_registro_acceso.png` | Especificación Registro_Acceso |
| `jflap_supervisor.png` | Supervisor de 34 estados |
| `jflap_reparacion_dfa_palabras.png` | DFA de reparación: `RS1S2K`, `RS3S3S1K`, `RS3S3S2K` aceptan; `RS1K`, `RS4S1K`, `S1S2K`, `RS1S2` rechazan |
| `jflap_regex_1_a_nfa.png` | Convert to NFA desde `reparacion_regex.jff` |
| `jflap_regex_2_dfa.png` | Convert to DFA |
| `jflap_regex_3_arbol.png` | Minimize DFA: árbol de estados distinguibles |
| `jflap_regex_4_dfa_minimo.png` | DFA mínimo de 7 estados, igual a `reparacion_dfa.jff` |
| `pipe_red_ficha_M0.png` y `pipe_red_monitor_M0.png` | Las dos redes con su marcado inicial |
| `pipe_incidencia_M0.png` y `pipe_incidencia_monitor.png` | Incidence & Marking: I⁺ e I⁻ completas |
| `pipe_invariantes_M0.png` y `pipe_invariantes_monitor.png` | Invariant Analysis de cada red |
| `pipe_estados_M0.png` y `pipe_estados_monitor_M0.png` | State Space Analysis desde M0 |
| `pipe_arbol_M0.png`, `pipe_arbol_M0_grafo.png`, `pipe_arbol_monitor_M0.png` y `pipe_arbol_monitor_M0_grafo.png` | Reachability/Coverability Graph: 6 y 4 marcados |
| `pipe_animacion_normal.png` | Animation mode del escenario A tras t_servir, t_sentarse y t_terminar |
| `pipe_estados_B.png` y `pipe_estados_monitor_B.png` | State Space Analysis del escenario B, sin y con monitores |
| `pipe_red_escenarioC.png` | Red del escenario C antes de los 3 últimos disparos |
| `pipe_estados_C.png` y `pipe_estados_monitor_C.png` | State Space Analysis del escenario C, sin y con monitores |
| `pipe_deadlock_animacion.png` | Animation mode: marcado muerto de la ficha, sin transiciones habilitadas |

## Cómo se tomaron las capturas (`verificacion/`)

Las capturas no son dibujos: las tomaron tres programas en Java que cargan las clases de JFLAP 7.1 y de PIPE 4.3.0. Cada programa abre los archivos de esta carpeta y pulsa los mismos botones que un usuario: Multiple Run, Highlight Nondeterminism, Convert to NFA, Convert to DFA, Minimize, Calculate, Analyse y Animation mode. Después guarda la ventana. Los resultados los calcula JFLAP o PIPE, no el juego.

| Programa | Qué hace | Uso |
|---|---|---|
| `CapturasJflap.java` | Abre cada `.jff`, corre Multiple Run con un `palabras_*.txt`, cuenta estados no deterministas y captura | `java -cp JFLAP7.1.jar;. CapturasJflap <salida> "multiple\|archivo.jff\|palabras.txt\|captura.png"` |
| `RegexJflap.java` | Expresión regular → NFA → DFA → DFA mínimo con los asistentes de JFLAP | `java -cp JFLAP7.1.jar;. RegexJflap <reparacion_regex.jff> <salida>` |
| `PipeCapturas.java` | Abre las redes, corre los módulos de análisis, dispara transiciones en Animation mode y pinta cada ventana | Desde la carpeta `Pipe` de PIPE 4.3.0: `java -cp .;lib/*;<clases> PipeCapturas <carpeta petri> <salida>` |

Se compilan con `javac --release 8` contra el `.jar` de JFLAP o las bibliotecas de PIPE, y se ejecutan con Java 8. Las capturas de JFLAP se tomaron de la pantalla, con la ventana de JFLAP al frente. Hay dos excepciones: `jflap_reparacion_dfa_palabras.png` y las de PIPE se pintaron directamente desde la ventana, así que no incluyen nada más del escritorio.

Para repetir la verificación a mano basta con abrir los mismos archivos en JFLAP y en PIPE2 y usar esos menús.
