# modelos/ · Verificación en software académico

Estos archivos son la especificación del comportamiento. Se generan con `npm run modelos` desde los JSON de `src/sed/modelos/`, y `test/arquitectura.test.js` falla si dejan de coincidir.

**Pendiente del equipo:** abrir cada archivo en JFLAP y PIPE2, anotar el resultado en `docs/informe.md` y guardar las capturas en `modelos/capturas/`. Los valores "esperados" de abajo salen del núcleo JavaScript (`npm test`); el software académico debe dar lo mismo. Si algún número no coincide, se corrige el modelo y se vuelve a generar, no el juego a mano.

## Autómatas en JFLAP 7.1 (`automatas/`)

| Archivo | Qué es | Estados | Inicial | Finales (Qm) |
|---|---|---|---|---|
| `estudiante.jff` | Autómata Estudiante de la ficha | 6 | En_Fila | Salida |
| `torniquete.jff` | Autómata Torniquete de la ficha | 5 | Listo | Listo, Acceso |
| `contador_rechazos.jff` | Extensión: bloqueo tras 3 rechazos | 4 | C0 | C0, C1, C2 |
| `registro_acceso.jff` | Especificación del supervisor | 3 | Sin_acceso | Sin_acceso, Con_acceso |
| `reparacion_regex.jff` | Expresión regular `RS(1+2+3)S(1+2+3)(S(1+2+3))*K` | – | – | – |
| `reparacion_dfa.jff` | DFA mínimo de la reparación | 7 | q0 | q6 |
| `composicion_estudiante_torniquete.jff` | Producto Estudiante ‖ Torniquete | 30 | En_Fila\|Listo | Salida con Listo o Acceso |
| `composicion_torniquete_contador.jff` | Producto Torniquete ‖ Contador_Rechazos | 11 | Listo\|C0 | – |
| `planta_con_especificacion.jff` | Estudiante ‖ Torniquete ‖ Registro_Acceso | 59 | En_Fila\|Listo\|Sin_acceso | – |
| `supervisor.jff` | El anterior sin los 25 estados de Violacion | 34 | En_Fila\|Listo\|Sin_acceso | – |

Códigos de una letra: Estudiante `s` servir, `b` buscar_mesa, `m` sentarse, `t` terminar, `e` entregar. Torniquete `l` leer, `a` acceso_ok, `r` rechazo, `x` bloqueo, `i` reiniciar.

Pasos:

1. Abrir cada `.jff` con File > Open.
2. Test > Highlight Nondeterminism: no debe resaltar ningún estado.
3. Input > Multiple Run con las palabras de la sección 7 de `docs/modelo/automatas.md`. Para la palabra vacía se deja la casilla en blanco.
4. Abrir `reparacion_regex.jff` y usar Convert > Convert to NFA, luego Convert to DFA y Minimize DFA. El resultado debe tener los mismos estados que `reparacion_dfa.jff`: 7, más un estado trampa si JFLAP completa δ. Probar `RS1S2K` (acepta), `RS1K` y `RS4S1K` (rechaza).
5. En los productos, comprobar el número de estados y que en `supervisor.jff` no existe ningún estado con `Violacion`.

## Red de Petri en PIPE2 (`petri/`)

Los `.xml` están en el dialecto de PIPE 4.3; los `.pnml` son PNML estándar para WoPeD u otros editores. Si un editor no abre el archivo, la red se dibuja a mano con las tablas de `docs/modelo/petri.md`: son 11 lugares y 6 transiciones.

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

Pasos:

1. Abrir `ficha_M0.xml`. Revisar nombres, pesos (t_lavar tiene arcos de peso 5) y marcado.
2. Animation mode: en `ficha_escenarioA.xml` disparar t_servir, t_sentarse y t_terminar.
3. Incidence & Marking: comparar con Pre, Post y A de `docs/modelo/petri.md`. PIPE2 muestra los lugares en filas, o sea Aᵀ.
4. Invariant Analysis: deben salir los invariantes de bandejas (30), mesas (20), carro (10) y personal (4). En la red con monitores, además Personal_linea + Minimo_lavado = 3 y Personal_lavado + Minimo_linea = 3.
5. State Space Analysis y Reachability/Coverability Graph en cada escenario. Valores esperados:

| Escenario | Estados del grafo | Marcados muertos | Interbloqueos | Camino esperado |
|---|---|---|---|---|
| `ficha_M0` | 6 | 3 | 0 | Solo relevos; los muertos son de reposo |
| `monitor_M0` | 4 | 1 | 0 | – |
| `ficha_escenarioA` | 20 | 1 | 0 | El muerto es el final: los 3 estudiantes en Salida |
| `ficha_escenarioB` | 60 | 5 | 2 | t_a_lavado, t_a_lavado |
| `monitor_escenarioB` | 40 | 1 | 0 | – |
| `ficha_escenarioC` | 5 | 1 | 1 | t_servir, t_terminar, t_sentarse |
| `monitor_escenarioC` | 139 | 1 | 0 | – |

   El árbol de cobertura del juego cuenta además las hojas duplicadas: 7, 5, 31, 129, 89, 6 y 287 nodos.
   PIPE2 responde "Deadlock: true" cuando existe cualquier marcado muerto, también los de reposo. Hay interbloqueo solo si en el marcado muerto queda algún token en En_fila, Con_bandeja o Almorzando.
6. Deadlock de la ficha: en `ficha_deadlock30.xml`, con Animation mode, disparar t_a_linea 2 veces, t_servir 29, t_sentarse 20, t_terminar 9, t_sentarse 9, y al final t_servir, t_terminar y t_sentarse. Debe quedar el marcado muerto de la sección 7 de `petri.md`, sin ninguna transición habilitada.
7. Prevención: en `monitor_M0.xml`, tras un t_a_linea el segundo ya no está habilitado porque Minimo_lavado queda en 0.
8. Guardar las capturas en `capturas/` con el nombre del módulo y del escenario.

## Capturas que pide la guía

| Captura | Archivo sugerido |
|---|---|
| Cada autómata en JFLAP | `capturas/jflap_estudiante.png`, `jflap_torniquete.png`, `jflap_contador.png`, `jflap_registro.png` |
| Multiple Run con las palabras de prueba | `capturas/jflap_palabras_*.png` |
| Conversión de la expresión regular a DFA mínimo | `capturas/jflap_regex_dfa.png` |
| Incidence & Marking | `capturas/pipe_incidencia.png` |
| Invariant Analysis | `capturas/pipe_invariantes.png` |
| State Space Analysis de los escenarios B y C | `capturas/pipe_estados_B.png`, `pipe_estados_C.png` |
| Reachability/Coverability Graph desde M0 | `capturas/pipe_arbol_M0.png` |
| Marcado muerto de la ficha en Animation mode | `capturas/pipe_deadlock.png` |
