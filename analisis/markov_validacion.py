# analisis/markov_validacion.py — validación de las Cadenas de Markov de UniFood Rush (ficha D.13)
#
# Programa de la sección 5.2 de la guía, con las dos cadenas del proyecto 13. Verifica
# Chapman-Kolmogorov, calcula pi^(n), clasifica los estados, resuelve el estado
# estacionario, la probabilidad de llegar a un estado peligroso en k pasos, simula
# 10 000 pasos con semilla y prueba la P estimada con chi-cuadrado.
#
# Uso, desde la raíz del proyecto:   python analisis/markov_validacion.py
# Escribe analisis/resultados_python.json: la referencia contra la que se prueba el juego
# (test/markov.test.js compara cada número con tolerancia 1e-6).
import json
import sys
from math import gcd
from pathlib import Path

import numpy as np

try:  # SciPy da el valor p exacto; sin SciPy se usa la función gamma incompleta de abajo
    from scipy.stats import chi2 as _chi2
except ImportError:
    _chi2 = None

SEMILLA, PASOS = 2026, 10_000
SALIDA = Path(__file__).with_name("resultados_python.json")

# Paso k de las dos cadenas: 1 paso = 30 s de simulación del juego (2 min del comedor).
PASO_K_S = 30

CADENAS = {
    # Oleada de llegada (ficha D.13): estudiantes que llegan durante cada paso k.
    "Oleada": {
        "estados": ["Baja", "Media", "Alta"],
        "llegadas_por_paso": [4, 10, 18],
        "P": [[0.60, 0.30, 0.10],
              [0.25, 0.50, 0.25],
              [0.10, 0.35, 0.55]],
        "pi0": [1.0, 0.0, 0.0],          # la partida inicia a las 11:30 en Baja
        "peligrosos": ["Alta"],
    },
    # Ocupación de las 20 mesas en cuartos: modelo de referencia que se compara con la
    # ocupación observada en la red de Petri (20 − Mesa_libre).
    "Mesas": {
        "estados": ["0-25%", "25-50%", "50-75%", "75-100%"],
        "P": [[0.50, 0.40, 0.10, 0.00],
              [0.20, 0.50, 0.25, 0.05],
              [0.05, 0.25, 0.50, 0.20],
              [0.00, 0.10, 0.40, 0.50]],
        "pi0": [1.0, 0.0, 0.0, 0.0],     # al abrir el comedor las 20 mesas están libres
        "peligrosos": ["75-100%"],
    },
}

# Capacidad de servido para el dimensionamiento (tiempos del GDD de la Fase 1, en s):
# acercar el carné 0,4 + lectura 0,8 + reacción del piloto 0,6 + servir 3,0 × 2 / M(Personal_linea).
TIEMPO_FIJO_LINEA = 0.4 + 0.8 + 0.6
SERVIR_BASE = 3.0


def valor_p_chi2(x, gl):
    """P(X > x) para X ~ chi-cuadrado con gl grados de libertad."""
    if _chi2 is not None:
        return float(_chi2.sf(x, gl))
    # Q(a, z) regularizada: serie para z < a + 1 y fracción continua en otro caso.
    a, z = gl / 2.0, x / 2.0
    if z <= 0:
        return 1.0
    from math import exp, lgamma, log
    if z < a + 1:
        termino = suma = 1.0 / a
        n = a
        for _ in range(500):
            n += 1
            termino *= z / n
            suma += termino
            if abs(termino) < abs(suma) * 1e-15:
                break
        return 1.0 - suma * exp(-z + a * log(z) - lgamma(a))
    b = z + 1 - a
    c = 1 / 1e-300
    d = 1 / b
    h = d
    for i in range(1, 500):
        an = -i * (i - a)
        b += 2
        d = an * d + b
        d = 1e-300 if abs(d) < 1e-300 else d
        c = b + an / c
        c = 1e-300 if abs(c) < 1e-300 else c
        d = 1 / d
        h *= d * c
        if abs(d * c - 1) < 1e-15:
            break
    return exp(-z + a * log(z) - lgamma(a)) * h


def clasificar(P, estados):
    """Clases que se comunican, tipo de cada estado y periodo de cada clase."""
    n = len(P)
    alcanza = (P > 0).astype(int)
    for k in range(n):  # cierre transitivo (Warshall): i -> j en uno o más pasos
        alcanza = alcanza | (alcanza[:, [k]] & alcanza[[k], :])
    clases, asignado = [], set()
    for i in range(n):
        if i in asignado:
            continue
        clase = [j for j in range(n) if j == i or (alcanza[i, j] and alcanza[j, i])]
        asignado.update(clase)
        # En una cadena finita una clase es recurrente si es cerrada (no sale de ella).
        cerrada = all(not alcanza[a, b] or b in clase for a in clase for b in range(n))
        # Periodo: mcd de (nivel[u] + 1 − nivel[v]) sobre los arcos u -> v dentro de la clase.
        nivel, cola, periodo = {clase[0]: 0}, [clase[0]], 0
        while cola:
            u = cola.pop(0)
            for v in clase:
                if P[u, v] > 0:
                    if v not in nivel:
                        nivel[v] = nivel[u] + 1
                        cola.append(v)
                    periodo = gcd(periodo, nivel[u] + 1 - nivel[v])
        absorbente = len(clase) == 1 and P[clase[0], clase[0]] == 1
        tipo = "absorbente" if absorbente else ("recurrente" if cerrada else "transitorio")
        clases.append({"estados": [estados[j] for j in clase], "tipo": tipo,
                       "periodo": abs(periodo) if periodo else None})
    irreducible = len(clases) == 1
    aperiodica = all(c["periodo"] == 1 for c in clases if c["tipo"] != "transitorio")
    return {"clases": clases, "irreducible": irreducible, "aperiodica": aperiodica,
            "ergodica": irreducible and aperiodica}


def riesgo(P, objetivos, pasos):
    """P(llegar al menos una vez a un estado objetivo en <= k pasos), desde cada estado."""
    Pa = P.copy()
    for j in objetivos:  # los objetivos se vuelven absorbentes: se cuenta la primera llegada
        Pa[j] = 0
        Pa[j, j] = 1
    return {str(k): np.linalg.matrix_power(Pa, k)[:, objetivos].sum(axis=1).tolist() for k in pasos}


def validar(nombre, c):
    estados = c["estados"]
    P = np.array(c["P"])
    PI0 = np.array(c["pi0"])
    n = len(P)
    assert np.all(P >= 0) and np.allclose(P.sum(axis=1), 1), f"{nombre}: P no es estocástica"

    # 1. Chapman-Kolmogorov: P^(m+n) = P^m · P^n
    P2, P3, P5 = (np.linalg.matrix_power(P, e) for e in (2, 3, 5))
    assert np.allclose(P5, P2 @ P3)
    pares = [(m, k) for m in range(1, 6) for k in range(1, 6)]
    dif_ck = max(np.abs(np.linalg.matrix_power(P, m + k)
                        - np.linalg.matrix_power(P, m) @ np.linalg.matrix_power(P, k)).max() for m, k in pares)

    # 2. Análisis transitorio: pi(n) = pi(0) · P^n
    transitorio = {str(k): (PI0 @ np.linalg.matrix_power(P, k)).tolist() for k in (1, 2, 3, 4, 5, 8, 10, 20)}

    # 3. Clasificación y estado estacionario (P^T − I) pi^T = 0 con suma 1
    clasificacion = clasificar(P, estados)
    A = np.vstack([P.T - np.eye(n), np.ones(n)])
    b = np.r_[np.zeros(n), 1.0]
    pi = np.linalg.lstsq(A, b, rcond=None)[0]

    # 4. Riesgo: probabilidad de llegar a un estado peligroso en los próximos 1, 3 y 5 pasos
    objetivos = [estados.index(e) for e in c["peligrosos"]]

    # 5. Simulación con semilla y frecuencias empíricas (método de la guía)
    rng = np.random.default_rng(SEMILLA)
    x, visitas, conteo = 0, np.zeros(n), np.zeros_like(P)
    for _ in range(PASOS):
        y = rng.choice(n, p=P[x])
        conteo[x, y] += 1
        visitas[y] += 1
        x = y
    P_est = conteo / conteo.sum(axis=1, keepdims=True).clip(min=1)
    frecuencias = visitas / PASOS

    # 6. Chi-cuadrado de las transiciones observadas frente a P (alfa = 0,05)
    estadistico, gl = 0.0, 0
    for i in range(n):
        ni = conteo[i].sum()
        if ni == 0:
            continue
        posibles = P[i] > 0
        esperado = ni * P[i, posibles]
        estadistico += float(((conteo[i, posibles] - esperado) ** 2 / esperado).sum())
        gl += int(posibles.sum()) - 1
    valor_p = valor_p_chi2(estadistico, gl)

    resultado = {
        "estados": estados, "P": P.tolist(), "pi0": PI0.tolist(), "absorbentes": [],
        "peligrosos": c["peligrosos"],
        "chapman_kolmogorov": {"P2": P2.tolist(), "P3": P3.tolist(), "P5": P5.tolist(),
                               "P2_por_P3": (P2 @ P3).tolist(), "diferencia_maxima": float(dif_ck)},
        "transitorio": transitorio,
        "clasificacion": clasificacion,
        "pi": pi.tolist(),
        "retorno_medio": (1 / pi).tolist(),
        "riesgo": {"objetivo": c["peligrosos"], "desde_cada_estado": riesgo(P, objetivos, (1, 3, 5))},
        "simulacion": {"semilla": SEMILLA, "pasos": PASOS, "estado_inicial": estados[0]},
        "frecuencias": frecuencias.tolist(),
        "diferencia_maxima_frecuencias": float(np.abs(frecuencias - pi).max()),
        "conteos": conteo.astype(int).tolist(),
        "P_estimada": P_est.tolist(),
        "chi_cuadrado": {"estadistico": estadistico, "gl": gl, "valor_p": valor_p,
                         "alfa": 0.05, "rechaza": bool(valor_p < 0.05)},
    }
    if "llegadas_por_paso" in c:
        llegadas = np.array(c["llegadas_por_paso"])
        resultado["llegadas_por_paso"] = llegadas.tolist()
        resultado["dimensionamiento"] = dimensionar(pi, llegadas)
        # Turnos del GDD con llegadas por Markov: 7, 10 y 13 pasos desde pi^(0).
        resultado["llegadas_esperadas_por_turno"] = {
            str(p): llegadas_esperadas(P, PI0, llegadas, p) for p in (7, 10, 13)}
    return resultado


def llegadas_esperadas(P, PI0, llegadas, pasos):
    """Estudiantes esperados en un turno de 'pasos' pasos: suma de pi^(n) · llegadas, n = 0..pasos−1."""
    return float(sum(PI0 @ np.linalg.matrix_power(P, n) @ llegadas for n in range(pasos)))


def dimensionar(pi, llegadas):
    """Demanda media por paso con pi y capacidad de servido con 2 o 3 líneas abiertas."""
    demanda = float(pi @ llegadas)
    capacidad = {}
    for lineas in (2, 3):
        for personal in (2, 3):
            ciclo = TIEMPO_FIJO_LINEA + SERVIR_BASE * 2 / personal  # s por estudiante y línea
            capacidad[f"{lineas}_lineas_{personal}_personas"] = lineas * PASO_K_S / ciclo
    return {
        "demanda_media_por_paso": demanda,
        "demanda_por_estado": llegadas.tolist(),
        "capacidad_por_paso": capacidad,
        "utilizacion_media_2_lineas": demanda / capacidad["2_lineas_2_personas"],
        "utilizacion_alta_2_lineas": float(llegadas[-1]) / capacidad["2_lineas_2_personas"],
        "utilizacion_alta_3_lineas": float(llegadas[-1]) / capacidad["3_lineas_2_personas"],
    }


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # tildes legibles en la consola de Windows
    resultados = {
        "proyecto": "UniFood Rush (proyecto 13, ficha D.13)",
        "paso_k": f"1 paso = {PASO_K_S} s de simulación (2 min del comedor)",
        "semilla": SEMILLA, "pasos": PASOS,
        "cadenas": {nombre: validar(nombre, c) for nombre, c in CADENAS.items()},
    }
    SALIDA.write_text(json.dumps(resultados, indent=2, ensure_ascii=False), encoding="utf-8")
    for nombre, r in resultados["cadenas"].items():
        print(f"== {nombre}: {', '.join(r['estados'])}")
        print("   clasificación:", r["clasificacion"]["clases"], "· ergódica:", r["clasificacion"]["ergodica"])
        print("   pi =", np.round(r["pi"], 4).tolist(), "· retorno medio =", np.round(r["retorno_medio"], 2).tolist())
        print("   pi(5) =", np.round(r["transitorio"]["5"], 4).tolist())
        print("   frecuencias en", PASOS, "pasos =", np.round(r["frecuencias"], 4).tolist(),
              "· diferencia máxima con pi =", round(r["diferencia_maxima_frecuencias"], 4))
        chi = r["chi_cuadrado"]
        print(f"   chi-cuadrado = {chi['estadistico']:.3f} con {chi['gl']} gl · p = {chi['valor_p']:.4f}"
              f" · {'rechaza' if chi['rechaza'] else 'no rechaza'} P con alfa = 0,05")
        print("   riesgo", r["riesgo"]["objetivo"], "en <= 1, 3, 5 pasos desde cada estado:",
              {k: np.round(v, 4).tolist() for k, v in r["riesgo"]["desde_cada_estado"].items()})
        if "dimensionamiento" in r:
            d = r["dimensionamiento"]
            print(f"   demanda media {d['demanda_media_por_paso']:.3f} estudiantes por paso;",
                  "capacidad:", {k: round(v, 2) for k, v in d["capacidad_por_paso"].items()})
            print("   estudiantes esperados por turno (pasos: estudiantes):",
                  {k: round(v, 1) for k, v in r["llegadas_esperadas_por_turno"].items()})
    print("Resultados en", SALIDA)


if __name__ == "__main__":
    main()
