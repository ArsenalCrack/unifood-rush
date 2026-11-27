# Informe · UniFood Rush (proyecto 13)

Equipo: José Alejandro Morales, Amir Sarmiento, Carlos Antolinez. Grupo 3.
Asignatura: Modelado y Simulación de Sistemas de Eventos Discretos (167413). Fase 1, Laboratorio 1.

**Cómo leer este informe.** La columna "Núcleo" trae lo que comprueba `npm test` (52 pruebas). Las columnas de JFLAP y PIPE2 se llenaron el 16 y el 17 de noviembre de 2026: se abrieron los archivos de `modelos/` en JFLAP 7.1 y en PIPE2 4.3.0 y se usaron sus propios módulos. En JFLAP: Multiple Run, Highlight Nondeterminism y las conversiones de la expresión regular. En PIPE2: Incidence & Marking, Invariant Analysis, State Space Analysis, Reachability/Coverability Graph y Animation mode. Cada resultado tiene su captura en `modelos/capturas/`, y `modelos/README.md` explica cada una. Los tiempos "Video m:ss" son del video de la entrega (2 min 31 s). Quedan en ☐ solo las pruebas que el equipo hace en persona: el celular real, el playtest con otro equipo y el enlace del aula virtual.

---

## Sección 5.2 d) Registro del modelo verificado

### Autómatas

| Autómata | Códigos de Σ | Σuc (no controlables) | Σuo (no observables) | q0 | Qm | N.º de estados | ¿Determinista? | Archivo | JFLAP 7.1 |
|---|---|---|---|---|---|---|---|---|---|
| Estudiante | s b m t e | b m t e | ∅ | En_Fila | Salida | 6 | Sí | `estudiante.jff` | 6 estados, 5 transiciones, 0 estados no deterministas |
| Torniquete | l a r x i | l a r x | ∅ | Listo | Listo, Acceso | 5 | Sí | `torniquete.jff` | 5 estados, 7 transiciones, 0 no deterministas (`jflap_torniquete_determinismo.png`) |
| Contador_Rechazos | l r x | l r x | ∅ | C0 | C0, C1, C2 | 4 | Sí | `contador_rechazos.jff` | 4 estados, 7 transiciones, 0 no deterministas |
| Registro_Acceso (especificación) | a s | a | ∅ | Sin_acceso | Sin_acceso, Con_acceso | 3 | Sí | `registro_acceso.jff` | 3 estados, 6 transiciones, 0 no deterministas (`jflap_registro_acceso.png`) |
| DFA de reparación | R S 1 2 3 K | – | ∅ | q0 | q6 | 7 | Sí | `reparacion_dfa.jff` | 7 estados, 11 transiciones, 0 no deterministas |

Los estados no deterministas los cuenta el mismo detector que usa Test > Highlight Nondeterminism.

### Composiciones y supervisor

| Archivo | Qué es | Núcleo | JFLAP 7.1 |
|---|---|---|---|
| `composicion_estudiante_torniquete.jff` | Planta G = Estudiante ‖ Torniquete | 30 estados | 30 estados, 67 transiciones, determinista |
| `composicion_torniquete_contador.jff` | Torniquete ‖ Contador_Rechazos | 11 estados | 11 estados, 14 transiciones, determinista |
| `planta_con_especificacion.jff` | G ‖ Registro_Acceso | 59 estados (25 con Violacion) | 59 estados, 132 transiciones, determinista |
| `supervisor.jff` | El anterior sin los estados de Violacion | 34 estados | 34 estados, 73 transiciones, determinista; ningún estado se llama Violacion (`jflap_supervisor.png`) |

### Expresión regular de la reparación

| Paso en JFLAP 7.1 | Resultado | Captura |
|---|---|---|
| `reparacion_regex.jff`: Convert to NFA (Do All) | NFA de 40 estados y 47 transiciones | `jflap_regex_1_a_nfa.png` |
| Convert to DFA (Complete) | DFA de 15 estados y 26 transiciones, 1 final | `jflap_regex_2_dfa.png` |
| Minimize DFA | El DFA completo tiene 16 estados con el estado trampa. El árbol de estados distinguibles lo reduce a 7 estados y 11 transiciones | `jflap_regex_3_arbol.png` |
| DFA mínimo | 7 estados y 11 transiciones, igual a `reparacion_dfa.jff` (q0 a q6, con el ciclo S/1-2-3 entre q4 y q5) | `jflap_regex_4_dfa_minimo.png` |

### Palabras de prueba

Listas en `modelos/automatas/palabras_*.txt`, las mismas de la sección 7 de `docs/modelo/automatas.md` y de `test/automatas.test.js`.

| Autómata | Palabra | Qué representa | ¿Debe aceptarse? | Núcleo (`npm test`) | Resultado en JFLAP |
|---|---|---|---|---|---|
| Estudiante | `sbmte` | Recorrido completo | Sí | Acepta | Acepta |
| Estudiante | `sbmt` | No entrega el menaje | No | Rechaza | Rechaza |
| Estudiante | `bsmte` | Busca mesa sin ser servido | No | Rechaza | Rechaza |
| Estudiante | `sbtme` | Termina antes de sentarse | No | Rechaza | Rechaza |
| Estudiante | `ssbmte` | Lo sirven dos veces | No | Rechaza | Rechaza |
| Torniquete | (vacía) | Sin lecturas | Sí | Acepta | Acepta (casilla con Enter Lambda) |
| Torniquete | `la` | Lectura con acceso | Sí | Acepta | Acepta |
| Torniquete | `lrla` | Rechazo y luego acceso | Sí | Acepta | Acepta |
| Torniquete | `lrlrlrxi` | Tres rechazos, bloqueo y reinicio | Sí | Acepta | Acepta |
| Torniquete | `l` | Lectura sin resultado | No | Rechaza | Rechaza |
| Torniquete | `lrx` | Bloqueado sin reiniciar | No | Rechaza | Rechaza |
| Torniquete | `lax` | Bloqueo tras un acceso | No | Rechaza | Rechaza |
| Torniquete | `li` | Reiniciar sin estar bloqueado | No | Rechaza | Rechaza |
| Contador_Rechazos | `lrlrlrx` | Bloqueo tras exactamente 3 rechazos | Sí | Acepta | Acepta |
| Contador_Rechazos | `rx` | Bloqueo con un solo rechazo | No | Rechaza | Rechaza |
| Contador_Rechazos | `rrrl` | Otra lectura tras el tercer rechazo | No | Rechaza | Rechaza |
| Reparación | `RS1S2K` | Válida de la ficha | Sí | Acepta (RegExp y DFA) | Acepta |
| Reparación | `RS3S3S1K` | Tres pruebas de sensor | Sí | Acepta | Acepta |
| Reparación | `RS3S3S2K` | Tres pruebas de sensor | Sí | Acepta | Acepta |
| Reparación | `RS1K` | Una sola prueba de sensor | No | Rechaza | Rechaza |
| Reparación | `RS4S1K` | El sensor 4 no existe | No | Rechaza | Rechaza |
| Reparación | `S1S2K` | Falta el reset inicial | No | Rechaza | Rechaza |
| Reparación | `RS1S2` | Falta confirmar | No | Rechaza | Rechaza |

Capturas de Multiple Run: `jflap_estudiante_palabras.png`, `jflap_torniquete_palabras.png`, `jflap_contador_palabras.png` y `jflap_reparacion_dfa_palabras.png`. Las 23 palabras dan en JFLAP lo mismo que en el núcleo.

### Red de Petri

| Propiedad | Núcleo (`npm test`) | Resultado en PIPE2 4.3.0 | Evidencia |
|---|---|---|---|
| N.º de lugares y de transiciones | 11 y 6 (13 y 6 con monitores) | 11 y 6; 13 y 6 con monitores (filas y columnas de Incidence & Marking) | `pipe_red_ficha_M0.png`, `pipe_red_monitor_M0.png`, `pipe_incidencia_M0.png`, `pipe_incidencia_monitor.png` |
| Marcado inicial M0 | En_fila 0, Bandeja_limpia 30, Personal_linea 2, Con_bandeja 0, Mesa_libre 20, Almorzando 0, Espacio_carro 10, Bandeja_sucia 0, Salida 0, Personal_lavado 2, Relevo 2 | El mismo: Initial = 0 30 2 0 20 0 10 0 0 2 2; con monitores, además Minimo_lavado 1 y Minimo_linea 1. Habilitadas en M0: solo t_a_linea y t_a_lavado | `pipe_red_ficha_M0.png`, `pipe_red_monitor_M0.png` |
| ¿Acotada? Valor de k por lugar | Sí. Bandeja_limpia 30, Con_bandeja 30, Almorzando 20, Mesa_libre 20, Espacio_carro 10, Bandeja_sucia 10, Personal 4 y 4, Relevo 2 | Bounded: true. Las cotas salen de los invariantes P (fila siguiente) | `pipe_estados_M0.png` |
| ¿Segura (1-acotada)? | No | Safe: false | `pipe_estados_M0.png` |
| Deadlock: marcado muerto y secuencia | M_d = (0, 0, 4, 0, 0, 20, 0, 10, 10, 0, 0) con 30 estudiantes; t_a_linea² t_servir²⁹ t_sentarse²⁰ t_terminar⁹ t_sentarse⁹ t_servir t_terminar t_sentarse (72 disparos) | `ficha_escenarioC.xml` está a 3 disparos del final. State Space Analysis: Deadlock: true, con el camino t_servir, t_terminar, t_sentarse. En Animation mode, tras esos tres disparos no queda ninguna transición habilitada y el marcado es M_d | `pipe_red_escenarioC.png`, `pipe_estados_C.png`, `pipe_deadlock_animacion.png` |
| Regla de prevención y verificación | Monitores Minimo_lavado y Minimo_linea. Escenario B: 2 interbloqueos sin monitores y 0 con ellos | El grafo de alcanzabilidad desde M0 baja de 6 a 4 estados: con monitores desaparecen los marcados con todo el personal en un solo lado (4, 0) y (0, 4). En el escenario C con monitores, el camino que da PIPE (t_servir, t_sentarse, 21 t_terminar y 6 t_lavar) termina con los 30 estudiantes en Salida y las bandejas lavadas: un reposo, no un interbloqueo | `pipe_arbol_M0_grafo.png`, `pipe_arbol_monitor_M0_grafo.png`, `pipe_estados_monitor_C.png` |
| Invariantes P | Bandejas = 30, Mesas = 20, Carro = 10, Personal = 4; con monitores, Personal_linea + Minimo_lavado = 3 y Personal_lavado + Minimo_linea = 3 | Red de la ficha: los mismos cuatro y uno más, el de los estudiantes. Bandejas: 5·M(Bandeja_limpia + Con_bandeja + Almorzando + Bandeja_sucia) = 150. Mesas: M(Mesa_libre + Almorzando) = 20. Carro: 5·M(Espacio_carro + Bandeja_sucia) = 50. Personal: M(Personal_linea + Personal_lavado) = 4. Estudiantes: M(En_fila + Con_bandeja + Almorzando + Salida) = 0. El de los estudiantes vale 0 porque las llegadas son externas a la red. Con monitores, PIPE 4.3 lista solo los de estudiantes y bandejas, también en una sesión nueva. Los otros cinco se comprueban a mano con la matriz que da el mismo PIPE: yᵀ · (I⁺ − I⁻) = 0 | `pipe_invariantes_M0.png`, `pipe_invariantes_monitor.png`, `pipe_incidencia_monitor.png` |
| N.º de nodos del árbol de cobertura desde M0 | 7 nodos y 6 marcados distintos; con monitores, 5 y 4 | Reachability/Coverability Graph: 6 estados; con monitores, 4. PIPE dibuja cada marcado una vez, así que coincide con los marcados distintos | `pipe_arbol_M0_grafo.png`, `pipe_arbol_monitor_M0_grafo.png` |

**Cómo leer el "Deadlock: true" de PIPE.** PIPE responde "Deadlock: true" ante cualquier marcado muerto, también ante los de reposo: comedor vacío o todos los estudiantes en Salida. En M0 su camino es t_a_linea, t_a_linea. Ese marcado muerto es de reposo porque no hay estudiantes. Con monitores, su camino desde M0 es t_a_linea, t_a_lavado, también de reposo. En el escenario B, PIPE da un camino de 8 disparos que deja a los dos estudiantes en Salida, o sea un reposo. Pero el interbloqueo de 2 disparos (t_a_lavado, t_a_lavado) también existe. La búsqueda de PIPE no recorre por niveles, y en su registro aparece "Deadlocked node found, but path is not shorter than current path". Por eso el juego y el núcleo clasifican cada marcado muerto. Es interbloqueo si queda algún token en En_fila, Con_bandeja o Almorzando; si no, es reposo. Con esa regla, el escenario B tiene 2 interbloqueos sin monitores y ninguno con ellos.

PIPE2 5.0.2 no trae los módulos de incidencia ni de invariantes, por eso se usó PIPE2 4.3.0.

---

## Sección 5.9 Pruebas y ajuste

### a) Criterios del GDD

| Criterio de aceptación | Cómo se prueba | Núcleo / desarrollo | Repetido (video o software académico) |
|---|---|---|---|
| El color e ícono de cada máquina coinciden con el estado de su autómata | Abrir el HUD de 3 máquinas en momentos distintos | Cumple: E3 En_Fila amarillo, T2 Acceso verde, T1 Bloqueado rojo | Cumple. Video 0:30 E1 En_Fila, 0:47 T2 Acceso, 1:02 T1 Bloqueado |
| El grafo del HUD es igual al de JFLAP | Comparar captura del HUD con el `.jff` | El grafo y el `.jff` salen del mismo JSON, con la misma distribución | Cumple: el HUD del torniquete (video 0:47) y `jflap_torniquete_palabras.png` tienen los mismos 5 estados en la misma posición y las mismas 7 transiciones. Igual con el Estudiante (video 0:30 y `jflap_estudiante_palabras.png`) |
| Ninguna máquina cambia de estado sin un evento de δ | Revisar el historial de eventos del HUD | Cumple: prueba de arquitectura; T1 mostró `…l r l r x i l` | Cumple. Video 1:25: la palabra de T1 termina en `l r l r x i` y el historial nombra cada evento |
| La consola repara con palabras de L y rechaza las demás | Tabla del literal c | Cumple | Cumple. Video 1:08 a 1:29: `RS1K` y `RS4S1K` rechazadas, `RS1S2K` repara. JFLAP da lo mismo (literal c) |
| El supervisor nunca deja alcanzar el estado prohibido | Tabla del literal e | Cumple: 10 000 eventos sin Violacion | Cumple. Video 0:56: intento bloqueado, −5. El supervisor de JFLAP no tiene estados de Violacion |
| Ninguna transición se dispara sin sus tokens de entrada | Intentar disparar una estación incompleta | Cumple: "t_lavar espera: falta Bandeja_sucia"; "falta Minimo_linea" | Cumple. Video 1:57: "relevo a la línea: falta Minimo_lavado (0/1)"; en el game over (1:44) cada transición dice qué token le falta |
| El desborde de un lugar con capacidad «desborde» penaliza | Llenar En_fila por encima de 16 | Cumple: −3 puntos por llegada; en el turno 3 con 2 y 2 hubo 54 desbordes | ☐ no aparece en el video |
| El radar pasa por verde, amarillo y rojo; el deadlock termina la partida | Tabla del literal d | Cumple | Cumple. Video: amarillo en 1:38 y rojo con game over en 1:44. Al empezar el turno sin monitores también se ve amarillo (interbloqueo a 2 disparos: t_a_lavado, t_a_lavado) y después verde |
| El inspector calcula bien M_k = M_{k−1} + Aᵀ · u_k | Verificar 3 disparos a mano | Cumple en t_sentarse; el inspector comprueba la suma en cada disparo | Video 2:18: el inspector muestra la cuenta del último disparo con "Comprobado". ☐ dos disparos más a mano |
| HUD completo en las zonas del GDD y 6 logros con aviso | Comparar con la sección 11 del GDD | Cumple; en un turno se ganaron 5 logros y se vio el aviso animado de Fila legal | ☐ ver los 6 avisos, incluido Sin red de seguridad |
| El torniquete se bloquea al tercer rechazo | Mirar "Rechazos contados" en su HUD | Cumple: T1 se bloqueó en 0:39 | Cumple. Video: alerta "Torniquete 1 BLOQUEADO tras 3 rechazos" y HUD de T1 en Bloqueado (1:02) |
| Con el carro lleno los que terminan esperan en su mesa | Dejar el lavado sin personal | Cumple: 20 estudiantes con ícono de admiración | Cumple. Video 1:38: Espacio_carro 0 y Bandeja_sucia 10/10; en el game over, Almorzando 20 |

### b) Conformidad entre el modelo y el juego

| Secuencia de eventos o de disparos | Resultado esperado (estado o marcado) | Resultado en el juego | ¿Coincide? | JFLAP o PIPE2 |
|---|---|---|---|---|
| `sbmte` en un estudiante | Salida | Los 60 estudiantes del turno 1 salieron con la palabra `sbmte` | Sí | JFLAP: Acepta (`jflap_estudiante_palabras.png`) |
| `lrlrlrxi` en el torniquete | Listo | T1: tercer rechazo, bloqueo, `RS1S2K`, Listo | Sí | JFLAP: Acepta (`jflap_torniquete_palabras.png`) |
| t_a_linea, t_a_linea y el turno sin lavar | Marcado muerto M_d | Game over con Bandeja_limpia 0, Mesa_libre 0, Almorzando 20, Espacio_carro 0, Bandeja_sucia 10, Personal_lavado 0, Relevo 0. En el video (1:44): 72 disparos con u = (t_servir 30, t_sentarse 30, t_terminar 10, t_lavar 0, t_a_linea 2, t_a_lavado 0), el mismo conteo que la secuencia de la ficha | Sí | PIPE: el mismo M_d en Animation mode, sin transiciones habilitadas (`pipe_deadlock_animacion.png`) |
| t_a_linea, t_a_linea con monitores | La segunda no está habilitada | "falta Minimo_lavado (0/1)" | Sí | PIPE: el grafo con monitores no tiene el marcado con Personal_linea 4 (`pipe_arbol_monitor_M0_grafo.png`) |

| Dato | Núcleo | Juego | Software académico |
|---|---|---|---|
| N.º de estados de Estudiante ‖ Torniquete | 30 | 30 (pestaña Composición) | JFLAP: 30 estados, 67 transiciones |
| N.º de estados con Registro_Acceso y del supervisor | 59 y 34 | 59 y 34 | JFLAP: 59 (132 transiciones) y 34 (73 transiciones) |
| N.º de nodos del árbol de cobertura desde M0 | 7 y 6 distintos; 5 y 4 con monitores | 5 nodos y 4 distintos con monitores (inspector) | PIPE: 6 marcados; 4 con monitores |
| Marcado muerto del deadlock de la ficha | M_d | El mismo, con los estudiantes restantes en En_fila | PIPE: M_d = (0, 0, 4, 0, 0, 20, 0, 10, 10, 0, 0) |

### c) Consola de reparación

| Palabra ingresada | ¿Pertenece a L? | Resultado en el juego | Estado final de la máquina | JFLAP |
|---|---|---|---|---|
| `RS1S2K` | Sí | Reparó, +15 puntos | Listo | Acepta |
| `RS3S3S2K` | Sí | Reparó | Listo | Acepta |
| `RS1K` | No | No reparó, −10 puntos | Bloqueado | Rechaza |
| `RS4S1K` | No | No reparó; el 4 quedó en rojo: "sin transición desde q2, se esperaba 1 o 2 o 3" | Bloqueado | Rechaza |
| `S1S2K` | No | No reparó | Bloqueado | Rechaza |

Los resultados de JFLAP salen de Multiple Run sobre `reparacion_dfa.jff` (`jflap_reparacion_dfa_palabras.png`). Ese DFA es el mismo que JFLAP obtiene al convertir y minimizar `reparacion_regex.jff`.

### d) Deadlock: provocar y prevenir

| Prueba | Secuencia de decisiones del jugador | Color del radar antes del final | Resultado |
|---|---|---|---|
| Provocar el deadlock de la ficha | Sin monitores: L, L al empezar, AUTO, reparar T1 en 0:39 | Amarillo en 1:15 | Rojo en 1:19: game over por interbloqueo |
| Repetir aplicando la regla de prevención | "Reintentar con monitores"; L, L | Verde | El segundo relevo no se dispara: falta Minimo_lavado |
| Llegar a amarillo y salir a verde con una buena decisión | Sin monitores: L, L y no reparar T1; en 2:00 llegan 2 permisos; pulsar V en 2:05 | Amarillo desde 1:57 | Sigue en amarillo 10 s (un t_a_linea aún bloquearía) y pasa a verde en 2:15, al terminar el primer lavado. El turno termina sin interbloqueo y cuenta 1 deadlock evitado |
| Bloqueo simétrico | Sin monitores: V, V al empezar | Verde | Rojo en 0:03 con el primer estudiante: nadie sirve |
| Video de la entrega | Sin monitores: L, L, AUTO ×4; luego "Reintentar con monitores", L, L y ×4 | Amarillo en 1:38 (video) | Game over en 1:44. Con monitores, el radar sigue en verde hasta el final, con 3 personas en línea y 1 en lavado |

### e) Supervisor

| Intento | Lo esperado según el modelo | Lo que pasó en el juego | ¿Cumple? |
|---|---|---|---|
| Servir desde el mostrador antes del `acceso_ok` | `servir` deshabilitado en (En_Fila, Leyendo, Sin_acceso) | No se sirvió, −5 puntos, tembló la cámara (también en el video, 0:56) | Sí |
| Botón rojo `s · servir` en el HUD de un estudiante de la fila | Deshabilitado con ¬(servir ∧ Registro = Sin_acceso) | Intento bloqueado; el estudiante siguió En_Fila | Sí |
| Jugador que pulsa servir al azar durante 200 s | Nunca se alcanza Violacion | Más de 10 intentos bloqueados y ninguna Violacion | Sí |

### f) Controles alternos

| Acción | Mouse y teclado | Táctil | ¿Funciona? |
|---|---|---|---|
| Seleccionar máquina y abrir HUD | Clic | Tocar | Sí con mouse. ☐ celular real |
| Disparar evento o transición | Clic en el botón; Q, W, L, V | Tocar el botón | Sí con mouse, con teclado y con toques emulados a 375 × 812. ☐ celular real |
| Escribir en la consola de reparación | Teclado | Botones de comandos | Sí con teclado. ☐ botones en celular |
| Pausa e inspector | P, I | Botones PAUSA e INSP | Sí |
| Velocidad de simulación | 1, 2, 4 | Botón de velocidad | Sí |
| Mover y acercar la cámara | Arrastre y rueda | Arrastre y pellizco | Sí con arrastre y rueda. ☐ pellizco en celular real |

### g) Rendimiento

| Momento | fps sin efectos | fps con efectos | Equipo y navegador |
|---|---|---|---|
| Inicio del turno (turno 1, de 0:08 a 0:17) | 320 (3,13 ms por cuadro) | 331 (3,02 ms por cuadro) | Portátil con AMD Ryzen 7 4800H y NVIDIA GeForce GTX 1650. Chromium 156 (navegador integrado de la aplicación de escritorio de Claude). Lienzo de 1920 × 1080 (factor 2) |
| Hora pico a velocidad ×4 (turno 3, de 2:30 a 3:06, 31 estudiantes en la planta) | 260 (3,84 ms) | 262 (3,82 ms) | El mismo |
| Inspector abierto con el árbol de cobertura | 105 (9,56 ms) | 108 (9,25 ms) | El mismo |

**Cómo se midió.** Los valores son fps de capacidad: cuántos cuadros por segundo alcanzaría a dibujar el equipo. En pantalla, el contador F1 muestra como máximo la frecuencia del monitor (60 Hz en uno común). Para medir el margen se tomó el tiempo de cada cuadro: `g.step()` a 60 Hz seguido de `gl.finish()`, que espera a que la GPU termine. Se tomaron 240 cuadros por caso, en bloques alternados con y sin efectos, para medir el mismo momento del turno. Capacidad = 1000 / ms medios por cuadro. El 95 % de los cuadros tardó menos de 3,5 ms al inicio, 5,2 ms en hora pico y 10,5 ms con el inspector. En la hora pico, el piloto estaba encendido y los torniquetes bloqueados se reparaban desde la consola con `RS1S2K`, para mantener el flujo de estudiantes.

"Sin efectos" quiere decir partículas ocultas y bloom apagado desde la consola, porque el juego no tiene un interruptor de efectos. La diferencia entre las dos columnas queda dentro del ruido de la medición: los efectos solo aparecen en eventos puntuales. Ningún caso baja de 50 fps, así que no hizo falta ninguno de los ajustes de la guía. ☐ Medida en un celular real.

### h) Playtest con otro equipo

| Observación del otro equipo | Cambio realizado | Sección a la que se regresó |
|---|---|---|
| ☐ | ☐ | ☐ |

Pendiente del equipo: se hace con otro grupo antes de la entrega o en la jornada de sustentación (5.13 a, punto 4). El enlace público facilita que el otro equipo lo pruebe.

### Sección 5.10 Entrega

| Dato | Valor |
|---|---|
| Nombre del archivo ZIP | `Grupo3_UniFoodRush.zip`, creado con `npm run zip -- 3` |
| Tamaño del archivo ZIP | 0,04 MB (37 KB) |
| Enlace de previsualización del aula virtual | ☐ (lo da el aula al subir el ZIP) |
| Resultado de `npm test` | 52 de 52 |
| Video | `Grupo3_UniFoodRush_video.mp4`: 2 min 31 s, 1920 × 1080, sin voz y con subtítulos. HUD de una máquina (0:10), supervisor (0:54), reparación por expresión regular (1:02), deadlock provocado (1:30) y prevenido (1:52) |

### Sección 5.11 Despliegue en Internet (obligatorio por indicación del docente)

| Dato | Valor |
|---|---|
| Servicio usado | Servidor propio (VPS) con Caddy y HTTPS; pasos en `docs/despliegue.md` |
| Dirección pública del simulador | https://dinamyt.org/unifood/ (activa desde el 16 de noviembre de 2026) |
| Probado en computador | Sí: turno 1 jugado en el enlace público sin errores en la consola; el juego llena la ventana en 1600 × 900, 1280 × 1000 y 812 × 375 |
| Probado en celular | ☐ |

---

## Postmortem (sección 5.13 b)

**Borrador con hechos del desarrollo y de la verificación.** El equipo debe revisarlo y escribirlo con sus palabras antes de entregar. Las preguntas 4 y 5 piden la opinión del equipo; aquí hay una propuesta para discutir.

1. **Qué funcionó bien.** Tener una sola fuente para el modelo: los JSON de `src/sed/modelos/` alimentan el juego, las pruebas y los archivos de JFLAP y PIPE2. El núcleo sin motor de juego se probó en Node antes de dibujar nada. El grafo del HUD se dibuja desde el mismo JSON. Al abrir los archivos en JFLAP y PIPE2, los números coincidieron con `npm test`: estados, transiciones, palabras, invariantes y marcados. Las salvedades están en el punto 2.

2. **Diferencias entre el modelo y el juego.**
   - Marcado muerto frente a interbloqueo: como las llegadas son eventos externos, un comedor vacío no tiene transiciones habilitadas. Se definió el marcado de reposo para no tomarlo por bloqueo. PIPE no hace esa diferencia: responde "Deadlock: true" también en los reposos. Por eso su camino "más corto" en el escenario B termina con todos en Salida.
   - PIPE encontró un invariante que no estaba en la ficha: En_fila + Con_bandeja + Almorzando + Salida = 0. En la red los estudiantes solo avanzan; entran como eventos externos que la red no modela.
   - Con los monitores, PIPE 4.3 lista solo 2 invariantes P. Los demás se comprobaron a mano con su matriz de incidencia. Conviene no fiarse de un solo programa.
   - El árbol de cobertura mostró un bloqueo que la ficha no menciona: todo el personal al lavado. Se agregó el monitor Minimo_linea.
   - "Bloqueo tras 3 rechazos" pedía un contador. Se modeló como un autómata compuesto con el torniquete.
   - El torniquete es compartido por la fila: la tupla (En_Fila, Acceso, Sin_acceso) no existe con un solo estudiante. El supervisor se calcula sobre el producto completo.

3. **Prompts.** Los que traían valores exactos del modelo salieron bien a la primera. Hubo que corregir los de la vista: la pila de bandejas tapaba un torniquete, el relevo por clic chocaba con la zona de servir, las teclas se duplicaban en la consola y el destello se quedaba encendido en pausa. El agente decidió por su cuenta lo que lista la sección C de `PROMPTS.md`.

4. **Qué mecánica hizo más visible la teoría.** Propuesta: el radar junto con la pantalla del interbloqueo. El radar pasa a amarillo varios segundos antes del final, porque `explorar(red, M, 3)` ya ve un marcado muerto a 3 disparos o menos. Cuando llega el rojo, la pantalla muestra el marcado y, para cada transición, el token que le falta (M < Pre). El deadlock deja de ser una definición: se ve. En segundo lugar, el HUD del autómata con `servir` en rojo mientras el carné no tiene `acceso_ok`. ☐ El equipo confirma o cambia la elección.

5. **Con una semana más y qué anticipa la Fase 2.**
   - Con una semana más: probar en celulares reales (pellizco y botones de la consola) y hacer el playtest con otro equipo. Agregar un interruptor de efectos y mostrar los ms por cuadro en el contador F1. Aligerar el inspector, que es el momento más pesado (9 ms por cuadro). Revisar si el turno 3 es demasiado difícil.
   - Lo que ya anticipa del modelo con tiempo y azar. ☐ Confirmar con el programa cuáles de estos temas son de la Fase 2:
     - Un reloj de eventos discretos con lista de eventos futuros (`programar`, `programarEn`).
     - Tiempos en cada transición: servir 3 s con 2 personas, comer entre 30 y 42 s, lavar 10 s por lote.
     - Llegadas aleatorias durante 240 a 300 s.
     - Rechazo del carné con probabilidad 0,10.
     - Un generador con semilla que repite una corrida.
     - Medidas de desempeño: espera en la fila (de `tLlegada` a `tServido`), estudiantes atendidos por turno y desbordes.
   - Es un sistema de colas con dos servidores. Con tasas en las transiciones, la misma red sería una red de Petri estocástica, y PIPE 4.3 ya trae los módulos GSPN Analysis y Steady State Analysis para ella.

---

# Fase 2 · Laboratorio 2: Cadenas de Markov y minería de procesos

Proyecto 13 · UniFood Rush · Grupo 3. Rama `fase2`. Fecha de sustentación: ☐ (la escribe el equipo).

**Cómo leer esta parte.** Los números de Markov salen de `analisis/markov_validacion.py` (`analisis/resultados_python.json`) y el núcleo JavaScript los reproduce con tolerancia 1e-6 (`npm test`, 93 pruebas). Los logs son los de `analisis/logs/entrega/` (semilla 96, turno 4 continuo, 300 casos cerrados) y el desempeño sale de `analisis/mineria.py`. El descubrimiento y la conformidad se hicieron con PM4Py 2.7.23 y Graphviz 16.1.2 (`analisis/salidas/`). Quedan en ☐ lo que el equipo hace en persona y las decisiones de `PROMPTS.md`, sección G.

## Sección 5.2 e) Registro del modelo validado

| Cadena | Estados | Paso k (tiempo de juego) | π^(0) | ¿Ergódica o absorbente? | Clases y periodo | Archivo |
|---|---|---|---|---|---|---|
| Oleada | Baja, Media, Alta (4, 10 y 18 llegadas por paso) | 30 s de simulación (2 min del comedor) | (1; 0; 0): 11:30 en Baja | Ergódica | Una clase recurrente, periodo 1 | `src/sed/modelos/markov/oleada.json` |
| Mesas | 0-25%, 25-50%, 50-75%, 75-100% de las 20 mesas | 30 s de simulación | (1; 0; 0; 0): mesas libres al abrir | Ergódica | Una clase recurrente, periodo 1 | `src/sed/modelos/markov/mesas.json` |

| Resultado | Valor en Python | Interpretación en el juego |
|---|---|---|
| π^(5) desde π^(0) | Oleada (0,3313; 0,3910; 0,2777) · Mesas (0,2019; 0,3612; 0,3048; 0,1321) | A los 2 min 30 s la apertura en Baja ya casi no pesa |
| π (estado estacionario) | Oleada (0,3179; 0,3931; 0,2890) · Mesas (1/6; 1/3; 1/3; 1/6) | El 28,9 % del tiempo la oleada es Alta |
| Tiempo medio de retorno | Oleada (3,15; 2,54; 3,46) pasos · Mesas (6; 3; 3; 6) | Una oleada Alta vuelve cada 3,46 pasos (1 min 44 s) |
| Frecuencias empíricas en 10 000 pasos (semilla 2026) | Oleada (0,3068; 0,3975; 0,2957) · Mesas (0,1545; 0,3321; 0,3371; 0,1763) | El muestreo con semilla sigue a π |
| Diferencia máxima entre frecuencias y π | Oleada 0,0111 · Mesas 0,0122 | Menor que 0,02 |
| Riesgo de llegar a Alta en ≤ 3 pasos | 0,361 desde Baja · 0,509 desde Media · 1 desde Alta | Umbral del GDD 0,5: el HUD avisa en Media |
| Chapman-Kolmogorov | Diferencia máxima entre P^(m+n) y P^m · P^n, m, n = 1..5: 1,1 · 10^−16 | Iguales salvo redondeo |
| χ² de la P estimada en 10 000 pasos | Oleada 4,845 con 6 gl, p = 0,564 · Mesas 12,376 con 10 gl, p = 0,261 | No se rechaza P (α = 0,05) |

**Dimensionamiento (5.2 c.3).** Demanda media π · (4; 10; 18) = 10,40 estudiantes por paso. Con 2 líneas y 2 personas se sirven 12,5 por paso (utilización 0,83, pero 1,44 en Alta: la fila crece unos 5,5 estudiantes por paso Alta). Con 3 líneas, 18,75 por paso (0,96 en Alta). La oleada Alta dura en promedio 1/(1 − 0,55) = 2,2 pasos, así que con 2 líneas cada episodio deja unos 12 estudiantes de más en la fila. Conclusión: abrir la línea 3 solo cuando se anticipa Alta; abierta solo en Alta cuesta 0,289 × 3 = 0,87 puntos por paso en promedio.

| Elemento del log | Definición en el proyecto |
|---|---|
| Case_ID | Un estudiante, `EST-0001`, de la llegada a la fila hasta Salida |
| Actividades (en orden normativo) | `Esperar_fila` → `Pasar_torniquete` → `Recibir_bandeja` → `Buscar_mesa` → `Almorzar` → `Entregar_menaje` |
| Resource_ID | `Linea_1` a `Linea_3`, `Torniquete_1` a `Torniquete_3`, `Mesa_01` a `Mesa_20`, `Lavado` |
| Markov_State que se registra | Estado de la cadena Oleada al empezar la actividad |
| Modelo normativo | Workflow Net secuencial de 7 lugares y 6 transiciones (`analisis/modelo_normativo.pnml`), del autómata Estudiante y de Registro_Acceso |

## Sección 5.4 Recursos de arte

La tabla de recursos está en `docs/arte.md`, sección 9, y se revisa en `hoja-arte-fase2.html`.

## Sección 5.9 Minería de procesos

### a) Logs

| Log | Política | Casos cerrados | Eventos | Casos incompletos fuera del log | Pasos k | Tiempo de simulación |
|---|---|---|---|---|---|---|
| `base.csv` y `.xes` | Base: línea 3 cerrada | 300 | 1837 | 31 | 30 | 923 s |
| `mejorado.csv` y `.xes` | Mejorada: línea 3 cuando P(Alta en ≤ 3) ≥ 0,5 | 300 | 1838 | 18 | 29 | 877 s |

Los dos usan la semilla 96: reciben las mismas oleadas y las mismas llegadas. El CSV abre con las 7 columnas y el XES es XML válido con 300 trazas y 3674 eventos (start y complete).

### c) Descubrimiento

| Algoritmo | Herramienta | N.º de actividades y de arcos | ¿Aparece el retrabajo o el desvío esperado? | Observación |
|---|---|---|---|---|
| DFG | PM4Py (`dfg.png`) | 6 actividades, 6 arcos | Sí: autolazo `Pasar_torniquete → Pasar_torniquete` (37 veces; 337 lecturas en 300 casos) | Los otros 5 arcos tienen 300 casos cada uno |
| Alpha Miner | PM4Py (`alpha.png`) | 6 transiciones, 5 lugares, 8 arcos | No | Falla con el lazo de longitud 1: deja `Pasar_torniquete` suelto y `Esperar_fila` sin salida. No es un modelo correcto |
| Heuristic Miner (Causal Net) | PM4Py (`heuristic_causal_net.png`, umbral 0,9) | 6 actividades, 6 relaciones | Sí: autolazo con frecuencia 37 | Robusto al lazo: la red causal es la secuencia normativa más el autolazo |
| Inductive Miner (Process Tree y BPMN) | PM4Py (`process_tree.png`, `bpmn.png`, umbral de ruido 0,2) | Árbol `→(Esperar_fila, ⟲(Pasar_torniquete, τ), Recibir_bandeja, Buscar_mesa, Almorzar, Entregar_menaje)`; Workflow Net de 7 lugares y 7 transiciones | Sí: lazo XOR sobre `Pasar_torniquete` | Es el modelo normativo más la repetición de la lectura; se convierte a una Workflow Net correcta (`modelo_descubierto.pnml`) |

### d) Conformidad

| Métrica | Valor | Interpretación |
|---|---|---|
| Fitness por replay de tokens | 0,983 (88,3 % de las trazas ajustan) | Cada lectura repetida deja un token faltante y uno sobrante en el replay |
| Fitness por alineamientos | 0,990 | El modelo normativo explica el 99 % del comportamiento: el costo es un movimiento solo en el log por cada lectura repetida |
| Precisión | 1,000 | El modelo no permite nada que no aparezca en el log: es una secuencia estricta |
| Casos con desvío (n y %) | 35 de 300 (11,7 %), con fitness de alineamiento menor que 1 | 265 casos (88,3 %) siguen exactamente el modelo |
| Desvío más frecuente y su causa | `Pasar_torniquete` repetido: 37 movimientos solo en el log (33 casos una vez y 2 casos dos veces) | Rechazo del carné (evento no controlable, probabilidad 0,10 por lectura) y bloqueo al tercer rechazo del torniquete hasta la reparación. Lo permite el modelo de la Fase 1: no es un error del juego |

### e) Desempeño y mejora

Cuello de botella (mayor espera total) en el log base: **`Esperar_fila`**, 153,8 min de espera acumulada en 300 casos (30,8 s por estudiante). Las demás esperas son pequeñas: 3,0 min antes de `Recibir_bandeja` (reacción del piloto y falta de bandejas) y 1,7 min entre lecturas del torniquete.

Relación con la cadena: en Alta llegan 18 estudiantes por paso y 2 líneas sirven 12,5, así que la fila crece en los pasos Alta (π = 0,289, 2,2 pasos seguidos en promedio). La espera media hasta la bandeja en el log base es 16,3 s en Baja, 38,6 s en Media y 33,8 s en Alta: los que llegan en Media esperan más porque heredan la fila que dejó la oleada Alta anterior (la cadena tiene memoria de un paso, la fila no se vacía en un paso).

| Indicador | Log base | Log mejorado | Cambio (%) |
|---|---|---|---|
| Tiempo de ciclo medio (min) | 1,24 | 0,79 | −36,5 % |
| Espera total en el cuello de botella, `Esperar_fila` (min) | 153,78 | 17,86 | −88,4 % |
| Casos cerrados (en el tiempo de simulación) | 300 (923 s) | 300 (877 s) | 0 % (5 % menos tiempo) |
| Desbordes de En_fila | 146 | 0 | −100 % |
| Fitness contra el modelo normativo (alineamientos) | 0,990 | 0,990 | 0 % (el desvío es el rechazo del carné, que la línea 3 no cambia) |
| Uso del recurso más cargado (min) | `Lavado` 15,0 | `Lavado` 15,0 | 0 % (3 s por estudiante, no depende de la línea 3) |
| Llegada a la bandeja en oleada Baja (s) | 16,3 | 3,2 | −80,2 % |
| Llegada a la bandeja en oleada Media (s) | 38,6 | 3,2 | −91,7 % |
| Llegada a la bandeja en oleada Alta (s) | 33,8 | 6,8 | −79,9 % |

Pregunta de la ficha D.13, «¿cuánto tarda un estudiante desde el torniquete hasta la bandeja en cada oleada?»: como el torniquete está en la cabeza de la fila, de la primera lectura a la bandeja tarda 1,4 s, 1,7 s y 2,0 s en Baja, Media y Alta (base); lo que cambia con la oleada es la espera en la fila antes del torniquete, de 16 a 39 s. Con la línea 3 anticipada esa espera baja a 3 a 7 s. La mejora se pagó con 19 pasos de línea 3 (20 + 19 × 3 = 77 puntos).

## Sección 5.10 Pruebas y ajuste

### a) Criterios del GDD

| Criterio de aceptación | Cómo se prueba | ¿Cumple? | Observación |
|---|---|---|---|
| La Fase 1 sigue funcionando: autómatas, red de Petri, radar y `npm test` | Las 52 pruebas de la Fase 1 y el modo «Ola fija (Fase 1)» | Sí | 93 de 93 pruebas |
| Cada entidad cambia de estado de Markov en cada paso k y se ve en el mapa | Observar 20 pasos | Sí | Chip de oleada y tapete con tween de 300 ms; etiqueta flotante en cada cambio |
| Los estados de Markov disparan los eventos de la Fase 1 | Llegadas por paso | Sí | 4, 10 o 18 eventos `llegada` por paso (`test/fase2.test.js`) |
| El panel muestra P, π^(n), π iguales a Python | Comparar con `resultados_python.json` | Sí | π^(5) desde π^(0) = (0,3313; 0,3910; 0,2777) |
| La P estimada pasa la prueba χ² | Datos de la partida tras 1000 pasos | Sí | χ² = 4,227 con 6 gl, p = 0,646 (tabla b) |
| La misma semilla produce la misma partida y el mismo log | Generar dos logs y compararlos | Sí | Prueba automática; el log del navegador y el de Node son idénticos byte a byte |
| El CSV y el XES se descargan y cargan en PM4Py, ProM o Disco | Exportar y abrir | Sí | Se descargan en el build local; PM4Py lee el XES (3674 eventos, 300 casos) y `mineria.py` analiza el CSV. ☐ ProM o Disco, opcional |
| El log tiene al menos 200 casos completos y 1000 eventos | Contar | Sí | 300 casos y 1837 eventos |
| HUD completo en las zonas del GDD y 4 logros nuevos con aviso | Capturas | Sí | Paso k, oleada y riesgo junto al reloj; contador junto a las alertas |
| La red de Petri se ve como grafo en vivo, igual que los autómatas | Tecla R y comparar con `modelos/capturas/pipe_red_monitor_M0.png` | Sí | Misma distribución y mismos arcos y pesos que PIPE2 (`test/grafoRed.test.js`); los tokens coinciden con «Tokens por lugar» y cada disparo parpadea |

### b) Validación estadística del motor estocástico (1000 pasos, semilla 96)

| Estado | π teórico | Frecuencia observada en el juego | Diferencia | ¿Dentro de 0,02? |
|---|---|---|---|---|
| Baja | 0,3179 | 0,3090 | 0,0089 | Sí |
| Media | 0,3931 | 0,3810 | 0,0121 | Sí |
| Alta | 0,2890 | 0,3100 | 0,0210 | No, por 0,001 (con 10 000 pasos la diferencia máxima es 0,0111) |

| Prueba χ² | Valor |
|---|---|
| Transiciones observadas | 1000: (184, 94, 31) · (98, 174, 109) · (27, 113, 170) |
| Estadístico χ² y grados de libertad | 4,227 con 6 gl |
| Valor p | 0,646 |
| Conclusión (α = 0,05) | No se rechaza que el juego siga P |

La cadena Mesas, observada en la red, sí se rechaza (χ² = 276,7): con 10,4 llegadas por paso y 20 mesas la ocupación real pasa el 62,5 % del tiempo en 50-75 % y no sigue la cadena de referencia de la ficha. Es un hallazgo del análisis, no un error.

### c) Fidelidad del log

| Case_ID | Traza en el log | Lo que pasó en el núcleo | ¿Coincide? |
|---|---|---|---|
| EST-0001 | Esperar_fila (0,4 s) → Pasar_torniquete (0,8 s) → Recibir_bandeja (3 s) → Buscar_mesa (0 s) → Almorzar (38,6 s) → Entregar_menaje (3 s) | llegada, leer, acceso_ok, servir, buscar_mesa, sentarse en la mesa 7, fin del almuerzo, terminar, entregar | Sí |
| EST-0013 | Esperar_fila (12,7 s) → Pasar_torniquete → Pasar_torniquete → Recibir_bandeja → … | llegada, leer, **rechazo**, leer 1 s después, acceso_ok, servir… | Sí: la lectura repetida es el rechazo |
| EST-0034 | Esperar_fila → Pasar_torniquete → (6,9 s sin actividad) → Pasar_torniquete → Recibir_bandeja → … | leer, rechazo, **bloqueo de T1**, reparación 6 s después, leer, acceso_ok, servir… | Sí: el hueco es la espera de la reparación |

### d) Controles alternos

| Acción | Mouse y teclado | Táctil | ¿Funciona? |
|---|---|---|---|
| Abrir el panel de Markov | M o clic derecho | Botón MARKOV | Sí con teclado, mouse y botón (☐ en un celular) |
| Cambiar de pestaña y mover n | Clic y deslizador | Tocar y arrastrar | Sí (☐ en un celular) |
| Ver los últimos eventos | L | Botón LOG | Sí (☐ en un celular) |
| Exportar el log | E | Botón EXPORTAR | Sí (☐ en un celular) |
| Ver la red de Petri en vivo | R o clic en «Tokens por lugar» | Tocar «Tokens por lugar» | Sí con teclado y mouse (☐ en un celular) |
| Velocidad de simulación | 1, 2, 4, 8 | Botón de velocidad | Sí (☐ en un celular) |

### e) Rendimiento

| Momento | fps sin panel | fps con panel abierto | Equipo y navegador |
|---|---|---|---|
| Inicio del turno | ☐ | ☐ | ☐ |
| Velocidad ×8 con 300 casos en el log | ☐ | ☐ | ☐ |
| Exportación del log | ☐ | ☐ | ☐ |

### f) Playtest con otro equipo

| Observación del otro equipo | Cambio realizado | Sección a la que se regresó |
|---|---|---|
| ☐ | ☐ | ☐ |

## Sección 5.11 Entrega en el aula virtual

| Dato | Valor |
|---|---|
| Nombre del archivo ZIP | `Grupo3_UniFoodRush_Fase2.zip` (`npm run zip -- 3`) |
| Tamaño del archivo ZIP (MB) | 0,06 |
| Video (guía 5.13) | `Grupo3_UniFoodRush_Fase2_video.mp4` (en `entrega/`, fuera de git): 3 min 36 s, 1920 × 1080, H.264, 34 MB, sin voz y con subtítulos. Turno 4 con la semilla 96: matriz P (0:21), Transitorio (0:31), reparación automática de los torniquetes (0:41), aviso del paso 12 con riesgo 51 % (1:16), riesgo 25, 51 y 66 % en el panel (1:23), línea 3 abierta (1:31), oleada Alta del paso 13 con pronóstico acertado (1:41) y la red de Petri en vivo durante esa oleada (1:45); lista L y exportación en CSV y XES (1:53), «Generar log» (2:16); en PM4Py, la salida de `mineria.py` (2:30), descubrimiento (2:39), Alpha y Heuristic Miner (2:50), conformidad (2:59), desempeño (3:10) y mejora (3:20) |
| Enlace de previsualización del aula virtual | ☐ |
| Resultado de `npm test` (pruebas aprobadas / total) | 93 / 93 |
| ¿El log se descarga desde la previsualización? | En el build local (`npm run preview`) sí; ☐ en la previsualización del aula virtual |

## Sección 5.12 Despliegue en Internet (opcional)

| Dato | Valor |
|---|---|
| Servicio usado | Servidor propio de la Fase 1 (VPS con Caddy): la Fase 2 se publica como actualización del mismo enlace (`docs/despliegue.md`, sección 6) |
| Dirección pública del simulador | https://dinamyt.org/unifood/ (☐ cuando el equipo publique la Fase 2; la Fase 1 queda con «Ola fija (Fase 1)») |

## Postmortem de la Fase 2 (borrador para el equipo)

Borrador escrito por el agente con los datos de esta fase. ☐ Cada integrante lo revisa y lo reescribe con sus palabras.

1. **Qué funcionó bien.** Validar primero en Python: el núcleo JavaScript se probó número a número contra `resultados_python.json`, y los errores aparecieron en las pruebas y no en el juego. Registrar el log desde los eventos del núcleo hizo que cada traza coincidiera con lo que pasó, incluidos rechazos y bloqueos. Con la misma semilla, el log del navegador y el de Node son idénticos.
2. **Diferencias entre Python y el juego.** Ninguna en los valores teóricos (diferencias menores que 1e-12). Las frecuencias no se pueden comparar número a número porque NumPy y el generador del juego son distintos; se comparan con π (0,02 en 10 000 pasos) y con χ². Con solo 30 pasos, χ² rechazó por azar; el juego ahora avisa cuando la aproximación no es confiable.
3. **Qué mostró el log que no se veía jugando.** Que los estudiantes que llegan en oleada Media esperan más que los de Alta: heredan la fila. Y que el desvío del proceso es solo la lectura repetida del carné.
4. **Prompts.** Los de núcleo y registro salieron casi a la primera; hubo que reescribir el del reloj discreto (el `TimerEvent` suelto rompía la reproducibilidad) y el de la línea 3 (la ficha no dice dónde va en el mapa). Lo que el agente decidió sin estar en la ficha está en `PROMPTS.md`, sección G. ☐
5. **¿La mejora funcionó?** Sí: con la línea 3 anticipada por π^(n) el ciclo medio bajó 36,5 % y la espera en la fila 88,4 %, con la misma semilla. Con una semana más: una matriz de pico por franja, medir fps en celulares y comparar la cadena Mesas con una cadena estimada desde el log. ☐
