// Abre las redes de modelos/petri/ en PIPE 4.3, ejecuta sus módulos de análisis (los mismos
// botones que un usuario), dispara transiciones en modo animación y captura cada ventana.
// Uso (desde la carpeta Pipe de PIPE 4.3):  java -cp out;.;lib/* PipeCapturas <carpetaPetri> <carpetaSalida>
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.*;
import javax.imageio.ImageIO;
import javax.swing.*;
import javax.swing.text.JTextComponent;

import pipe.gui.ApplicationSettings;
import pipe.modules.interfaces.IModule;
import pipe.views.PipeApplicationView;
import pipe.views.TransitionView;

public class PipeCapturas {
  static File petri, salida;
  static PipeApplicationView vista;
  static int altoDialogo = 720; // alto de la ventana del módulo; más alto para ver las matrices completas

  public static void main(String[] args) throws Exception {
    petri = new File(args[0]);
    salida = new File(args[1]);
    Pipe.main(new String[0]);
    Thread.sleep(4000);
    vista = ApplicationSettings.getApplicationView();
    enEdt(() -> { vista.setSize(1400, 820); vista.setLocation(20, 20); vista.setExtendedState(JFrame.NORMAL); });
    Thread.sleep(800);
    if (args.length > 2 && args[2].equals("vistas")) {
      // Solo las capturas de la ventana principal (red y animación).
      abrir("monitor_M0.xml");
      capturar(vista, "pipe_red_monitor_M0.png");
      modulo(new pipe.modules.reachability.ReachabilityGraphGenerator(), "Reachability/Coverability Graph", "Generate Reachability/Coverability Graph", "pipe_arbol_monitor_M0.png");
      abrir("ficha_escenarioA.xml");
      animar(new String[] {"t_servir", "t_sentarse", "t_terminar"}, "pipe_animacion_normal.png");
      abrir("ficha_escenarioC.xml");
      capturar(vista, "pipe_red_escenarioC.png");
      animar(new String[] {"t_servir", "t_terminar", "t_sentarse"}, "pipe_deadlock_animacion.png");
      System.exit(0);
    }

    if (args.length > 2 && args[2].equals("incidencia")) {
      // I+, I-, C = I+ - I- y el marcado completos, en una ventana alta (sin barra de desplazamiento).
      altoDialogo = 2300;
      abrir("ficha_M0.xml");
      modulo(new pipe.modules.matrices.Matrices(), "Incidence & Marking", "Calculate", "pipe_incidencia_M0.png");
      abrir("monitor_M0.xml");
      modulo(new pipe.modules.matrices.Matrices(), "Incidence & Marking", "Calculate", "pipe_incidencia_monitor.png");
      System.exit(0);
    }
    if (args.length > 2 && args[2].equals("monitor")) {
      // La red con monitores sola, en una sesión nueva de PIPE: incidencia e invariantes.
      abrir("monitor_M0.xml");
      modulo(new pipe.modules.matrices.Matrices(), "Incidence & Marking", "Calculate", "pipe_incidencia_monitor.png");
      modulo(new pipe.modules.invariantAnalysis.InvariantAnalysis(), "Invariant Analysis", "Analyse", "pipe_invariantes_monitor_sesion_nueva.png");
      abrir("ficha_escenarioC.xml");
      capturar(vista, "pipe_red_escenarioC.png");
      System.exit(0);
    }

    // Red de la ficha desde M0: la red, incidencia, invariantes, espacio de estados y grafo.
    abrir("ficha_M0.xml");
    capturar(vista, "pipe_red_ficha_M0.png");
    modulo(new pipe.modules.matrices.Matrices(), "Incidence & Marking", "Calculate", "pipe_incidencia_M0.png");
    modulo(new pipe.modules.invariantAnalysis.InvariantAnalysis(), "Invariant Analysis", "Analyse", "pipe_invariantes_M0.png");
    modulo(new pipe.modules.stateSpace.StateSpace(), "State Space Analysis", "Analyse", "pipe_estados_M0.png");
    modulo(new pipe.modules.reachability.ReachabilityGraphGenerator(), "Reachability/Coverability Graph", "Generate Reachability/Coverability Graph", "pipe_arbol_M0.png");
    cerrarPestana();

    // Red con la regla de prevención (monitores).
    abrir("monitor_M0.xml");
    capturar(vista, "pipe_red_monitor_M0.png");
    modulo(new pipe.modules.invariantAnalysis.InvariantAnalysis(), "Invariant Analysis", "Analyse", "pipe_invariantes_monitor.png");
    modulo(new pipe.modules.stateSpace.StateSpace(), "State Space Analysis", "Analyse", "pipe_estados_monitor_M0.png");
    modulo(new pipe.modules.reachability.ReachabilityGraphGenerator(), "Reachability/Coverability Graph", "Generate Reachability/Coverability Graph", "pipe_arbol_monitor_M0.png");
    cerrarPestana();

    // Escenario A: juego de tokens de la operación normal (Animation mode).
    abrir("ficha_escenarioA.xml");
    animar(new String[] {"t_servir", "t_sentarse", "t_terminar"}, "pipe_animacion_normal.png");
    cerrarPestana();

    // Escenario B, con y sin monitores: deadlock y camino más corto.
    abrir("ficha_escenarioB.xml");
    modulo(new pipe.modules.stateSpace.StateSpace(), "State Space Analysis", "Analyse", "pipe_estados_B.png");
    cerrarPestana();
    abrir("monitor_escenarioB.xml");
    modulo(new pipe.modules.stateSpace.StateSpace(), "State Space Analysis", "Analyse", "pipe_estados_monitor_B.png");
    cerrarPestana();

    // Escenario C: a 3 disparos del deadlock de la ficha; se provoca en Animation mode.
    abrir("ficha_escenarioC.xml");
    modulo(new pipe.modules.stateSpace.StateSpace(), "State Space Analysis", "Analyse", "pipe_estados_C.png");
    animar(new String[] {"t_servir", "t_terminar", "t_sentarse"}, "pipe_deadlock_animacion.png");
    cerrarPestana();
    abrir("monitor_escenarioC.xml");
    modulo(new pipe.modules.stateSpace.StateSpace(), "State Space Analysis", "Analyse", "pipe_estados_monitor_C.png");
    cerrarPestana();
    System.exit(0);
  }

  static void abrir(String nombre) throws Exception {
    File f = new File(petri, nombre);
    enEdt(() -> vista.createNewTab(f, false));
    Thread.sleep(1500);
    // La pestaña nueva debe quedar visible (y ser la red actual de los módulos).
    enEdt(() -> { JTabbedPane p = vista._frameForPetriNetTabs; p.setSelectedIndex(p.getTabCount() - 1); });
    Thread.sleep(800);
    System.out.println("== red abierta: " + nombre);
  }

  static void cerrarPestana() throws Exception {
    // PIPE 4.3 no quita la pestaña de la vista con removeTab: se deja abierta y la siguiente red
    // queda seleccionada al abrirse (ver abrir()).
  }

  // Abre el módulo, pulsa su botón, imprime el texto del resultado y captura su ventana.
  static void modulo(IModule m, String titulo, String boton, String png) throws Exception {
    Set<Window> antes = new HashSet<>(Arrays.asList(Window.getWindows()));
    SwingUtilities.invokeLater(m::start);
    Window dialogo = esperarVentana(antes, titulo);
    enEdt(() -> { dialogo.setSize(Math.max(dialogo.getWidth(), 980), Math.max(dialogo.getHeight(), altoDialogo)); dialogo.setLocation(60, 50); dialogo.validate(); });
    Thread.sleep(500);
    AbstractButton b = buscarBoton(dialogo, boton);
    if (b == null) throw new RuntimeException("Sin botón " + boton + " en " + titulo);
    Set<Window> antesDeCalcular = new HashSet<>(Arrays.asList(Window.getWindows()));
    SwingUtilities.invokeLater(b::doClick);
    Thread.sleep(3500);
    // El grafo de alcanzabilidad se abre en una ventana aparte.
    Window grafo = null;
    for (Window w : Window.getWindows()) if (!antesDeCalcular.contains(w) && w.isShowing()) grafo = w;
    System.out.println("  " + titulo + ": " + textoResultados(dialogo));
    capturar(dialogo, png);
    if (grafo != null) {
      Window g = grafo;
      enEdt(() -> { g.setSize(1100, 760); g.setLocation(80, 40); g.validate(); });
      Thread.sleep(1500);
      capturar(g, png.replace(".png", "_grafo.png"));
      enEdt(g::dispose);
    }
    enEdt(dialogo::dispose);
    Thread.sleep(400);
  }

  static void animar(String[] secuencia, String png) throws Exception {
    enEdt(() -> vista.setAnimationMode(true));
    Thread.sleep(800);
    for (String nombre : secuencia) {
      enEdt(() -> {
        for (TransitionView t : vista.getCurrentPetriNetView().getTransitionViews()) {
          if (nombre.equals(t.getName())) { vista.getAnimator().fireTransition(t); return; }
        }
        throw new RuntimeException("No existe la transición " + nombre);
      });
      Thread.sleep(700);
      System.out.println("  disparada: " + nombre);
    }
    enEdt(() -> {
      StringBuilder hab = new StringBuilder();
      for (TransitionView t : vista.getCurrentPetriNetView().getEnabledTransitions()) hab.append(t.getName()).append(' ');
      System.out.println("  habilitadas después: " + (hab.length() == 0 ? "ninguna" : hab.toString()));
    });
    capturar(vista, png);
    enEdt(() -> vista.setAnimationMode(false));
    Thread.sleep(500);
  }

  static Window esperarVentana(Set<Window> antes, String titulo) throws Exception {
    for (int i = 0; i < 60; i++) {
      for (Window w : Window.getWindows()) {
        if (!antes.contains(w) && w.isShowing()) return w;
        if (w instanceof Dialog && w.isShowing() && titulo.equals(((Dialog) w).getTitle())) return w;
      }
      Thread.sleep(150);
    }
    throw new RuntimeException("No se abrió " + titulo);
  }

  static String textoResultados(Container c) {
    StringBuilder sb = new StringBuilder();
    juntarTexto(c, sb);
    return sb.toString().replaceAll("<[^>]+>", " ").replaceAll("&nbsp;", " ").replaceAll("\\s+", " ").trim();
  }

  static void juntarTexto(Container c, StringBuilder sb) {
    for (Component h : c.getComponents()) {
      if (h instanceof JEditorPane) sb.append(((JTextComponent) h).getText()).append(' ');
      if (h instanceof Container) juntarTexto((Container) h, sb);
    }
  }

  static AbstractButton buscarBoton(Container c, String texto) {
    for (Component h : c.getComponents()) {
      if (h instanceof AbstractButton && texto.equals(((AbstractButton) h).getText())) return (AbstractButton) h;
      if (h instanceof Container) {
        AbstractButton b = buscarBoton((Container) h, texto);
        if (b != null) return b;
      }
    }
    return null;
  }

  static void enEdt(Runnable r) throws Exception { SwingUtilities.invokeAndWait(r); }

  // Dibuja la ventana de Java en una imagen (sin la barra de título de Windows). No lee la
  // pantalla, así que ninguna otra ventana del escritorio puede quedar en la captura.
  static void capturar(Window w, String nombre) throws Exception {
    enEdt(() -> { w.validate(); w.repaint(); });
    Thread.sleep(900);
    final BufferedImage[] img = new BufferedImage[1];
    enEdt(() -> {
      JRootPane raiz = ((RootPaneContainer) w).getRootPane();
      img[0] = new BufferedImage(raiz.getWidth(), raiz.getHeight(), BufferedImage.TYPE_INT_RGB);
      Graphics2D g = img[0].createGraphics();
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
      raiz.printAll(g);
      g.dispose();
    });
    ImageIO.write(img[0], "png", new File(salida, nombre));
    System.out.println("  captura: " + nombre + " " + img[0].getWidth() + "x" + img[0].getHeight());
  }
}
