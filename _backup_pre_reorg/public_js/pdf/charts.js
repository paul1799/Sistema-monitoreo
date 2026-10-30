/* =========================================================================
   pdf/charts.js — Utilidades visuales de gráficos vectoriales (Donut Chart)
   y formateadores de Red Educativa (REI) para PDFs en el Sistema de Monitoreo.
   ========================================================================= */

/**
 * Normaliza y formatea el valor de RED / REI anteponiendo la nomenclatura oficial "REI XX".
 * Ejemplos: "01" -> "REI 01", "RED 04" -> "REI 04", "REI 05" -> "REI 05", null/vacío -> "—"
 */
export function formatRei(redVal) {
  if (!redVal || redVal === '—' || redVal === 'No aplica' || redVal === 'null' || redVal === 'undefined') {
    return '—';
  }
  const clean = String(redVal).trim();
  if (!clean || clean === '-') return '—';
  const upper = clean.toUpperCase();
  if (upper.startsWith('REI ') || upper.startsWith('RED ')) {
    return upper.replace(/^RED\s+/, 'REI ');
  }
  if (/^\d+$/.test(clean)) {
    return `REI ${clean.padStart(2, '0')}`;
  }
  return `REI ${clean}`;
}

/**
 * Dibuja un gráfico de dona vectorial nativo en jsPDF con leyenda a la derecha
 * y total centrado ("12 fichas"). Si todas las fichas están en una categoría,
 * dibuja el anillo completo sin errores por segmentos en 0.
 */
export function drawPdfDonutChart(doc, cx, cy, outerRadius, innerRadius, segments, totalLabel = '', subLabel = 'fichas') {
  const total = segments.reduce((sum, s) => sum + (Number(s.val) || 0), 0);
  const numFontSize = outerRadius >= 40 ? 22 : 13;
  const subFontSize = outerRadius >= 40 ? 8.5 : 7;
  const yNumOffset = outerRadius >= 40 ? 3 : 1;
  const ySubOffset = outerRadius >= 40 ? 12 : 9;

  if (total === 0) {
    // Anillo vacío en gris claro
    doc.setFillColor(229, 231, 235); // #E5E7EB
    doc.circle(cx, cy, outerRadius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(numFontSize);
    doc.setTextColor(15, 23, 42);
    doc.text('0', cx, cy - yNumOffset, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subFontSize);
    doc.setTextColor(100, 116, 139);
    doc.text(subLabel, cx, cy + ySubOffset, { align: 'center' });
    return;
  }

  // Verificar si un solo segmento concentra el 100%
  const single100 = segments.find(s => s.val === total);
  if (single100) {
    doc.setFillColor(single100.color[0], single100.color[1], single100.color[2]);
    doc.circle(cx, cy, outerRadius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
  } else {
    // Dibujar sectores mediante abanico poligonal de triángulos
    let currentAngle = -Math.PI / 2; // Iniciar arriba (12 en punto)
    const step = Math.PI / 45; // paso de 4 grados (suave y nítido)

    segments.forEach(seg => {
      const val = Number(seg.val) || 0;
      if (val <= 0) return;

      const span = (val / total) * 2 * Math.PI;
      const endAngle = currentAngle + span;
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);

      let a = currentAngle;
      while (a < endAngle) {
        const nextA = Math.min(a + step, endAngle);
        const x1 = cx + outerRadius * Math.cos(a);
        const y1 = cy + outerRadius * Math.sin(a);
        const x2 = cx + outerRadius * Math.cos(nextA);
        const y2 = cy + outerRadius * Math.sin(nextA);
        doc.triangle(cx, cy, x1, y1, x2, y2, 'F');
        a = nextA;
      }
      currentAngle = endAngle;
    });

    // Recorte interior blanco para formar el anillo de la dona
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
  }

  // Texto centrado: Total y etiqueta ("12 fichas")
  const displayTotal = totalLabel !== '' ? String(totalLabel) : String(total);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(numFontSize);
  doc.setTextColor(15, 23, 42);
  doc.text(displayTotal, cx, cy - 1 - (outerRadius >= 40 ? 2 : 0), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(subFontSize);
  doc.setTextColor(100, 116, 139);
  doc.text(subLabel, cx, cy + ySubOffset, { align: 'center' });
}
