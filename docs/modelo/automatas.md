# Modelo formal · Autómatas (Unidad 2)

Proyecto 13 · **UniFood Rush** · ficha D.13 de la guía.
Fuente única: `src/sed/modelos/*.json`. Los archivos de `modelos/automatas/*.jff` se generan con `npm run modelos` a partir de esos JSON.

Notación: G = (Q, Σ, δ, q0, Qm), con Σ = Σc ∪ Σuc (controlables y no controlables) y Σ = Σo ∪ Σuo (observables y no observables). En este proyecto **Σuo = ∅**: todos los eventos son observables.

## 1. Tabla de eventos y códigos de una letra

| Autómata | Evento | Código | Controlable | Observable | Qué representa |
|---|---|---|---|---|---|
| Estudiante | servir | `s` | sí (c) | sí | El personal de línea entrega la bandeja servida. |
| Estudiante | buscar_mesa | `b` | no (uc) | sí | El estudiante deja el mostrador con su bandeja. |
| Estudiante | sentarse | `m` | no (uc) | sí | Ocupa una mesa libre. |
| Estudiante | terminar | `t` | no (uc) | sí | Termina de almorzar y se levanta con el menaje. |
| Estudiante | entregar | `e` | no (uc) | sí | Deja el menaje en el carro y sale. |
| Torniquete | leer | `l` | no (uc) | sí | El lector lee el carné del estudiante en cabeza. |
| Torniquete | acceso_ok | `a` | no (uc) | sí | Carné válido: acceso registrado. |
| Torniquete | rechazo | `r` | no (uc) | sí | Carné rechazado. |
| Torniquete | bloqueo | `x` | no (uc) | sí | El torniquete se bloquea tras 3 rechazos. |
| Torniquete | reiniciar | `i` | sí (c) | sí | Reinicio manual; exige una palabra del lenguaje de reparación. |

Σc = {servir, reiniciar}. Σuc = {buscar_mesa, sentarse, terminar, entregar, leer, acceso_ok, rechazo, bloqueo}.

## 2. Estudiante (ficha, una instancia por estudiante)

- Q = {En_Fila, Recibiendo_Bandeja, Buscando_Mesa, Almorzando, Entregando_Menaje, Salida}
- q0 = En_Fila · Qm = {Salida} · 6 estados · determinista · archivo `estudiante.jff`

| δ | servir `s` | buscar_mesa `b` | sentarse `m` | terminar `t` | entregar `e` |
|---|---|---|---|---|---|
| **En_Fila** | Recibiendo_Bandeja | – | – | – | – |
| **Recibiendo_Bandeja** | – | Buscando_Mesa | – | – | – |
| **Buscando_Mesa** | – | – | Almorzando | – | – |
| **Almorzando** | – | – | – | Entregando_Menaje | – |
| **Entregando_Menaje** | – | – | – | – | Salida |
| **Salida** | – | – | – | – | – |

Lenguaje marcado: L_m(Estudiante) = {`sbmte`}. Es la única palabra aceptada: el recorrido completo.

## 3. Torniquete (ficha, dos instancias: T1 y T2)

- Q = {Listo, Leyendo, Acceso, Rechazo, Bloqueado}
- q0 = Listo · Qm = {Listo, Acceso} · 5 estados · determinista · archivo `torniquete.jff`

| δ | leer `l` | acceso_ok `a` | rechazo `r` | bloqueo `x` | reiniciar `i` |
|---|---|---|---|---|---|
| **Listo** | Leyendo | – | – | – | – |
| **Leyendo** | – | Acceso | Rechazo | – | – |
| **Acceso** | Leyendo | – | – | – | – |
| **Rechazo** | Leyendo | – | – | Bloqueado | – |
| **Bloqueado** | – | – | – | – | Listo |

Decisión del equipo: la ficha da 5 eventos y no incluye uno de "paso". Por eso `leer` también sale de Acceso y de Rechazo (la siguiente lectura), y Listo es el estado tras encender o reiniciar. Qm marca los estados sin lectura pendiente ni fallo.

## 4. Contador_Rechazos (extensión del equipo)

La ficha dice "bloqueo (uc, tras 3 rechazos)". Para que ese "tras 3" no sea un `if` en el código, el conteo es un autómata que se compone con el torniquete.

- Q = {C0, C1, C2, C3} · q0 = C0 · Qm = {C0, C1, C2} · Σ = {leer, rechazo, bloqueo} · archivo `contador_rechazos.jff`

| δ | leer `l` | rechazo `r` | bloqueo `x` |
|---|---|---|---|
| **C0** | C0 | C1 | – |
| **C1** | C1 | C2 | – |
| **C2** | C2 | C3 | – |
| **C3** | – | – | C0 |

**Torniquete ‖ Contador_Rechazos** (eventos comunes: leer, rechazo, bloqueo): 11 estados alcanzables de 20.
(Listo,C0), (Leyendo,C0), (Acceso,C0), (Rechazo,C1), (Leyendo,C1), (Acceso,C1), (Rechazo,C2), (Leyendo,C2), (Acceso,C2), (Rechazo,C3), (Bloqueado,C0).
En (Rechazo,C1) y (Rechazo,C2) `bloqueo` no está habilitado porque el contador no lo permite. En (Rechazo,C3) solo queda `bloqueo`: `leer` no está en Γ(C3). Archivo `composicion_torniquete_contador.jff`.

## 5. Supervisor de la ficha: servir solo después de acceso_ok

Ficha: "Supervisor sobre Estudiante ‖ Torniquete: servir se deshabilita si el torniquete no registró acceso_ok para ese estudiante."

**Planta** G = Estudiante ‖ Torniquete. No tienen eventos comunes, así que el producto es Q1 × Q2 completo: **30 estados y 67 transiciones** (`composicion_estudiante_torniquete.jff`).

**Especificación** Registro_Acceso (una instancia por estudiante; archivo `registro_acceso.jff`):

- Q = {Sin_acceso, Con_acceso, Violacion} · q0 = Sin_acceso · Qm = {Sin_acceso, Con_acceso} · Σ = {acceso_ok, servir}
- Estado prohibido: **Violacion** (un estudiante servido sin acceso registrado).

| δ | acceso_ok `a` | servir `s` |
|---|---|---|
| **Sin_acceso** | Con_acceso | Violacion |
| **Con_acceso** | Con_acceso | Con_acceso |
| **Violacion** | Violacion | Violacion |

**Composición** Estudiante ‖ Torniquete ‖ Registro_Acceso (`acceso_ok` es común a Torniquete y Registro; `servir` es común a Estudiante y Registro):

| Dato | Valor |
|---|---|
| Estados alcanzables | 59 (`planta_con_especificacion.jff`) |
| Estados prohibidos (Registro = Violacion) | 25 |
| Estados malos por eventos no controlables | 0 más: a Violacion solo se entra con `servir`, que es controlable |
| Estados del supervisor | 34 (`supervisor.jff`) |
| Evento deshabilitado | `servir` en (En_Fila, Listo, Sin_acceso), (En_Fila, Leyendo, Sin_acceso), (En_Fila, Rechazo, Sin_acceso) y (En_Fila, Bloqueado, Sin_acceso) |
| Razón formal que muestra el HUD | ¬(servir ∧ Registro = Sin_acceso) |
| No bloqueo | Desde todo estado bueno se llega a un estado marcado (Salida, Listo o Acceso, sin Violacion) |

El supervisor es controlable porque solo deshabilita `servir` (c). El algoritmo está en `supervisor()` de `src/sed/composicion.js`: marca los prohibidos, retrocede por eventos no controlables y quita los estados que bloquean.

Nota sobre el torniquete compartido: un torniquete atiende a todos los estudiantes de su línea. El `acceso_ok` se sincroniza solo con el Registro del estudiante que está en el lector. Por eso un estudiante que espera atrás puede verse en la tupla (En_Fila, Acceso, Sin_acceso), que no es alcanzable con un solo estudiante. El juego calcula el supervisor sobre el producto completo (90 tuplas, 30 prohibidas), y ahí `servir` también queda deshabilitado.

## 6. Lenguaje de reparación del torniquete

- Expresión de la ficha (JavaScript): `^R(S[1-3]){2,}K$`
- En la notación de JFLAP (unión con `+`): `RS(1+2+3)S(1+2+3)(S(1+2+3))*K` (`reparacion_regex.jff`)
- Alfabeto: R reset, S prueba de sensor, 1 2 3 número de sensor, K confirmar. Comandos de la consola: `R`, `S1`, `S2`, `S3`, `K`.
- Evento que dispara una palabra válida: `reiniciar` (Bloqueado → Listo).

DFA mínimo (`reparacion_dfa.jff`): 7 estados con δ parcial. Si se completa δ aparece un octavo estado trampa.

| δ | R | S | 1 | 2 | 3 | K |
|---|---|---|---|---|---|---|
| **q0** (inicial) | q1 | – | – | – | – | – |
| **q1** | – | q2 | – | – | – | – |
| **q2** | – | – | q3 | q3 | q3 | – |
| **q3** | – | q4 | – | – | – | – |
| **q4** | – | – | q5 | q5 | q5 | – |
| **q5** | – | q4 | – | – | – | q6 |
| **q6** (final) | – | – | – | – | – | – |

q3 significa "una prueba de sensor hecha"; q5, "dos o más". Solo desde q5 se acepta K.

## 7. Palabras de prueba (para Input > Multiple Run de JFLAP)

Las mismas palabras están en `test/automatas.test.js`.

| Autómata | Palabra | Qué representa | ¿Debe aceptarse? |
|---|---|---|---|
| Estudiante | `sbmte` | Recorrido completo hasta Salida | Sí |
| Estudiante | `sbmt` | Se levanta pero no entrega el menaje | No |
| Estudiante | `bsmte` | Busca mesa sin haber sido servido | No |
| Estudiante | `sbtme` | Termina antes de sentarse | No |
| Estudiante | `ssbmte` | Lo sirven dos veces | No |
| Torniquete | (vacía) | Sin lecturas: sigue Listo | Sí |
| Torniquete | `la` | Una lectura con acceso | Sí |
| Torniquete | `lrla` | Rechazo y luego acceso | Sí |
| Torniquete | `lrlrlrxi` | Tres rechazos, bloqueo y reinicio | Sí |
| Torniquete | `l` | Lectura sin resultado | No |
| Torniquete | `lrx` | Bloqueado sin reiniciar | No |
| Torniquete | `lax` | Bloqueo después de un acceso | No |
| Torniquete | `li` | Reiniciar sin estar bloqueado | No |
| Contador | `lrlrlrx` | Bloqueo tras exactamente 3 rechazos | Sí |
| Contador | `rx` | Bloqueo con un solo rechazo | No |
| Contador | `rrrl` | Otra lectura tras el tercer rechazo | No |
| Reparación | `RS1S2K` | Válida de la ficha | Sí |
| Reparación | `RS3S3S1K` | Tres pruebas de sensor | Sí |
| Reparación | `RS1K` | Solo una prueba de sensor | No |
| Reparación | `RS4S1K` | El sensor 4 no existe | No |
| Reparación | `S1S2K` | Falta el reset inicial | No |
| Reparación | `RS1S2` | Falta confirmar | No |

## 8. Sincronización con la red de Petri

| Transición de la red | Evento que envía | Autómatas que lo ejecutan a la vez |
|---|---|---|
| t_servir | servir | Estudiante y su Registro_Acceso |
| t_sentarse | sentarse | Estudiante |
| t_terminar | terminar | Estudiante |
| (ninguna) | buscar_mesa, entregar | Estudiante (fin de una duración del reloj) |
| (ninguna) | leer, rechazo, bloqueo | Torniquete y su Contador_Rechazos |
| (ninguna) | acceso_ok | Torniquete y el Registro_Acceso del estudiante leído |

Correspondencia entre estados y lugares: En_Fila ↔ En_fila; Recibiendo_Bandeja y Buscando_Mesa ↔ Con_bandeja; Almorzando ↔ Almorzando; Entregando_Menaje y Salida ↔ Salida.
