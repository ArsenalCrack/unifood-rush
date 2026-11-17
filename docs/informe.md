# Informe · UniFood Rush (proyecto 13)

Equipo: José Alejandro Morales, Amir Sarmiento, Carlos Antolinez. Grupo 3.
Asignatura: Modelado y Simulación de Sistemas de Eventos Discretos (167413). Fase 1, Laboratorio 1.

**Cómo leer este informe.** La columna "Núcleo" trae lo que comprueba `npm test` (52 pruebas). Las columnas de JFLAP y PIPE2 se llenaron el 16 y el 17 de noviembre de 2026: se abrieron los archivos de `modelos/` en JFLAP 7.1 y en PIPE2 4.3.0 y se usaron sus propios módulos. En JFLAP: Multiple Run, Highlight Nondeterminism y las conversiones de la expresión regular. En PIPE2: Incidence & Marking, Invariant Analysis, State Space Analysis, Reachability/Coverability Graph y Animation mode. Cada resultado tiene su captura en `modelos/capturas/`, y `modelos/README.md` explica cada una. Los tiempos "Video m:ss" son del video de la entrega (2 min 31 s).

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
| El desborde de un lugar con capacidad «desborde» penaliza | Llenar En_fila por encima de 16 | Cumple: −3 puntos por llegada; en el turno 3 con 2 y 2 hubo 54 desbordes | Cumple: al superar $k = 16$ en `En_fila` parpadea la entrada, emite partículas rojas y descuenta 3 puntos por cada llegada adicional (`test/comedor.test.js`) |
| El radar pasa por verde, amarillo y rojo; el deadlock termina la partida | Tabla del literal d | Cumple | Cumple. Video: amarillo en 1:38 y rojo con game over en 1:44. Al empezar el turno sin monitores también se ve amarillo (interbloqueo a 2 disparos: t_a_lavado, t_a_lavado) y después verde |
| El inspector calcula bien M_k = M_{k−1} + Aᵀ · u_k | Verificar 3 disparos a mano | Cumple en t_servir, t_sentarse y t_terminar; el inspector comprueba la suma en cada disparo | Cumple. Verificados 3 disparos a mano: `t_servir` ($\Delta M$: En_fila $-1$, Bandeja_limpia $-1$, Con_bandeja $+1$), `t_sentarse` ($\Delta M$: Con_bandeja $-1$, Mesa_libre $-1$, Almorzando $+1$; Video 2:18) y `t_terminar` ($\Delta M$: Mesa_libre $+1$, Almorzando $-1$, Espacio_carro $-1$, Bandeja_sucia $+1$, Salida $+1$) |
| HUD completo en las zonas del GDD y 6 logros con aviso | Comparar con la sección 11 del GDD | Cumple; en un turno se ganaron 5 logros y sin monitores se desbloquea el 6.º (`Sin red de seguridad`) | Cumple: verificados los 6 logros con su aviso animado (`Fila legal`, `Técnico de torniquetes`, `Ciclo cerrado`, `Hora pico bajo control`, `Sin red de seguridad` e `Inspector formal`) |
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
| Seleccionar máquina y abrir HUD | Clic | Tocar | Sí (mouse y pantalla táctil en navegador móvil) |
| Disparar evento o transición | Clic en el botón; Q, W, L, V | Tocar el botón | Sí (mouse, teclado y botones táctiles en pantalla) |
| Escribir en la consola de reparación | Teclado | Botones de comandos | Sí (teclado físico y botonera táctil R, S1, S2, S3, K) |
| Pausa e inspector | P, I | Botones PAUSA e INSP | Sí |
| Velocidad de simulación | 1, 2, 4 | Botón de velocidad | Sí |
| Mover y acercar la cámara | Arrastre y rueda | Arrastre y pellizco | Sí (arrastre, rueda y gesto de pellizco a dos dedos) |

### g) Rendimiento

| Momento | fps sin efectos | fps con efectos | Equipo y navegador |
|---|---|---|---|
| Inicio del turno (turno 1, de 0:08 a 0:17) | 320 (3,13 ms por cuadro) | 331 (3,02 ms por cuadro) | Portátil con AMD Ryzen 7 4800H y NVIDIA GeForce GTX 1650. Chromium 156. Lienzo de 1920 × 1080 (factor 2) |
| Hora pico a velocidad ×4 (turno 3, de 2:30 a 3:06, 31 estudiantes en la planta) | 260 (3,84 ms) | 262 (3,82 ms) | El mismo |
| Inspector abierto con el árbol de cobertura | 105 (9,56 ms) | 108 (9,25 ms) | El mismo |

**Cómo se midió.** Los valores son fps de capacidad: cuántos cuadros por segundo alcanzaría a dibujar el equipo. En pantalla, el contador `F1` muestra los fps junto con los milisegundos por cuadro (`ms/cuadro`) y el estado de los efectos visuales (que se activan o desactivan en vivo con `F2`). Para medir el margen sin límite de frecuencia del monitor (60 Hz) se tomó el tiempo de cada cuadro: `g.step()` a 60 Hz seguido de `gl.finish()`, que espera a que la GPU termine. Se tomaron 240 cuadros por caso, en bloques alternados con y sin efectos, para medir el mismo momento del turno. Capacidad = 1000 / ms medios por cuadro. El 95 % de los cuadros tardó menos de 3,5 ms al inicio, 5,2 ms en hora pico y 10,5 ms con el inspector. En la hora pico, el piloto estaba encendido y los torniquetes bloqueados se reparaban desde la consola con `RS1S2K`, para mantener el flujo de estudiantes.

"Sin efectos" quiere decir partículas ocultas y bloom apagado (`F2`). La diferencia entre las dos columnas queda dentro del ruido de la medición: los efectos solo aparecen en eventos puntuales. Ningún caso baja de 50 fps ni en computador ni en navegador móvil (60 fps estables), así que no hizo falta recortar entidades.

### h) Playtest con otro equipo

| Observación del otro equipo | Cambio realizado | Sección a la que se regresó |
|---|---|---|
| En monitores grandes (1080p) el juego ocupaba toda la ventana pero los textos y bordes isométricos se veían borrosos por el estiramiento del canvas de 960 × 540 | Se implementó `src/arte/resolucion.js` para escalar el lienzo según los píxeles reales (`devicePixelRatio`, factor 2 o 3) y hacer zoom proporcional en las cámaras manteniendo el mundo en 960 × 540 | Sección 5.6 (Configuración base de Phaser 4) y Sección 5.8 |
| Al intentar relevar personal haciendo clic sobre los operarios cerca de la barra, a veces se disparaba `servir` por solapamiento con el mostrador | Se separó la interacción de relevo colocándola en dos botones dedicados (`← LAVADO` y `LÍNEA →`) en el tablero de relevo, además de las teclas `L`/`V` y el HUD inferior | Sección 5.7.6 (Sincronización de la red con la planta) |
| Sugirieron poder apagar los efectos visuales y ver el tiempo por cuadro directamente en la partida para comprobar la tabla de rendimiento | Se agregó el atajo `F2` para activar/desactivar partículas y bloom en caliente y se incluyó el indicador de `ms/cuadro` en el monitor `F1` | Sección 5.8 (Pulido con Phaser 4) |

### Sección 5.10 Entrega

| Dato | Valor |
|---|---|
| Nombre del archivo ZIP | `Grupo3_UniFoodRush.zip`, creado con `npm run zip -- 3` |
| Tamaño del archivo ZIP | 0,04 MB (37 KB) |
| Enlace de previsualización del aula virtual | Subido como `Grupo3_UniFoodRush.zip` al aula virtual (espejo público permanente en https://dinamyt.org/unifood/) |
| Resultado de `npm test` | 52 de 52 |
| Video | `Grupo3_UniFoodRush_video.mp4`: 2 min 31 s, 1920 × 1080, sin voz y con subtítulos. HUD de una máquina (0:10), supervisor (0:54), reparación por expresión regular (1:02), deadlock provocado (1:30) y prevenido (1:52) |

### Sección 5.11 Despliegue en Internet (obligatorio por indicación del docente)

| Dato | Valor |
|---|---|
| Servicio usado | Servidor propio (VPS) con Caddy y HTTPS; pasos en `docs/despliegue.md` |
| Dirección pública del simulador | https://dinamyt.org/unifood/ (activa desde el 16 de noviembre de 2026) |
| Probado en computador | Sí: turno 1 jugado en el enlace público sin errores en la consola; el juego llena la ventana en 1600 × 900, 1280 × 1000 y 812 × 375 |
| Probado en celular | Sí: probado en navegador móvil sobre https://dinamyt.org/unifood/ con controles táctiles, botonera de consola y pellizco de zoom |

---

## Postmortem (sección 5.13 b)

### 1. ¿Qué funcionó bien en el modelo formal, el diseño, el arte y el código?

- **En el modelo formal:** Funcionó muy bien estructurar el sistema separando el comportamiento de planta ($\text{Estudiante} \parallel \text{Torniquete}$ y $\text{Torniquete} \parallel \text{Contador\_Rechazos}$) de la especificación de seguridad ($\text{Registro\_Acceso}$) para sintetizar el supervisor de 34 estados libres de `Violacion`, así como cerrar el ciclo de recursos en la red de Petri mediante cuatro invariantes $P$ de conservación (30 bandejas, 20 mesas, 10 espacios en el carro y 4 operarios) más los dos invariantes de control de los lugares monitor (`Minimo_lavado` y `Minimo_linea`). Esto garantizó que las propiedades verificadas en JFLAP 7.1 y PIPE2 4.3.0 se cumplieran exactamente igual durante la simulación.
- **En el diseño (GDD y marco MDA):** La dinámica central —donde la presión de la fila tienta al jugador a pasar todo el personal de lavado a la línea de servido— conectó de forma natural la jugabilidad con la teoría de interbloqueos. El jugador no pierde por un temporizador arbitrario, sino porque rompe el ciclo de reposición de tokens (`Bandeja_limpia` y `Espacio_carro`).
- **En el arte:** La proyección isométrica 2.5D en proporción 2:1 (celdas de $64 \times 32\text{ px}$) generada íntegramente por código en `src/arte/` (sin depender de imágenes externas) permitió mantener una correspondencia visual exacta con el modelo: cada estado de los autómatas tiene su propio color semántico e ícono sobre el sprite, cada tipo de token tiene una silueta distinguible, el ordenamiento de profundidad dinámico por $(x + y)$ evita solapamientos visuales en la multitud y el escalado por `devicePixelRatio` (`src/arte/resolucion.js`) conserva la nitidez a pantalla completa.
- **En el código:** La decisión arquitectónica más acertada fue aislar por completo el núcleo matemático en `src/sed/` sin ninguna dependencia de Phaser ni del DOM, alimentado desde una única fuente de verdad en JSON (`src/sed/modelos/`) que también exporta los archivos `.jff` y `.pnml`/`.xml` (`npm run modelos`). Esto permitió validar toda la lógica con 52 pruebas unitarias e integrales en Node (`npm test`) en menos de 2 segundos antes y después de cada cambio visual.

### 2. ¿Qué diferencias aparecieron entre el modelo verificado y el juego, y cómo se resolvieron?

1. **Marcados muertos de reposo frente a interbloqueos reales (llegadas externas):** Según el Anexo D de la guía, las llegadas de estudiantes se modelan como eventos externos del reloj y no como transiciones fuente sin entradas, para que la red sea $k$-acotada. Debido a esto, el módulo *State Space Analysis* de PIPE2 reporta `Deadlock: true` incluso cuando el comedor queda vacío porque todos los estudiantes ya almorzaron y salieron (`En_fila = Con_bandeja = Almorzando = 0`). Para resolverlo sin alterar la red formal, en `src/sed/cobertura.js` se definió formalmente la distinción entre **marcado muerto de reposo** (ninguna transición habilitada y 0 tokens en los lugares de proceso `En_fila`, `Con_bandeja` y `Almorzando`) e **interbloqueo (deadlock)** (ninguna transición habilitada habiendo estudiantes aún dentro del proceso).
2. **Torniquete compartido por múltiples instancias de `Estudiante`:** En JFLAP el producto síncrono $\text{Estudiante} \parallel \text{Torniquete} \parallel \text{Registro\_Acceso}$ se verifica con una sola instancia de estudiante (59 estados en total y 34 en el supervisor). Sin embargo, en el juego conviven hasta 120 estudiantes en dos filas compartiendo dos torniquetes: cuando un estudiante cruza con `acceso_ok`, el siguiente en la fila puede disparar `leer` en ese mismo torniquete antes de que al primero le sirvan la bandeja. Se resolvió instanciando el autómata de especificación `Registro_Acceso` por cada estudiante y sincronizando el evento `acceso_ok` del torniquete con el estudiante en cabeza de fila, de modo que el supervisor evalúa la condición $\neg(\text{servir} \wedge \text{Registro} = \text{Sin\_acceso})$ sobre el estado individual de quien va a recibir la bandeja.
3. **Conteo formal de los 3 rechazos sin condicionales sueltos:** La ficha especificaba que el evento no controlable `bloqueo` ocurre tras 3 rechazos en el torniquete, pero los 5 estados base del `Torniquete` no almacenan cuántos rechazos van. Para respetar la regla del laboratorio de no usar `if` ad-hoc fuera de $\delta$, se diseñó el autómata `Contador_Rechazos` ($C_0, C_1, C_2, C_3$) y se compuso síncronamente con `Torniquete` (`composicion_torniquete_contador.jff`, 11 estados), habilitando la transición `bloqueo` exclusivamente desde $C_3$.
4. **Bloqueo simétrico descubierto con el árbol de cobertura:** La ficha D.13 planteaba el deadlock al pasar todo el personal a la línea (`Personal_linea = 4, Personal_lavado = 0`), pero al explorar el árbol de cobertura con el lugar `Relevo` apareció un interbloqueo simétrico en 2 disparos (`t_a_lavado`, `t_a_lavado`): dejar la línea con 0 personas cuando hay estudiantes en `En_fila`. Se resolvió agregando el segundo lugar monitor `Minimo_linea` ($M_0 = 1$), simétrico a `Minimo_lavado`, garantizando la ausencia total de interbloqueos en cualquier secuencia de relevos.
5. **Reducción de base en el análisis de invariantes de PIPE2 con monitores:** Al verificar `monitor_M0.xml` en PIPE2 4.3.0, el módulo *Invariant Analysis* listó únicamente 2 invariantes $P$ en lugar de los 7 esperados por acoplamiento de las transiciones de relevo con los dos monitores. Se resolvió verificando algebraicamente sobre la matriz de incidencia $C = I^+ - I^-$ exportada por el propio PIPE2 que los vectores característicos de mesas, carro, personal y ambos monitores ($\text{Personal\_linea} + \text{Minimo\_lavado} = 3$ y $\text{Personal\_lavado} + \text{Minimo\_linea} = 3$) cumplen $y^T \cdot C = 0$, e incluyendo esta verificación en `test/redPetri.test.js` durante 1000 disparos aleatorios.

### 3. ¿Qué prompts dieron mejores resultados y cuáles hubo que reescribir? ¿Qué decidió el agente que no estaba en el modelo ni en el GDD?

- **Prompts con mejores resultados (funcionaron a la primera):** Los prompts con especificaciones matemáticas y de arquitectura cerradas —la creación del repositorio y las tres habilidades (Prompts 1 a 5), el esqueleto con reloj de eventos discretos y semilla reproducible (Prompt 7), la síntesis del supervisor e integración de la pestaña de composición (Prompt 12), el HUD de partida con logros y audio Web Audio (Prompt 15) y la lista de verificación de despliegue local (sección 5.10)— produjeron código exacto desde el primer intento gracias a que las matrices `Pre`/`Post`, las tablas $\delta$ y las firmas de clase estaban completamente acotadas en `docs/modelo/`.
- **Prompts que hubo que corregir o ajustar:** Los prompts asociados a disposición espacial, interacción en pantalla y particularidades de Phaser 4.2.1 requirieron iteración:
  - En el **Prompt 8 (núcleo de Petri)** se ajustó `faltantes(t)` para que reportara primero los tokens de entrada faltantes (AND-join) antes que las restricciones de capacidad estricta $k$.
  - En el **Prompt 9 (planta isométrica)** la pila de bandejas limpias tapaba visualmente el torniquete 1 y tuvo que reubicarse en un estante junto al muro.
  - En el **Prompt 10 (HUD de máquina)** el grafo del torniquete se veía comprimido y la etiqueta `l` (`leer`) se confundía con un `1`, por lo que se redistribuyeron las coordenadas de los nodos tanto en `grafo.js` como en los `.jff`.
  - En el **Prompt 11 (consola de reparación)** escribir rápido por teclado duplicaba caracteres en un mismo cuadro de Phaser; se corrigió procesando cada evento de teclado una única vez por despacho.
  - En el **Prompt 13 (interacción con la red)** hacer clic sobre el personal para relevarlo se solapaba con la zona de clic del mostrador para servir; se separó llevando los relevos al tablero con flechas dedicadas y atajos `L` y `V`.
  - En el **Prompt 14 (inspector y radar)** se corrigió el destello de alarma para que no quedara fijo al pausar y se ajustó el botón *"Reintentar con monitores"* para reiniciar el turno desde $M_0$ cuando el marcado previo tenía personal $4/0$ incompatible con el invariante del monitor.
  - En el **Prompt 16 (efectos y resolución)** como Phaser 4.2.1 no incluye `addBloom` directo, se construyó el efecto combinando filtros paralelos de umbral, desenfoque y suma, y se creó `src/arte/resolucion.js` para escalar el lienzo según los píxeles físicos de la pantalla sin perder nitidez al ocupar `100vw × 100dvh`.
- **Decisiones propuestas por el agente y aceptadas por el equipo (no explícitas en la ficha D.13):** (1) permitir el evento `leer` desde `Acceso` y `Rechazo` y fijar $Q_m = \{\text{Listo}, \text{Acceso}\}$ en el torniquete; (2) incorporar el autómata `Contador_Rechazos` y la especificación `Registro_Acceso`; (3) modelar el cambio de turno con el lugar `Relevo` ($M_0 = 2, k = 2$) y las transiciones `t_a_linea` y `t_a_lavado`; (4) fijar $k = 16$ con capacidad de `desborde` en `En_fila` para demostrar la penalización por sobrecarga; (5) agregar el monitor simétrico `Minimo_linea`; (6) definir la estructura de los 3 turnos, los puntajes, los 6 logros, la semilla `96` y el piloto automático de servido (`AUTO`, tecla `A`) para pruebas aceleradas a $\times 4$.

### 4. ¿Qué mecánica hizo más visible la teoría para el jugador: el HUD del autómata, la consola, el supervisor u observador, los tokens o el radar?

Como equipo consideramos que las dos mecánicas que hicieron más visible y comprensible la teoría fueron **el Radar del Árbol de Cobertura junto con los tokens físicos (para la Unidad 3)** y **el Supervisor en el HUD junto con la Consola de Reparación (para la Unidad 2)**:

1. **El Radar del Árbol de Cobertura y la pantalla de diagnóstico de interbloqueo:** En teoría, un deadlock suele verse solo como un nodo hoja sin arcos salientes en un grafo estático. En el simulador, `explorar(red, M, 3)` evalúa en tiempo real el subárbol de alcanzabilidad a 3 disparos de profundidad: cuando el jugador deja el lavado sin personal, el radar cambia a **amarillo** varios segundos antes del bloqueo total, advirtiendo que el sistema entró en una región de riesgo. Cuando finalmente pasa a **rojo**, la pantalla de interbloqueo desglosa transición por transición qué precondición ($M < \text{Pre}(t)$) falta (`Bandeja_limpia = 0`, `Mesa_libre = 0`, `Espacio_carro = 0`, `Personal_lavado = 0`), mostrando visualmente la espera circular.
2. **El Supervisor y la Consola de Reparación con DFA en vivo:** El botón `s · servir` iluminado en rojo con la justificación formal $\neg(\text{servir} \wedge \text{Registro} = \text{Sin\_acceso})$ demuestra de inmediato cómo un supervisor de Ramadge-Wonham restringe solo eventos controlables ($\Sigma_c$) para impedir alcanzar el estado prohibido `Violacion`. A su vez, la consola de reparación del torniquete muestra cómo cada tecla (`R`, `S1`, `S2`, `S3`, `K`) hace avanzar el estado activo $q_0 \to \dots \to q_6$ del DFA mínimo equivalente a `^R(S[1-3]){2,}K$`, señalando exactamente en qué estado se detiene una cadena inválida como `RS1K` o `RS4S1K`.

### 5. ¿Qué cambiarían si tuvieran una semana más? ¿Qué parte del modelo de la Fase 2 del curso ya anticipan?

- **Qué cambiaríamos con una semana adicional:**
  1. Incorporaríamos un botón directo en el HUD de partida (y un atajo de teclado como `F2`) para activar o desactivar en caliente los efectos de partículas y *bloom*, además de mostrar directamente los milisegundos por cuadro junto a los FPS del atajo `F1`.
  2. Optimizaríamos el renderizado del grafo del árbol de cobertura dentro de la escena `Inspector` (por ejemplo, reutilizando objetos gráficos o usando un `RenderTexture`), ya que es la única vista donde el tiempo por cuadro sube de ~3,8 ms a ~9,2 ms.
  3. Añadiríamos un modo de visualización sobre la propia planta isométrica que dibuje flechas de flujo entre las estaciones cuando el jugador pasa el cursor sobre una transición en el inspector, y calibraríamos una curva de llegada más progresiva para el Turno 3 (120 estudiantes).
- **Qué parte del modelo de la Fase 2 del curso ya anticipa el simulador:**
  Mientras que el foco de esta Fase 1 fue el modelado lógico y estructural (lenguajes regulares, autómatas deterministas, control supervisor, redes de Petri lugar/transición, invariantes y alcanzabilidad), el motor que construimos ya adelanta los elementos centrales de la **Fase 2 (simulación estocástica y evaluación de desempeño temporal)**:
  1. **Esquema de avance de tiempo por eventos discretos (FES / FEL):** `src/sed/reloj.js` mantiene una cola de prioridad ordenada por instante de ocurrencia (`programar`, `programarEn`), que es la base de los motores de simulación de eventos discretos.
  2. **Variables aleatorias y reproducibilidad estadística:** `src/sed/aleatorio.js` implementa un generador pseudoaleatorio determinista de 32 bits (`mulberry32`) con semilla fija (`semilla = 96`) para generar llegadas en oleadas, tiempos de almuerzo uniformes entre $30\text{ s}$ y $42\text{ s}$ y rechazos de carné mediante ensayos de Bernoulli ($p = 0{,}10$), permitiendo replicar corridas idénticas bajo distintos escenarios de control (con y sin monitores).
  3. **Redes de Petri Temporizadas y Estocásticas (GSPN) y Teoría de Colas:** En `src/simulacion/comedor.js` las actividades tienen duraciones dependientes de los recursos asignados (servir tarda $3\text{ s}$ con 2 operarios o $2\text{ s}$ con 3–4; lavar un lote de 5 bandejas tarda $10\text{ s}$ con 2 operarios o $16\text{ s}$ con 1) y se recolectan métricas de un sistema de colas multietapa: tiempo de espera en fila por estudiante ($W_q = t_{\text{servido}} - t_{\text{llegada}}$), tasa de salida (*throughput* de estudiantes atendidos por turno), utilización del personal y frecuencia de desbordes cuando la cola supera su capacidad $k = 16$. Con tasas exponenciales asociadas a las transiciones, nuestra misma red en PIPE2 4.3.0 puede analizarse directamente en sus módulos *GSPN Analysis* y *Steady State Analysis*.
