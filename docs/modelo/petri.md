# Modelo formal · Red de Petri (Unidad 3)

Proyecto 13 · **UniFood Rush** · ficha D.13 de la guía.
Fuente única: `src/sed/modelos/comedor.json` (red de la ficha) y `comedor_monitor.json` (con la regla de prevención). Los archivos de `modelos/petri/` se generan con `npm run modelos`.

Notación: N = (P, T, Pre, Post, M0) con capacidad k por lugar. Pre y Post son de tamaño |T| × |P| (una fila por transición). A = Post − Pre. Ecuación de estado: M_k = M_{k−1} + Aᵀ · u_k. **PIPE2 muestra la incidencia con los lugares en filas: es Aᵀ.**

## 1. Lugares (|P| = 11)

| id | Lugar | M0 | k | Capacidad | Token físico en el juego |
|---|---|---|---|---|---|
| p1 | En_fila | 0 | 16 | desborde | Estudiantes en las dos filas (8 por fila) |
| p2 | Bandeja_limpia | 30 | 30 | estricta | Pila de bandejas limpias en la barra |
| p3 | Personal_linea | 2 | 4 | estricta | Personas detrás de la barra de servicio |
| p4 | Con_bandeja | 0 | 30 | estricta | Estudiantes con bandeja (mostrador o buscando mesa) |
| p5 | Mesa_libre | 20 | 20 | estricta | Mesas sin ocupar |
| p6 | Almorzando | 0 | 20 | estricta | Estudiantes sentados |
| p7 | Espacio_carro | 10 | 10 | estricta | Huecos vacíos del carro de menaje |
| p8 | Bandeja_sucia | 0 | 10 | estricta | Bandejas sucias en el carro |
| p9 | Salida | 0 | – | sin límite | Contador de estudiantes que salieron |
| p10 | Personal_lavado | 2 | 4 | estricta | Personas en la zona de lavado |
| p11 | Relevo | 2 | 2 | estricta | Permisos de relevo en el tablero |

Los valores de Bandeja_limpia, Mesa_libre, Espacio_carro, Bandeja_sucia, Personal_linea y Personal_lavado son los de la ficha. Decisiones del equipo: k = 16 con desborde para En_fila (la fila que no cabe penaliza) y el lugar Relevo.

**Eventos externos del reloj** (agregan tokens; no son transiciones, como pide la ficha):

- Llegada de un estudiante: +1 en En_fila. Si En_fila supera k = 16 hay desborde.
- Cambio de turno del personal cada 120 s: Relevo se completa hasta k = 2. El M0 ya trae los 2 permisos del turno inicial.

## 2. Transiciones (|T| = 6)

| id | Transición | Entradas (Pre) → Salidas (Post) | Disparo | Evento sincronizado |
|---|---|---|---|---|
| t1 | t_servir | En_fila + Bandeja_limpia + Personal_linea → Con_bandeja + Personal_linea | jugador | servir |
| t2 | t_sentarse | Con_bandeja + Mesa_libre → Almorzando | automática | sentarse |
| t3 | t_terminar | Almorzando + Espacio_carro → Mesa_libre + Bandeja_sucia + Salida | automática | terminar |
| t4 | t_lavar | Bandeja_sucia ×5 + Personal_lavado → Bandeja_limpia ×5 + Espacio_carro ×5 + Personal_lavado | automática | – |
| t5 | t_a_linea | Personal_lavado + Relevo → Personal_linea | jugador | – |
| t6 | t_a_lavado | Personal_linea + Relevo → Personal_lavado | jugador | – |

t1 a t4 son las de la ficha. t5 y t6 modelan "el personal solo se reasigna en el cambio de turno": cada reasignación consume un permiso de Relevo.

## 3. Matrices Pre, Post y A

Columnas: Ef = En_fila, BL = Bandeja_limpia, PL = Personal_linea, CB = Con_bandeja, ML = Mesa_libre, Al = Almorzando, EC = Espacio_carro, BS = Bandeja_sucia, Sa = Salida, PW = Personal_lavado, Re = Relevo.

**Pre**

| | Ef | BL | PL | CB | ML | Al | EC | BS | Sa | PW | Re |
|---|---|---|---|---|---|---|---|---|---|---|---|
| t_servir | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| t_sentarse | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| t_terminar | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 |
| t_lavar | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 1 | 0 |
| t_a_linea | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| t_a_lavado | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |

**Post**

| | Ef | BL | PL | CB | ML | Al | EC | BS | Sa | PW | Re |
|---|---|---|---|---|---|---|---|---|---|---|---|
| t_servir | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| t_sentarse | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| t_terminar | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 0 |
| t_lavar | 0 | 5 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 1 | 0 |
| t_a_linea | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| t_a_lavado | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |

**A = Post − Pre**

| | Ef | BL | PL | CB | ML | Al | EC | BS | Sa | PW | Re |
|---|---|---|---|---|---|---|---|---|---|---|---|
| t_servir | −1 | −1 | 0 | +1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| t_sentarse | 0 | 0 | 0 | −1 | −1 | +1 | 0 | 0 | 0 | 0 | 0 |
| t_terminar | 0 | 0 | 0 | 0 | +1 | −1 | −1 | +1 | +1 | 0 | 0 |
| t_lavar | 0 | +5 | 0 | 0 | 0 | 0 | +5 | −5 | 0 | 0 | 0 |
| t_a_linea | 0 | 0 | +1 | 0 | 0 | 0 | 0 | 0 | 0 | −1 | −1 |
| t_a_lavado | 0 | 0 | −1 | 0 | 0 | 0 | 0 | 0 | 0 | +1 | −1 |

La red no es pura: Personal_linea es entrada y salida de t_servir, y Personal_lavado de t_lavar (arcos de lectura). En A esas casillas valen 0. Por eso la habilitación se revisa con Pre, no con A.

**Ejemplo de la ecuación de estado.** Llega un estudiante (evento externo) y se dispara t_servir, u = (1, 0, 0, 0, 0, 0):

M_{k−1} = (1, 30, 2, 0, 20, 0, 10, 0, 0, 2, 2)
Aᵀ · u = fila de t_servir = (−1, −1, 0, +1, 0, 0, 0, 0, 0, 0, 0)
M_k = (0, 29, 2, 1, 20, 0, 10, 0, 0, 2, 2)

## 4. Semántica temporal (tiempos del GDD)

El disparo es atómico: los tokens cambian en un instante. Los tiempos dicen cuándo ocurre cada disparo.

| Transición | Cuándo se dispara |
|---|---|
| t_servir | Cuando el jugador solicita `servir` y el supervisor lo permite. El estudiante ocupa el mostrador 3,0 s × 2 / M(Personal_linea) antes de `buscar_mesa`. |
| t_sentarse | En cuanto está habilitada y hay un estudiante en Buscando_Mesa. |
| t_terminar | En cuanto está habilitada y un estudiante ya cumplió su tiempo de almuerzo (uniforme entre 30 s y 42 s). |
| t_lavar | 10 s después de quedar habilitada. Hay tantos lavados en curso como el grado de habilitación min(⌊Bandeja_sucia / 5⌋, Personal_lavado). |
| t_a_linea, t_a_lavado | Cuando el jugador lo decide y hay permiso de Relevo. |

## 5. Propiedades

**Invariantes P** (se conservan en todo disparo; probados en 1000 disparos aleatorios con semilla):

| Invariante | Suma de tokens | Valor |
|---|---|---|
| Bandejas (ciclo cerrado de la ficha) | Bandeja_limpia + Con_bandeja + Almorzando + Bandeja_sucia | 30 |
| Mesas | Mesa_libre + Almorzando | 20 |
| Carro | Espacio_carro + Bandeja_sucia | 10 |
| Personal | Personal_linea + Personal_lavado | 4 |
| Estudiantes (entre llegadas) | En_fila + Con_bandeja + Almorzando + Salida | constante |

"Bandejas en uso" de la ficha es Con_bandeja + Almorzando. Relevo no pertenece a ningún invariante P: solo se consume.

**Acotación.** La red es acotada. Los invariantes dan la cota de cada lugar: Bandeja_limpia ≤ 30, Con_bandeja ≤ 30, Almorzando ≤ 20, Mesa_libre ≤ 20, Espacio_carro ≤ 10, Bandeja_sucia ≤ 10 (carro k-acotado), Personal_linea ≤ 4, Personal_lavado ≤ 4, Relevo ≤ 2. En_fila y Salida quedan acotados por el número de estudiantes. El árbol de cobertura no tiene ω y coincide con el de alcanzabilidad.

**Seguridad.** No es segura (1-acotada): varios lugares tienen más de 1 token desde M0.

**Invariantes T.** No hay. El flujo de estudiantes es abierto (En_fila → Salida) y Relevo solo se consume, así que ningún vector de disparos devuelve la red a su marcado.

**Conflictos (choice).** Con Relevo > 0: t_a_linea y t_a_lavado compiten por Relevo; t_servir y t_a_lavado por Personal_linea; t_lavar y t_a_linea por Personal_lavado. Los resuelve el jugador al decidir el relevo.

**Sincronización AND-join.** t_servir exige a la vez estudiante, bandeja limpia y personal. t_lavar exige 5 bandejas sucias y personal de lavado.

## 6. Marcado muerto, reposo e interbloqueo

- **Marcado muerto:** ninguna transición habilitada.
- **Marcado de reposo:** muerto y sin estudiantes en proceso, es decir M(En_fila) = M(Con_bandeja) = M(Almorzando) = 0. Es el estado normal antes de la primera llegada y al cerrar el turno. Se parece al marcado final de una red de flujo de trabajo: está muerto por diseño.
- **Interbloqueo (deadlock):** marcado muerto que no es de reposo. Hay estudiantes que nunca podrán avanzar.

Como las llegadas son eventos externos, un marcado sin estudiantes no tiene transiciones habilitadas. Por eso el juego y el radar usan "interbloqueo" y no "muerto". En el código: `esMuerto()`, `esReposo()` y `esBloqueo()` de `src/sed/redPetri.js`.

## 7. Deadlock de la ficha

"Pasar todo el personal a la línea en el cambio de turno: nadie lava, el carro se llena, los que almuerzan no pueden entregar ni liberar la mesa y no quedan bandejas limpias para servir."

Con 30 estudiantes en la fila (`ficha_deadlock30.xml`), la secuencia de 72 disparos es:

σ = t_a_linea² · t_servir²⁹ · t_sentarse²⁰ · t_terminar⁹ · t_sentarse⁹ · **t_servir · t_terminar · t_sentarse**

Vector de conteo de disparos: u = (t_servir 30, t_sentarse 30, t_terminar 10, t_lavar 0, t_a_linea 2, t_a_lavado 0).

| Lugar | M0 + 30 en fila | Aᵀ · u | Marcado muerto M_d |
|---|---|---|---|
| En_fila | 30 | −30 | **0** |
| Bandeja_limpia | 30 | −30 | **0** |
| Personal_linea | 2 | +2 | 4 |
| Con_bandeja | 0 | +30 − 30 | **0** |
| Mesa_libre | 20 | −30 + 10 | **0** |
| Almorzando | 0 | +30 − 10 | 20 |
| Espacio_carro | 10 | −10 | **0** |
| Bandeja_sucia | 0 | +10 | 10 |
| Salida | 0 | +10 | 10 |
| Personal_lavado | 2 | −2 | **0** |
| Relevo | 2 | −2 | **0** |

Por qué M_d está muerto: t_servir no tiene Bandeja_limpia; t_sentarse no tiene Con_bandeja ni Mesa_libre; t_terminar no tiene Espacio_carro; t_lavar y t_a_linea no tienen Personal_lavado; t_a_linea y t_a_lavado no tienen Relevo. Hay 20 estudiantes en Almorzando, así que es un interbloqueo.

Los tres últimos disparos parten del **marcado amarillo** M_C = (1, 1, 4, 0, 0, 20, 1, 9, 9, 0, 0) (`ficha_escenarioC.xml`). Desde ahí el radar, que mira 3 disparos adelante, ya ve el interbloqueo.

**Bloqueo simétrico (hallazgo del análisis).** El árbol de cobertura mostró otro interbloqueo que la ficha no menciona: pasar todo el personal al lavado. Con un estudiante en la fila, t_a_lavado · t_a_lavado deja Personal_linea = 0 y nadie puede servir. Es el camino más corto a un interbloqueo en el escenario B.

## 8. Regla de prevención: lugares monitor

Ficha: "Lugar monitor Minimo_lavado: al menos 1 persona en lavado en cada turno." El equipo agrega el monitor simétrico Minimo_linea por el hallazgo anterior.

| Lugar monitor | M0 | Arcos | Invariante P que impone | Garantiza |
|---|---|---|---|---|
| p12 Minimo_lavado (ficha) | 1 | entrada de t_a_linea, salida de t_a_lavado | Personal_linea + Minimo_lavado = 3 | Personal_linea ≤ 3, o sea Personal_lavado ≥ 1 |
| p13 Minimo_linea (extensión) | 1 | entrada de t_a_lavado, salida de t_a_linea | Personal_lavado + Minimo_linea = 3 | Personal_lavado ≤ 3, o sea Personal_linea ≥ 1 |

Con monitores: t_a_linea: Personal_lavado + Relevo + Minimo_lavado → Personal_linea + Minimo_linea. t_a_lavado: Personal_linea + Relevo + Minimo_linea → Personal_lavado + Minimo_lavado. Las demás transiciones no cambian. La red tiene 13 lugares y 6 transiciones.

**Por qué elimina el interbloqueo.** Con al menos 1 persona en cada puesto, si ninguna transición está habilitada entonces: t_lavar deshabilitada ⇒ Bandeja_sucia ≤ 4 ⇒ Espacio_carro ≥ 6; t_terminar deshabilitada ⇒ Almorzando = 0 ⇒ Mesa_libre = 20; t_sentarse deshabilitada ⇒ Con_bandeja = 0 ⇒ Bandeja_limpia ≥ 26; t_servir deshabilitada ⇒ En_fila = 0. Es decir, todo marcado muerto es de reposo.

**En el juego.** La regla se activa o desactiva desde el título o el inspector. Activarla en medio de un turno exige Personal_lavado ≥ 1 y Personal_linea ≥ 1, porque el marcado de los monitores sale de sus invariantes. Con la regla activa, el segundo t_a_linea queda deshabilitado y la estación muestra "falta Minimo_lavado".

## 9. Resultados esperados para comparar con PIPE2

Calculados con `arbolCobertura()` de `src/sed/cobertura.js` y fijados en `test/redPetri.test.js`. "Marcados distintos" es el número de estados del grafo de alcanzabilidad de PIPE2. "Nodos del árbol" cuenta además las hojas duplicadas.

| Escenario | Archivo | Marcado inicial | Nodos del árbol | Marcados distintos | Muertos | Interbloqueos |
|---|---|---|---|---|---|---|
| M0 de la ficha | `ficha_M0.xml` | M0 | 7 | 6 | 3 | 0 |
| M0 con monitores | `monitor_M0.xml` | M0 | 5 | 4 | 1 | 0 |
| A, flujo normal | `ficha_escenarioA.xml` | En_fila = 3, Relevo = 0 | 31 | 20 | 1 | 0 |
| B, relevo libre | `ficha_escenarioB.xml` | En_fila = 2 | 129 | 60 | 5 | 2 |
| B con monitores | `monitor_escenarioB.xml` | En_fila = 2 | 89 | 40 | 1 | 0 |
| C, deadlock de la ficha | `ficha_escenarioC.xml` | M_C | 6 | 5 | 1 | 1 |
| C con monitores | `monitor_escenarioC.xml` | M_C con personal 3/1 | 287 | 139 | 1 | 0 |

Cómo leer PIPE2: su módulo State Space Analysis responde "Deadlock: true" si existe cualquier marcado muerto, también los de reposo. Hay que mirar el marcado: si En_fila, Con_bandeja y Almorzando valen 0, es reposo. En los escenarios con monitores el único marcado muerto es de reposo.
