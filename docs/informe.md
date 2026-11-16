# Informe · UniFood Rush (proyecto 13)

Equipo: José Alejandro Morales, Amir Sarmiento, Carlos Antolinez.
Asignatura: Modelado y Simulación de Sistemas de Eventos Discretos (167413). Fase 1, Laboratorio 1.

**Cómo leer este informe.** La columna "Núcleo / desarrollo" trae lo que ya se comprobó con `npm test` (50 pruebas) y jugando en el navegador durante el desarrollo, el 15 de noviembre de 2026. Las casillas ☐ son del equipo: resultados de JFLAP y PIPE2, celular real, medición de fps, playtest y capturas. No están hechas. El enlace público está activo desde el 16 de noviembre de 2026.

---

## Sección 5.2 d) Registro del modelo verificado

### Autómatas

| Autómata | Códigos de Σ | Σuc (no controlables) | Σuo (no observables) | q0 | Qm | N.º de estados | ¿Determinista? | Archivo |
|---|---|---|---|---|---|---|---|---|
| Estudiante | s b m t e | b m t e | ∅ | En_Fila | Salida | 6 | Sí | `estudiante.jff` |
| Torniquete | l a r x i | l a r x | ∅ | Listo | Listo, Acceso | 5 | Sí | `torniquete.jff` |
| Contador_Rechazos | l r x | l r x | ∅ | C0 | C0, C1, C2 | 4 | Sí | `contador_rechazos.jff` |
| Registro_Acceso (especificación) | a s | a | ∅ | Sin_acceso | Sin_acceso, Con_acceso | 3 | Sí | `registro_acceso.jff` |
| DFA de reparación | R S 1 2 3 K | – | ∅ | q0 | q6 | 7 | Sí | `reparacion_dfa.jff` |

### Palabras de prueba

| Autómata | Palabra | Qué representa | ¿Debe aceptarse? | Núcleo (`npm test`) | Resultado en JFLAP |
|---|---|---|---|---|---|
| Estudiante | `sbmte` | Recorrido completo | Sí | Acepta | ☐ |
| Estudiante | `sbmt` | No entrega el menaje | No | Rechaza | ☐ |
| Estudiante | `bsmte` | Busca mesa sin ser servido | No | Rechaza | ☐ |
| Estudiante | `sbtme` | Termina antes de sentarse | No | Rechaza | ☐ |
| Torniquete | `la` | Lectura con acceso | Sí | Acepta | ☐ |
| Torniquete | `lrla` | Rechazo y luego acceso | Sí | Acepta | ☐ |
| Torniquete | `lrlrlrxi` | Tres rechazos, bloqueo y reinicio | Sí | Acepta | ☐ |
| Torniquete | (vacía) | Sin lecturas | Sí | Acepta | ☐ |
| Torniquete | `l` | Lectura sin resultado | No | Rechaza | ☐ |
| Torniquete | `lrx` | Bloqueado sin reiniciar | No | Rechaza | ☐ |
| Torniquete | `lax` | Bloqueo tras un acceso | No | Rechaza | ☐ |
| Torniquete | `li` | Reiniciar sin estar bloqueado | No | Rechaza | ☐ |
| Reparación | `RS1S2K` | Válida de la ficha | Sí | Acepta (RegExp y DFA) | ☐ |
| Reparación | `RS3S3S1K` | Tres pruebas de sensor | Sí | Acepta | ☐ |
| Reparación | `RS1K` | Una sola prueba de sensor | No | Rechaza | ☐ |
| Reparación | `RS4S1K` | El sensor 4 no existe | No | Rechaza | ☐ |

### Red de Petri

| Propiedad | Núcleo (`npm test`) | Resultado en PIPE2 | Evidencia |
|---|---|---|---|
| N.º de lugares y de transiciones | 11 y 6 (13 y 6 con monitores) | ☐ | ☐ captura |
| Marcado inicial M0 | En_fila 0, Bandeja_limpia 30, Personal_linea 2, Con_bandeja 0, Mesa_libre 20, Almorzando 0, Espacio_carro 10, Bandeja_sucia 0, Salida 0, Personal_lavado 2, Relevo 2 | ☐ | ☐ |
| ¿Acotada? Valor de k por lugar | Sí. Bandeja_limpia 30, Con_bandeja 30, Almorzando 20, Mesa_libre 20, Espacio_carro 10, Bandeja_sucia 10, Personal 4 y 4, Relevo 2 | ☐ | ☐ |
| ¿Segura (1-acotada)? | No | ☐ | ☐ |
| Deadlock: marcado muerto y secuencia | M_d = (0, 0, 4, 0, 0, 20, 0, 10, 10, 0, 0) con 30 estudiantes; t_a_linea² t_servir²⁹ t_sentarse²⁰ t_terminar⁹ t_sentarse⁹ t_servir t_terminar t_sentarse (72 disparos) | ☐ | ☐ |
| Regla de prevención y verificación | Monitores Minimo_lavado y Minimo_linea. Escenario B: 2 interbloqueos sin monitores y 0 con ellos | ☐ | ☐ |
| Invariantes P | Bandejas = 30, Mesas = 20, Carro = 10, Personal = 4; con monitores, Personal_linea + Minimo_lavado = 3 y Personal_lavado + Minimo_linea = 3 | ☐ | ☐ |
| N.º de nodos del árbol de cobertura desde M0 | 7 nodos y 6 marcados distintos; con monitores, 5 y 4 | ☐ | ☐ |

---

## Sección 5.9 Pruebas y ajuste

### a) Criterios del GDD

| Criterio de aceptación | Cómo se prueba | Núcleo / desarrollo | Repetido por el equipo |
|---|---|---|---|
| El color e ícono de cada máquina coinciden con el estado de su autómata | Abrir el HUD de 3 máquinas en momentos distintos | Cumple: E3 En_Fila amarillo, T2 Acceso verde, T1 Bloqueado rojo | ☐ |
| El grafo del HUD es igual al de JFLAP | Comparar captura del HUD con el `.jff` | El grafo y el `.jff` salen del mismo JSON, con la misma distribución | ☐ |
| Ninguna máquina cambia de estado sin un evento de δ | Revisar el historial de eventos del HUD | Cumple: prueba de arquitectura; T1 mostró `…l r l r x i l` | ☐ |
| La consola repara con palabras de L y rechaza las demás | Tabla del literal c | Cumple | ☐ |
| El supervisor nunca deja alcanzar el estado prohibido | Tabla del literal e | Cumple: 10 000 eventos sin Violacion | ☐ |
| Ninguna transición se dispara sin sus tokens de entrada | Intentar disparar una estación incompleta | Cumple: "t_lavar espera: falta Bandeja_sucia"; "falta Minimo_linea" | ☐ |
| El desborde de un lugar con capacidad «desborde» penaliza | Llenar En_fila por encima de 16 | Cumple: −3 puntos por llegada; en el turno 3 con 2 y 2 hubo 54 desbordes | ☐ |
| El radar pasa por verde, amarillo y rojo; el deadlock termina la partida | Tabla del literal d | Cumple | ☐ |
| El inspector calcula bien M_k = M_{k−1} + Aᵀ · u_k | Verificar 3 disparos a mano | Cumple en t_sentarse; el inspector comprueba la suma en cada disparo | ☐ dos disparos más |
| HUD completo en las zonas del GDD y 6 logros con aviso | Comparar con la sección 11 del GDD | Cumple; en un turno se ganaron 5 logros y se vio el aviso animado de Fila legal | ☐ ver los 6 avisos, incluido Sin red de seguridad |
| El torniquete se bloquea al tercer rechazo | Mirar "Rechazos contados" en su HUD | Cumple: T1 se bloqueó en 0:39 | ☐ |
| Con el carro lleno los que terminan esperan en su mesa | Dejar el lavado sin personal | Cumple: 20 estudiantes con ícono de admiración | ☐ |

### b) Conformidad entre el modelo y el juego

| Secuencia de eventos o de disparos | Resultado esperado (estado o marcado) | Resultado en el juego | ¿Coincide? | JFLAP o PIPE2 |
|---|---|---|---|---|
| `sbmte` en un estudiante | Salida | Los 60 estudiantes del turno 1 salieron con la palabra `sbmte` | Sí | ☐ |
| `lrlrlrxi` en el torniquete | Listo | T1: tercer rechazo, bloqueo, `RS1S2K`, Listo | Sí | ☐ |
| t_a_linea, t_a_linea y el turno sin lavar | Marcado muerto M_d | Game over con Bandeja_limpia 0, Mesa_libre 0, Almorzando 20, Espacio_carro 0, Bandeja_sucia 10, Personal_lavado 0, Relevo 0 | Sí | ☐ |
| t_a_linea, t_a_linea con monitores | La segunda no está habilitada | "falta Minimo_lavado (0/1)" | Sí | ☐ |

| Dato | Núcleo | Juego | Software académico |
|---|---|---|---|
| N.º de estados de Estudiante ‖ Torniquete | 30 | 30 (pestaña Composición) | ☐ |
| N.º de estados con Registro_Acceso y del supervisor | 59 y 34 | 59 y 34 | ☐ |
| N.º de nodos del árbol de cobertura desde M0 | 7 y 6 distintos; 5 y 4 con monitores | 5 nodos y 4 distintos con monitores (inspector) | ☐ |
| Marcado muerto del deadlock de la ficha | M_d | El mismo, con los estudiantes restantes en En_fila | ☐ |

### c) Consola de reparación

| Palabra ingresada | ¿Pertenece a L? | Resultado en el juego | Estado final de la máquina | JFLAP |
|---|---|---|---|---|
| `RS1S2K` | Sí | Reparó, +15 puntos | Listo | ☐ |
| `RS3S3S2K` | Sí | Reparó | Listo | ☐ |
| `RS1K` | No | No reparó, −10 puntos | Bloqueado | ☐ |
| `RS4S1K` | No | No reparó; el 4 quedó en rojo: "sin transición desde q2, se esperaba 1 o 2 o 3" | Bloqueado | ☐ |
| `S1S2K` | No | No reparó | Bloqueado | ☐ |

### d) Deadlock: provocar y prevenir

| Prueba | Secuencia de decisiones del jugador | Color del radar antes del final | Resultado |
|---|---|---|---|
| Provocar el deadlock de la ficha | Sin monitores: L, L al empezar, AUTO, reparar T1 en 0:39 | Amarillo en 1:15 | Rojo en 1:19: game over por interbloqueo |
| Repetir aplicando la regla de prevención | "Reintentar con monitores"; L, L | Verde | El segundo relevo no se dispara: falta Minimo_lavado |
| Llegar a amarillo y salir a verde con una buena decisión | Sin monitores: L, L y no reparar T1; en 2:00 llegan 2 permisos; pulsar V en 2:05 | Amarillo desde 1:57 | Sigue en amarillo 10 s (un t_a_linea aún bloquearía) y pasa a verde en 2:15, al terminar el primer lavado. El turno termina sin interbloqueo y cuenta 1 deadlock evitado |
| Bloqueo simétrico | Sin monitores: V, V al empezar | Verde | Rojo en 0:03 con el primer estudiante: nadie sirve |

### e) Supervisor

| Intento | Lo esperado según el modelo | Lo que pasó en el juego | ¿Cumple? |
|---|---|---|---|
| Servir desde el mostrador antes del `acceso_ok` | `servir` deshabilitado en (En_Fila, Leyendo, Sin_acceso) | No se sirvió, −5 puntos, tembló la cámara | Sí |
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
| Inicio del turno | ☐ | ☐ (60 en el navegador de desarrollo) | ☐ |
| Hora pico a velocidad ×4 | ☐ | ☐ | ☐ |
| Inspector abierto con el árbol de cobertura | ☐ | ☐ | ☐ |

### h) Playtest con otro equipo

| Observación del otro equipo | Cambio realizado | Sección a la que se regresó |
|---|---|---|
| ☐ | ☐ | ☐ |

### Sección 5.10 Entrega

| Dato | Valor |
|---|---|
| Nombre del archivo ZIP | `GrupoN_UniFoodRush.zip` (cambiar N por el número del grupo) |
| Tamaño del archivo ZIP | 0,04 MB (37 KB) |
| Enlace de previsualización del aula virtual | ☐ |
| Resultado de `npm test` | 50 de 50 |

### Sección 5.11 Despliegue en Internet (obligatorio por indicación del docente)

| Dato | Valor |
|---|---|
| Servicio usado | Servidor propio (VPS) con Caddy y HTTPS; pasos en `docs/despliegue.md` |
| Dirección pública del simulador | https://dinamyt.org/unifood/ (activa desde el 16 de noviembre de 2026) |
| Probado en computador | Sí: turno 1 jugado en el enlace público sin errores en la consola; el juego llena la ventana en 1600 × 900, 1280 × 1000 y 812 × 375 |
| Probado en celular | ☐ |

---

## Postmortem (sección 5.13 b)

**Borrador con hechos del desarrollo.** El equipo debe reescribirlo con sus palabras y con lo que aprendió al verificar en JFLAP y PIPE2 y al sustentar.

1. **Qué funcionó bien.** Tener una sola fuente para el modelo: los JSON de `src/sed/modelos/` alimentan el juego, las pruebas y los archivos de JFLAP y PIPE2. El núcleo sin motor de juego se probó en Node antes de dibujar nada. El grafo del HUD se dibuja desde el mismo JSON.

2. **Diferencias entre el modelo y el juego.**
   - Marcado muerto frente a interbloqueo: como las llegadas son eventos externos, un comedor vacío no tiene transiciones habilitadas. Se definió el marcado de reposo para no tomarlo por bloqueo.
   - El árbol de cobertura mostró un bloqueo que la ficha no menciona: todo el personal al lavado. Se agregó el monitor Minimo_linea.
   - "Bloqueo tras 3 rechazos" pedía un contador. Se modeló como un autómata compuesto con el torniquete.
   - El torniquete es compartido por la fila: la tupla (En_Fila, Acceso, Sin_acceso) no existe con un solo estudiante. El supervisor se calcula sobre el producto completo.

3. **Prompts.** Los que traían valores exactos del modelo salieron bien a la primera. Hubo que corregir los de la vista: la pila de bandejas tapaba un torniquete, el relevo por clic chocaba con la zona de servir, las teclas se duplicaban en la consola y el destello se quedaba encendido en pausa. El agente decidió por su cuenta lo que lista la sección C de `PROMPTS.md`.

4. **Qué mecánica hizo más visible la teoría.** ☐ (respuesta del equipo)

5. **Con una semana más y qué anticipa la Fase 2.** ☐ (respuesta del equipo)
