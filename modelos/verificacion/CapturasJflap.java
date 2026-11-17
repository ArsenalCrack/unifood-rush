// Abre archivos .jff con las clases de JFLAP 7.1, ejecuta Multiple Run con las palabras
// de prueba (los resultados los calcula JFLAP) y guarda una captura de cada ventana.
// Uso: java -cp JFLAP7.1.jar;. CapturasJflap <carpetaSalida> tarea...
//   tarea = grafo|multiple|nodet , archivo.jff , palabras.txt (o -) , nombre.png  (separados por "|")
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.List;
import javax.imageio.ImageIO;
import javax.swing.*;
import javax.swing.table.TableModel;

import automata.Automaton;
import file.XMLCodec;
import gui.action.MultipleSimulateAction;
import gui.action.NondeterminismAction;
import gui.environment.EnvironmentFrame;
import gui.environment.FrameFactory;

public class CapturasJflap {
  static final List<String> informe = new ArrayList<>();

  public static void main(String[] args) throws Exception {
    File salida = new File(args[0]);
    salida.mkdirs();
    // Arranque normal de JFLAP: preferencias y ventana de inicio (la necesita al registrar marcos).
    gui.Main.main(new String[0]);
    Thread.sleep(1500);
    for (int i = 1; i < args.length; i++) {
      String[] t = args[i].split("\\|");
      ejecutar(t[0], new File(t[1]), t[2].equals("-") ? null : new File(t[2]), new File(salida, t[3]));
    }
    for (String linea : informe) System.out.println(linea);
    System.exit(0);
  }

  static int noDeterministas(Automaton a) {
    return automata.NondeterminismDetectorFactory.getDetector(a).getNondeterministicStates(a).length;
  }

  static void ejecutar(String tipo, File jff, File palabras, File png) throws Exception {
    final EnvironmentFrame[] marco = new EnvironmentFrame[1];
    final Automaton[] automata = new Automaton[1];
    SwingUtilities.invokeAndWait(() -> {
      try {
        Serializable s = new XMLCodec().decode(jff, null);
        automata[0] = (Automaton) s;
        informe.add(jff.getName() + ": " + automata[0].getStates().length + " estados, "
            + automata[0].getTransitions().length + " transiciones, "
            + automata[0].getFinalStates().length + " finales, inicial "
            + (automata[0].getInitialState() == null ? "ninguno" : automata[0].getInitialState().getName()));
        if (tipo.equals("nodetconteo")) {
          // El mismo detector que usa Test > Highlight Nondeterminism.
          informe.add("  no deterministas según JFLAP: " + noDeterministas(automata[0]));
          return;
        }
        if (tipo.equals("conteo")) return;
        marco[0] = FrameFactory.createFrame(s);
        marco[0].getEnvironment().setFile(jff);
        marco[0].setSize(1400, 760);
        marco[0].setLocation(30, 30);
        marco[0].setAlwaysOnTop(true);
      } catch (Exception e) { throw new RuntimeException(e); }
    });
    if (tipo.equals("conteo") || tipo.equals("nodetconteo")) return;
    Thread.sleep(900);
    if (tipo.equals("multiple")) multiple(marco[0], automata[0], palabras, jff.getName());
    if (tipo.equals("nodet")) {
      SwingUtilities.invokeAndWait(() -> new NondeterminismAction(automata[0], marco[0].getEnvironment()).actionPerformed(null));
      Thread.sleep(700);
    }
    capturar(marco[0], png);
    SwingUtilities.invokeAndWait(() -> marco[0].dispose());
    Thread.sleep(300);
  }

  static void multiple(EnvironmentFrame f, Automaton a, File palabras, String nombre) throws Exception {
    List<String> lista = Files.readAllLines(palabras.toPath(), StandardCharsets.UTF_8);
    while (!lista.isEmpty() && lista.get(lista.size() - 1).isEmpty() && lista.size() > 1 && lista.get(lista.size() - 2).isEmpty()) lista.remove(lista.size() - 1);
    final JTable[] tabla = new JTable[1];
    SwingUtilities.invokeAndWait(() -> {
      try {
        MultipleSimulateAction accion = new MultipleSimulateAction(a, f.getEnvironment());
        accion.performAction(f);
        Field campo = MultipleSimulateAction.class.getDeclaredField("table");
        campo.setAccessible(true);
        tabla[0] = (JTable) campo.get(accion);
      } catch (Exception e) { throw new RuntimeException(e); }
    });
    Thread.sleep(500);
    // La tabla de Multiple Run se comparte entre autómatas: primero se limpia con su botón Clear.
    SwingUtilities.invokeAndWait(() -> {
      AbstractButton limpiar = buscar(f.getContentPane(), "Clear");
      if (limpiar != null) limpiar.doClick();
    });
    Thread.sleep(300);
    SwingUtilities.invokeAndWait(() -> {
      TableModel m = tabla[0].getModel();
      int fila = 0;
      for (int i = 0; i < lista.size(); i++) {
        String w = lista.get(i);
        if (w.isEmpty()) {
          if (i > 0) continue; // la palabra vacía solo se declara en la primera línea
          // Como un usuario: seleccionar la fila y pulsar Enter Lambda.
          tabla[0].changeSelection(fila, 0, false, false);
          AbstractButton lambda = buscar(f.getContentPane(), "Enter Lambda");
          if (lambda != null) lambda.doClick();
          fila++;
          continue;
        }
        m.setValueAt(w, fila++, 0);
      }
      StringBuilder antes = new StringBuilder("  tabla antes de correr:");
      for (int r = 0; r < m.getRowCount(); r++) antes.append(" [").append(escapar(String.valueOf(m.getValueAt(r, 0)))).append("]");
      informe.add(antes.toString());
      // Más espacio para el grafo del autómata en la división de Multiple Run.
      JSplitPane division = buscarDivision(f.getContentPane());
      if (division != null) division.setDividerLocation(0.6);
    });
    Thread.sleep(300);
    SwingUtilities.invokeAndWait(() -> {
      AbstractButton correr = buscar(f.getContentPane(), "Run Inputs");
      if (correr == null) throw new RuntimeException("No encontré el botón Run Inputs");
      correr.doClick();
    });
    Thread.sleep(900);
    SwingUtilities.invokeAndWait(() -> {
      TableModel m = tabla[0].getModel();
      StringBuilder sb = new StringBuilder(nombre + ":");
      for (int r = 0; r < m.getRowCount(); r++) {
        Object entrada = m.getValueAt(r, 0);
        Object resultado = m.getValueAt(r, m.getColumnCount() - 1);
        if ((entrada == null || entrada.toString().isEmpty()) && (resultado == null || resultado.toString().isEmpty())) continue;
        sb.append(" [").append(escapar(String.valueOf(entrada))).append(" -> ").append(resultado).append("]");
      }
      informe.add(sb.toString());
    });
  }

  static String escapar(String s) {
    StringBuilder b = new StringBuilder();
    for (char ch : s.toCharArray()) b.append(ch < 128 ? String.valueOf(ch) : String.format("\\u%04x", (int) ch));
    return b.toString();
  }

  static JSplitPane buscarDivision(Container c) {
    for (Component hijo : c.getComponents()) {
      if (hijo instanceof JSplitPane && hijo.isShowing()) return (JSplitPane) hijo;
      if (hijo instanceof Container) {
        JSplitPane d = buscarDivision((Container) hijo);
        if (d != null) return d;
      }
    }
    return null;
  }

  static AbstractButton buscar(Container c, String texto) {
    for (Component hijo : c.getComponents()) {
      if (hijo instanceof AbstractButton && texto.equals(((AbstractButton) hijo).getText())) return (AbstractButton) hijo;
      if (hijo instanceof Container) {
        AbstractButton b = buscar((Container) hijo, texto);
        if (b != null) return b;
      }
    }
    return null;
  }

  // Captura de pantalla de la ventana (incluye la barra de título de Windows).
  static void capturar(JFrame f, File png) throws Exception {
    SwingUtilities.invokeAndWait(() -> { f.toFront(); f.repaint(); });
    Thread.sleep(700);
    // Se pinta la ventana de JFLAP en una imagen (sin leer la pantalla): funciona aunque la
    // pantalla esté bloqueada y nunca incluye otras ventanas.
    JRootPane raiz = f.getRootPane();
    BufferedImage img = new BufferedImage(raiz.getWidth(), raiz.getHeight(), BufferedImage.TYPE_INT_RGB);
    SwingUtilities.invokeAndWait(() -> { Graphics2D g = img.createGraphics(); raiz.printAll(g); g.dispose(); });
    ImageIO.write(img, "png", png);
    informe.add("captura: " + png.getName() + " " + img.getWidth() + "x" + img.getHeight());
  }
}
