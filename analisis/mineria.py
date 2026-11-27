# analisis/mineria.py — Discovery, Conformance y Performance del Event Log de UniFood Rush
#
# Programa de la sección 5.9 de la guía, adaptado a docs/log.md (habilidad analista-procesos).
# Uso, desde la raíz del proyecto:
#   python analisis/mineria.py analisis/logs/entrega/base.csv
#   python analisis/mineria.py analisis/logs/entrega/base.csv analisis/logs/entrega/mejorado.csv
# Con dos logs (misma semilla) compara el base con el mejorado (Enhancement).
#
# El desempeño y la pregunta de la ficha D.13 solo necesitan pandas. El descubrimiento y la
# conformidad necesitan PM4Py, y sus figuras, Graphviz (pip install -r analisis/requirements.txt).
# Todo se guarda en analisis/salidas/<log>/ y en analisis/salidas/resumen_<log>.json.
import json
import os
import shutil
import sys
from pathlib import Path

import pandas as pd


def graphviz_en_path():
    """En Windows Graphviz suele quedar instalado sin agregarse al PATH: se busca en las carpetas usuales."""
    if shutil.which("dot"):
        return shutil.which("dot")
    for carpeta in (Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Graphviz" / "bin",
                    Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Graphviz" / "bin"):
        if (carpeta / "dot.exe").exists():
            os.environ["PATH"] = str(carpeta) + os.pathsep + os.environ.get("PATH", "")
            return str(carpeta / "dot.exe")
    return None


DOT = graphviz_en_path()

try:
    import pm4py
except ImportError:  # sin PM4Py se hace solo el desempeño
    pm4py = None

RAIZ = Path(__file__).resolve().parent
NORMATIVO = RAIZ / "modelo_normativo.pnml"
SALIDAS = RAIZ / "salidas"
ACTIVIDADES = ["Esperar_fila", "Pasar_torniquete", "Recibir_bandeja", "Buscar_mesa", "Almorzar", "Entregar_menaje"]
ESPERAS_CON_NOMBRE = {"Esperar_fila", "Buscar_mesa"}  # actividades que son espera (docs/log.md, sección 2)
SERVICIO = {"Pasar_torniquete", "Recibir_bandeja", "Almorzar", "Entregar_menaje"}


def minutos(segundos):
    return segundos / 60


def cargar(ruta):
    """CSV exportado por el simulador; deja solo los casos cerrados y dice cuántos quitó."""
    df = pd.read_csv(ruta, encoding="utf-8-sig")
    df["Timestamp_Inicio"] = pd.to_datetime(df["Timestamp_Inicio"], utc=True)
    df["Timestamp_Fin"] = pd.to_datetime(df["Timestamp_Fin"], utc=True)
    estado = df.groupby("Case_ID").agg(
        completas=("Lifecycle", lambda s: bool((s == "complete").all())),
        final=("Activity", lambda s: "Entregar_menaje" in set(s)))
    cerrados = estado.index[estado["completas"] & estado["final"]]
    quitados = len(estado) - len(cerrados)
    df = df[df["Case_ID"].isin(cerrados)].sort_values(["Case_ID", "Timestamp_Inicio", "Timestamp_Fin"]).reset_index(drop=True)
    return df, quitados


def variantes(df):
    trazas = df.groupby("Case_ID")["Activity"].apply(tuple)
    return trazas.value_counts()


def desempeno(df):
    """Servicio, espera y cuello de botella por actividad; ciclo y uso de recursos."""
    d = df.copy()
    d["servicio_s"] = (d["Timestamp_Fin"] - d["Timestamp_Inicio"]).dt.total_seconds()
    fin_anterior = d.groupby("Case_ID")["Timestamp_Fin"].shift()
    d["hueco_s"] = (d["Timestamp_Inicio"] - fin_anterior).dt.total_seconds().fillna(0)
    # Espera = hueco antes de la actividad + la duración de las esperas con nombre propio.
    d["espera_s"] = d["hueco_s"] + d["servicio_s"].where(d["Activity"].isin(ESPERAS_CON_NOMBRE), 0)
    tabla = d.groupby("Activity").agg(
        filas=("Case_ID", "size"), casos=("Case_ID", "nunique"),
        servicio_medio_s=("servicio_s", "mean"), espera_media_s=("espera_s", "mean"),
        espera_total_s=("espera_s", "sum"))
    tabla = tabla.reindex([a for a in ACTIVIDADES if a in tabla.index]).sort_values("espera_total_s", ascending=False)
    ciclo = d.groupby("Case_ID").agg(ini=("Timestamp_Inicio", "min"), fin=("Timestamp_Fin", "max"))
    ciclo_s = (ciclo["fin"] - ciclo["ini"]).dt.total_seconds()
    uso = d[d["Activity"].isin(SERVICIO)].groupby("Resource_ID")["servicio_s"].sum().sort_values(ascending=False)
    return d, tabla, ciclo_s, uso


def pregunta_ficha(d):
    """Ficha D.13: tiempo hasta la bandeja por oleada de llegada (Markov_State de Esperar_fila)."""
    por_caso = []
    for caso, g in d.groupby("Case_ID"):
        llegada = g[g["Activity"] == "Esperar_fila"].iloc[0]
        lectura = g[g["Activity"] == "Pasar_torniquete"].iloc[0]
        bandeja = g[g["Activity"] == "Recibir_bandeja"].iloc[0]
        por_caso.append({
            "Case_ID": caso, "oleada": llegada["Markov_State"],
            "llegada_a_bandeja_s": (bandeja["Timestamp_Inicio"] - llegada["Timestamp_Inicio"]).total_seconds(),
            "torniquete_a_bandeja_s": (bandeja["Timestamp_Inicio"] - lectura["Timestamp_Inicio"]).total_seconds(),
            "lecturas": int((g["Activity"] == "Pasar_torniquete").sum())})
    t = pd.DataFrame(por_caso)
    resumen = t.groupby("oleada").agg(
        casos=("Case_ID", "size"),
        llegada_a_bandeja_media_s=("llegada_a_bandeja_s", "mean"),
        llegada_a_bandeja_mediana_s=("llegada_a_bandeja_s", "median"),
        llegada_a_bandeja_p90_s=("llegada_a_bandeja_s", lambda s: s.quantile(0.9)),
        torniquete_a_bandeja_media_s=("torniquete_a_bandeja_s", "mean"))
    orden = [o for o in ["Baja", "Media", "Alta", "-"] if o in resumen.index]
    return t, resumen.reindex(orden)


def con_pm4py(df, carpeta):
    """Descubrimiento (DFG, Alpha, Heuristic, Inductive) y conformidad contra el modelo normativo."""
    r = {}
    log = pm4py.format_dataframe(df.copy(), case_id="Case_ID", activity_key="Activity",
                                 timestamp_key="Timestamp_Fin", start_timestamp_key="Timestamp_Inicio")
    log = log.rename(columns={"Resource_ID": "org:resource"})
    figuras = []

    def guardar(funcion, *args):
        try:
            funcion(*args)
            figuras.append(Path(args[-1]).name)
        except Exception as error:  # sin Graphviz no hay figuras, pero sí números
            print(f"   (sin figura {Path(args[-1]).name}: {error.__class__.__name__})")

    # 2. Descubrimiento
    dfg, ini, fin = pm4py.discover_dfg(log)
    guardar(pm4py.save_vis_dfg, dfg, ini, fin, str(carpeta / "dfg.png"))
    r["dfg"] = {"actividades": len({a for par in dfg for a in par}), "arcos": len(dfg),
                "autolazo_torniquete": dfg.get(("Pasar_torniquete", "Pasar_torniquete"), 0)}
    net_a, im_a, fm_a = pm4py.discover_petri_net_alpha(log)
    guardar(pm4py.save_vis_petri_net, net_a, im_a, fm_a, str(carpeta / "alpha.png"))
    r["alpha"] = {"lugares": len(net_a.places), "transiciones": len(net_a.transitions), "arcos": len(net_a.arcs)}
    heu = pm4py.discover_heuristics_net(log, dependency_threshold=0.9)
    guardar(pm4py.save_vis_heuristics_net, heu, str(carpeta / "heuristic_causal_net.png"))
    r["heuristic"] = {"actividades": len(heu.nodes), "arcos": sum(len(n.output_connections) for n in heu.nodes.values())}
    arbol = pm4py.discover_process_tree_inductive(log, noise_threshold=0.2)
    guardar(pm4py.save_vis_process_tree, arbol, str(carpeta / "process_tree.png"))
    guardar(pm4py.save_vis_bpmn, pm4py.convert_to_bpmn(arbol), str(carpeta / "bpmn.png"))
    net, im, fm = pm4py.convert_to_petri_net(arbol)
    pm4py.write_pnml(net, im, fm, str(carpeta / "modelo_descubierto.pnml"))
    r["inductive"] = {"arbol": str(arbol), "lugares": len(net.places), "transiciones": len(net.transitions)}

    # 3. Conformidad contra el modelo normativo (Workflow Net de docs/log.md)
    net_n, im_n, fm_n = pm4py.read_pnml(str(NORMATIVO))
    try:  # la red normativa es la misma para todos los logs: una sola figura en salidas/
        pm4py.save_vis_petri_net(net_n, im_n, fm_n, str(SALIDAS / "modelo_normativo.png"))
    except Exception as error:
        print(f"   (sin figura modelo_normativo.png: {error.__class__.__name__})")
    tbr =pm4py.fitness_token_based_replay(log, net_n, im_n, fm_n)
    ali = pm4py.fitness_alignments(log, net_n, im_n, fm_n)
    prec = pm4py.precision_token_based_replay(log, net_n, im_n, fm_n)
    diag = pm4py.conformance_diagnostics_alignments(log, net_n, im_n, fm_n)
    desvios = {}
    for d in diag:
        for mov in d["alignment"]:
            if mov[0] != mov[1]:
                clave = f"en el log {mov[0]} / en el modelo {mov[1]}"
                desvios[clave] = desvios.get(clave, 0) + 1
    r["conformidad"] = {
        "fitness_tokens": tbr["log_fitness"], "trazas_que_ajustan_pct": tbr["perc_fit_traces"],
        "fitness_alineamientos": ali["log_fitness"], "precision": prec,
        "casos_con_desvio": sum(d["fitness"] < 1 for d in diag), "casos": len(diag),
        "desvios_mas_frecuentes": dict(sorted(desvios.items(), key=lambda x: -x[1])[:5])}

    # 4. Desempeño sobre el modelo
    pdfg, ini, fin = pm4py.discover_performance_dfg(log)
    guardar(pm4py.save_vis_performance_dfg, pdfg, ini, fin, str(carpeta / "performance_dfg.png"))
    r["figuras"] = figuras
    return r


def analizar(ruta):
    nombre = Path(ruta).stem
    carpeta = SALIDAS / nombre
    carpeta.mkdir(parents=True, exist_ok=True)
    df, quitados = cargar(ruta)
    print(f"\n== {nombre}: {df['Case_ID'].nunique()} casos cerrados · {len(df)} eventos"
          f"{f' · {quitados} casos incompletos fuera del análisis' if quitados else ''}")

    v = variantes(df)
    print(f"Variantes: {len(v)}")
    for traza, n in v.head(5).items():
        print(f"  {n:4d} casos: {' -> '.join(traza)}")
    normativos = v.get(tuple(ACTIVIDADES), 0)
    print(f"Casos que siguen exactamente el modelo normativo: {normativos} de {v.sum()} ({100 * normativos / v.sum():.1f} %)")

    d, tabla, ciclo_s, uso = desempeno(df)
    vista = tabla.assign(**{c.replace("_s", "_min"): minutos(tabla[c]) for c in ["servicio_medio_s", "espera_media_s", "espera_total_s"]})
    vista = vista[["filas", "casos", "servicio_medio_min", "espera_media_min", "espera_total_min"]].round(3)
    print(vista.to_string())
    cuello = tabla.index[0]
    print(f"Cuello de botella (mayor espera total): {cuello}, {minutos(tabla.loc[cuello, 'espera_total_s']):.1f} min")
    print(f"Tiempo de ciclo: media {minutos(ciclo_s.mean()):.2f} min ({ciclo_s.mean():.1f} s) · máximo {minutos(ciclo_s.max()):.2f} min")
    print("Minutos de servicio por recurso (los 5 más cargados):")
    print(minutos(uso).round(2).head(5).to_string())
    vista.to_csv(carpeta / "desempeno_por_actividad.csv")

    por_caso, por_oleada = pregunta_ficha(d)
    print("Ficha D.13: tiempo hasta la bandeja por oleada de llegada (s)")
    print(por_oleada.round(1).to_string())
    por_oleada.to_csv(carpeta / "tiempo_a_bandeja_por_oleada.csv")

    resumen = {
        "log": str(ruta), "casos": int(df["Case_ID"].nunique()), "eventos": int(len(df)), "casos_quitados": int(quitados),
        "variantes": {" -> ".join(t): int(n) for t, n in v.items()},
        "casos_normativos": int(normativos),
        "desempeno": {a: {k: float(x) for k, x in fila.items()} for a, fila in tabla.iterrows()},
        "cuello_de_botella": cuello, "espera_total_cuello_min": float(minutos(tabla.loc[cuello, "espera_total_s"])),
        "ciclo_medio_min": float(minutos(ciclo_s.mean())), "ciclo_maximo_min": float(minutos(ciclo_s.max())),
        "recurso_mas_cargado": uso.index[0], "uso_recurso_mas_cargado_min": float(minutos(uso.iloc[0])),
        "uso_recursos_min": {k: float(minutos(x)) for k, x in uso.items()},
        "tiempo_a_bandeja_por_oleada": {o: {k: float(x) for k, x in fila.items()} for o, fila in por_oleada.iterrows()},
        "pm4py": None
    }
    if pm4py is None:
        print("PM4Py no está instalado: falta el descubrimiento y la conformidad (pip install -r analisis/requirements.txt).")
    else:
        resumen["pm4py"] = con_pm4py(df, carpeta)
        c = resumen["pm4py"]["conformidad"]
        print(f"Fitness (tokens): {c['fitness_tokens']:.3f} · trazas que ajustan: {c['trazas_que_ajustan_pct']:.1f} %")
        print(f"Fitness (alineamientos): {c['fitness_alineamientos']:.3f} · Precisión: {c['precision']:.3f}")
        print(f"Casos con desvío: {c['casos_con_desvio']} de {c['casos']} · desvíos más frecuentes: {c['desvios_mas_frecuentes']}")
        print(f"Process Tree (Inductive Miner): {resumen['pm4py']['inductive']['arbol']}")
    (SALIDAS / f"resumen_{nombre}.json").write_text(json.dumps(resumen, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    return resumen


def comparar(base, mejorado):
    """Enhancement: el mismo indicador en los dos logs de la misma semilla."""
    def cambio(a, b):
        return f"{100 * (b - a) / a:+.1f} %" if a else "–"
    cuello = base["cuello_de_botella"]
    espera_cuello_mejorado = minutos(mejorado["desempeno"][cuello]["espera_total_s"]) if cuello in mejorado["desempeno"] else 0
    filas = [
        ("Tiempo de ciclo medio (min)", base["ciclo_medio_min"], mejorado["ciclo_medio_min"]),
        (f"Espera total en el cuello de botella, {cuello} (min)", base["espera_total_cuello_min"], espera_cuello_mejorado),
        ("Casos cerrados", base["casos"], mejorado["casos"]),
        ("Uso del recurso más cargado (min)", base["uso_recurso_mas_cargado_min"], mejorado["uso_recurso_mas_cargado_min"]),
    ]
    if base["pm4py"] and mejorado["pm4py"]:
        filas.append(("Fitness contra el modelo normativo (alineamientos)",
                      base["pm4py"]["conformidad"]["fitness_alineamientos"], mejorado["pm4py"]["conformidad"]["fitness_alineamientos"]))
    for oleada in ["Baja", "Media", "Alta"]:
        if oleada in base["tiempo_a_bandeja_por_oleada"] and oleada in mejorado["tiempo_a_bandeja_por_oleada"]:
            filas.append((f"Llegada a bandeja en oleada {oleada} (s, media)",
                          base["tiempo_a_bandeja_por_oleada"][oleada]["llegada_a_bandeja_media_s"],
                          mejorado["tiempo_a_bandeja_por_oleada"][oleada]["llegada_a_bandeja_media_s"]))
    print("\n== Enhancement: log base contra log mejorado (misma semilla)")
    print(f"{'Indicador':58s} {'Base':>10s} {'Mejorado':>10s} {'Cambio':>9s}")
    for nombre, a, b in filas:
        print(f"{nombre:58s} {a:10.2f} {b:10.2f} {cambio(a, b):>9s}")
    tabla = [{"indicador": n, "base": a, "mejorado": b, "cambio": cambio(a, b)} for n, a, b in filas]
    (SALIDAS / "comparacion_base_mejorado.json").write_text(json.dumps(tabla, indent=2, ensure_ascii=False), encoding="utf-8")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    logs = sys.argv[1:] or [str(RAIZ / "logs" / "entrega" / "base.csv")]
    resumenes = [analizar(ruta) for ruta in logs]
    if len(resumenes) == 2:
        comparar(*resumenes)


if __name__ == "__main__":
    main()
