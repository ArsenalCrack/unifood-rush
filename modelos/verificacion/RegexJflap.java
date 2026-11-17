// Expresión regular de reparación -> NFA -> DFA -> DFA mínimo con los asistentes de JFLAP 7.1.
// Pulsa los mismos botones que un usuario, contesta los avisos y captura cada etapa.
// Uso: java -cp JFLAP7.1.jar;. RegexJflap <reparacion_regex.jff> <carpetaSalida>
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.*;
import java.util.List;
import javax.imageio.ImageIO;
import javax.swing.*;
import javax.swing.tree.TreePath;

import automata.Automaton;
import automata.fsa.FiniteStateAutomaton;
import file.XMLCodec;
import gui.action.MinimizeTreeAction;
import gui.action.NFAToDFAAction;
import gui.action.REToFSAAction;
import gui.environment.EnvironmentFrame;
import gui.environment.FrameFactory;
import gui.environment.RegularEnvironment;

public class RegexJflap {
  static File salida;

  public static void main(String[] args) throws Exception {
    File re = new File(args[0]);
    salida = new File(args[1]);
    gui.Main.main(new String[0]);
    Thread.sleep(1500);

    // 1) Expresión regular -> NFA (Convert > Convert to NFA, Do All, Export).
    EnvironmentFrame fRe = abrir(re);
    enEdt(() -> new REToFSAAction((RegularEnvironment) fRe.getEnvironment()).actionPerformed(null));
    Thread.sleep(800);
    pulsar(fRe, "Do All");
    capturar(fRe, "jflap_regex_1_a_nfa.png");
    Set<Frame> antes = marcos();
    pulsar(fRe, "Export");
    EnvironmentFrame fNfa = nuevoMarco(antes);
    contar("NFA exportado", fNfa);
    enEdt(() -> fRe.dispose());

    // 2) NFA -> DFA (Convert > Convert to DFA, Complete, Done?).
    enEdt(() -> new NFAToDFAAction((FiniteStateAutomaton) fNfa.getEnvironment().getObject(), fNfa.getEnvironment()).actionPerformed(null));
    Thread.sleep(800);
    pulsar(fNfa, "Complete");
    capturar(fNfa, "jflap_regex_2_dfa.png");
    antes = marcos();
    pulsar(fNfa, "Done?");
    EnvironmentFrame fDfa = nuevoMarco(antes);
    contar("DFA exportado", fDfa);
    enEdt(() -> fNfa.dispose());

    // 3) DFA -> DFA mínimo (Convert > Minimize DFA, Complete Subtree, Finish, Complete, Done?).
    enEdt(() -> new MinimizeTreeAction((FiniteStateAutomaton) fDfa.getEnvironment().getObject(), fDfa.getEnvironment()).actionPerformed(null));
    Thread.sleep(900);
    enEdt(() -> {
      JTree arbol = buscarTipo(fDfa.getContentPane(), JTree.class);
      if (arbol != null) arbol.setSelectionPath(new TreePath(arbol.getModel().getRoot()));
    });
    capturar(fDfa, "jflap_regex_3_arbol.png");

    // El DFA mínimo con el mismo algoritmo del asistente (automata.fsa.Minimizer de JFLAP).
    final EnvironmentFrame[] fMin = new EnvironmentFrame[1];
    enEdt(() -> {
      automata.fsa.Minimizer mz = new automata.fsa.Minimizer();
      mz.initializeMinimizer();
      Automaton completo = mz.getMinimizeableAutomaton((Automaton) fDfa.getEnvironment().getObject());
      System.out.println("DFA completo con trampa: " + completo.getStates().length + " estados");
      javax.swing.tree.DefaultTreeModel arbol = mz.getDistinguishableGroupsTree(completo);
      FiniteStateAutomaton minimo = mz.getMinimumDfa(completo, arbol);
      // Solo la posición de los estados: en fila, en el orden en que se recorren desde q0.
      java.util.List<automata.State> orden = new java.util.ArrayList<>();
      java.util.ArrayDeque<automata.State> cola = new java.util.ArrayDeque<>();
      cola.add(minimo.getInitialState());
      while (!cola.isEmpty()) {
        automata.State q = cola.poll();
        if (orden.contains(q)) continue;
        orden.add(q);
        for (automata.Transition t : minimo.getTransitionsFromState(q)) if (!orden.contains(t.getToState())) cola.add(t.getToState());
      }
      for (automata.State q : minimo.getStates()) if (!orden.contains(q)) orden.add(q);
      for (int i = 0; i < orden.size(); i++) orden.get(i).setPoint(new Point(90 + i * 175, 260));
      fMin[0] = FrameFactory.createFrame(minimo);
      preparar(fMin[0]);
    });
    Thread.sleep(1200);
    contar("DFA mínimo", fMin[0]);
    capturar(fMin[0], "jflap_regex_4_dfa_minimo.png");
    System.exit(0);
  }

  static EnvironmentFrame abrir(File f) throws Exception {
    final EnvironmentFrame[] m = new EnvironmentFrame[1];
    enEdt(() -> {
      try {
        m[0] = FrameFactory.createFrame(new XMLCodec().decode(f, null));
        m[0].getEnvironment().setFile(f);
        preparar(m[0]);
      } catch (Exception e) { throw new RuntimeException(e); }
    });
    Thread.sleep(900);
    return m[0];
  }

  static void preparar(JFrame m) { m.setSize(1400, 760); m.setLocation(30, 30); m.setAlwaysOnTop(true); }

  static Set<Frame> marcos() { return new HashSet<>(Arrays.asList(Frame.getFrames())); }

  static EnvironmentFrame nuevoMarco(Set<Frame> antes) throws Exception {
    for (int i = 0; i < 40; i++) {
      cerrarDialogos();
      for (Frame f : Frame.getFrames()) {
        if (!antes.contains(f) && f instanceof EnvironmentFrame && f.isShowing()) {
          enEdt(() -> preparar((JFrame) f));
          Thread.sleep(700);
          return (EnvironmentFrame) f;
        }
      }
      Thread.sleep(150);
    }
    throw new RuntimeException("No apareció la ventana nueva");
  }

  static void contar(String etapa, EnvironmentFrame f) {
    Automaton a = (Automaton) f.getEnvironment().getObject();
    System.out.println(etapa + ": " + a.getStates().length + " estados, " + a.getTransitions().length + " transiciones, "
        + a.getFinalStates().length + " final(es)");
  }

  // Pulsa (sin bloquear) el botón visible con ese texto y contesta los avisos que abra.
  static void pulsar(Window ventana, String texto) throws Exception {
    final AbstractButton[] b = new AbstractButton[1];
    for (int i = 0; i < 30 && b[0] == null; i++) {
      enEdt(() -> { b[0] = buscar(ventana, texto); });
      if (b[0] == null) { cerrarDialogos(); Thread.sleep(150); }
    }
    if (b[0] == null) throw new RuntimeException("No encontré el botón " + texto);
    SwingUtilities.invokeLater(() -> b[0].doClick());
    Thread.sleep(900);
    cerrarDialogos();
    System.out.println("pulsado: " + texto);
  }

  // Cierra los avisos modales de JFLAP con su botón Sí / OK y muestra su mensaje.
  static void cerrarDialogos() throws Exception {
    for (int vuelta = 0; vuelta < 5; vuelta++) {
      boolean hubo = false;
      for (Window w : Window.getWindows()) {
        if (w instanceof JDialog && w.isShowing()) {
          JOptionPane op = buscarTipo((Container) w, JOptionPane.class);
          if (op != null) System.out.println("  aviso de JFLAP: " + String.valueOf(op.getMessage()).replace('\n', ' '));
          AbstractButton ok = null;
          for (String t : new String[] {"Yes", "OK", "Sí", "Aceptar"}) if (ok == null) ok = buscar(w, t);
          if (ok != null) {
            AbstractButton boton = ok;
            SwingUtilities.invokeLater(() -> boton.doClick());
            hubo = true;
          }
        }
      }
      if (!hubo) return;
      Thread.sleep(500);
    }
  }

  static AbstractButton buscar(Container c, String texto) {
    for (Component hijo : c.getComponents()) {
      if (hijo instanceof AbstractButton && hijo.isShowing() && texto.equals(((AbstractButton) hijo).getText())) return (AbstractButton) hijo;
      if (hijo instanceof Container) {
        AbstractButton b = buscar((Container) hijo, texto);
        if (b != null) return b;
      }
    }
    return null;
  }

  @SuppressWarnings("unchecked")
  static <T> T buscarTipo(Container c, Class<T> tipo) {
    for (Component hijo : c.getComponents()) {
      if (tipo.isInstance(hijo)) return (T) hijo;
      if (hijo instanceof Container) {
        T t = buscarTipo((Container) hijo, tipo);
        if (t != null) return t;
      }
    }
    return null;
  }

  static void enEdt(Runnable r) throws Exception { SwingUtilities.invokeAndWait(r); }

  static void capturar(JFrame f, String nombre) throws Exception {
    enEdt(() -> { f.toFront(); f.repaint(); });
    Thread.sleep(800);
    Rectangle r = f.getBounds();
    BufferedImage img = new Robot().createScreenCapture(new Rectangle(r.x + 7, r.y, r.width - 14, r.height - 7));
    ImageIO.write(img, "png", new File(salida, nombre));
    System.out.println("captura: " + nombre);
  }
}
