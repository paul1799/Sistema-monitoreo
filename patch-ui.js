const fs = require('fs');
const content = fs.readFileSync('public/js/ui.js', 'utf8');

const targetStr = `
    if (hint) {
      hint.style.display = 'block';
      hint.textContent = '✓ Vinculada al padrón' +
        (c.rei ? ' · ' + c.rei : '') +
        (c.dependencia ? ' · ' + c.dependencia : ' · UGEL 03') +
        (c.distrito ? ' · ' + c.distrito : '') +
        (c.director && c.director.nombre ? ' · Dir: ' + c.director.nombre : '') + '.';
    }
  };
`;

const replaceStr = `
    if (hint) {
      hint.style.display = 'block';
      hint.textContent = '✓ Vinculada al padrón' +
        (c.rei ? ' · ' + c.rei : '') +
        (c.dependencia ? ' · ' + c.dependencia : ' · UGEL 03') +
        (c.distrito ? ' · ' + c.distrito : '') +
        (c.director && c.director.nombre ? ' · Dir: ' + c.director.nombre : '') + '.';
    }
    
    renderPrevCompromisos(c.ie);
  };

  const renderPrevCompromisos = (ieName) => {
    const el = document.getElementById('prevCompList');
    if (!el) return;
    const allC = state.compromisos || [];
    const pending = allC.filter(c => c.institucion === ieName && c.estado !== 'Cumplido' && c.estado !== 'Anulado');
    
    if (pending.length === 0) {
      el.innerHTML = '<p class="helpText" style="margin-top:0">No hay compromisos pendientes anteriores para esta institución.</p>';
      return;
    }
    
    el.innerHTML = '<ul style="padding-left:18px;margin-top:0">' + pending.map(c => 
      '<li style="margin-bottom:8px;font-size:13.5px">' +
      '<strong>' + esc(c.responsable || 'Responsable') + ':</strong> ' + esc(c.texto) + 
      ' <br><span style="color:var(--ink-soft);font-size:12px">Plazo: ' + (c.plazo ? fmtDate(c.plazo) : 'N/A') + '</span>' +
      ' <button type="button" class="btn btn-sm secondary btnClosePrevComp" style="padding:2px 6px;margin-left:8px" data-cid="' + esc(c.id) + '">Marcar Cumplido ✓</button>' +
      '</li>'
    ).join('') + '</ul>';

    el.querySelectorAll('.btnClosePrevComp').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Marcar este compromiso previo como cumplido?')) return;
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        try {
          const batch = dbNs.batch();
          batch.update(dbNs.collection('compromisos').doc(btn.dataset.cid), { estado: 'Cumplido', updatedAt: Date.now() });
          await batch.commit();
          showToast('Compromiso previo marcado como cumplido.');
          renderPrevCompromisos(ieName);
        } catch (err) {
          console.error(err);
          showToast('Error al actualizar el compromiso.');
          btn.disabled = false;
          btn.textContent = 'Cumplido ✓';
        }
      });
    });
  };
`;

// Normalizar saltos de línea para el reemplazo seguro
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetStr.replace(/\r\n/g, '\n').trim();
const normalizedReplace = replaceStr.replace(/\r\n/g, '\n').trim();

if (normalizedContent.includes(normalizedTarget)) {
    const finalContent = normalizedContent.replace(normalizedTarget, normalizedReplace);
    fs.writeFileSync('public/js/ui.js', finalContent, 'utf8');
    console.log('SUCCESS');
} else {
    console.error('Target string not found');
}
