const fs = require('fs');

const path = 'public/js/ui.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /async function backfillSubmissionsUgelRed\(dbNs, state\) \{([\s\S]*?)\n\}\n/m;

const replacement = `async function backfillSubmissionsUgelRed(dbNs, state) {
  const colegios = state.colegios || [];
  const submissions = state.submissions || [];
  if (!submissions.length) return 0;

  const colMap = new Map();
  colegios.forEach(c => {
    if (c.ie) colMap.set(normalizeText(c.ie), c);
    if (c.nombre) colMap.set(normalizeText(c.nombre), c);
  });

  const batchSize = 100;
  let updatedCount = 0;
  let currentBatch = dbNs.batch();
  let opsInBatch = 0;

  for (const sub of submissions) {
    let needUpdate = false;
    let newUgel = sub.ugel;
    let newRed = sub.red;
    let newCod = sub.codigoModular;

    let matched = null;
    if (sub.colegioId) {
      matched = colegios.find(c => c.id === sub.colegioId);
    }
    if (!matched && sub.institucion) {
      matched = colMap.get(normalizeText(sub.institucion));
    }

    if (matched) {
      let padronUgel = matched.dependencia || 'UGEL 03';
      if (padronUgel.toLowerCase().includes('sector educ')) padronUgel = 'UGEL 03';
      
      const padronRed = matched.rei || 'No aplica';
      const padronCod = matched.codigoLocal || matched.codigoModular || '';

      if (newUgel !== padronUgel) { newUgel = padronUgel; needUpdate = true; }
      if (newRed !== padronRed) { newRed = padronRed; needUpdate = true; }
      if (padronCod && newCod !== padronCod) { newCod = padronCod; needUpdate = true; }
    } else {
      if (!newUgel || newUgel === '—' || newUgel.toLowerCase().includes('sector educ')) {
        newUgel = 'UGEL 03';
        needUpdate = true;
      }
      if (!newRed || newRed === '—') {
        newRed = 'No aplica';
        needUpdate = true;
      }
    }

    if (needUpdate) {
      const docRef = dbNs.collection('submissions').doc(sub.id);
      currentBatch.update(docRef, {
        ugel: newUgel,
        red: newRed,
        codigoModular: formatCodigoModular(newCod || ''),
        updatedAt: Date.now()
      });
      opsInBatch++;
      updatedCount++;

      if (opsInBatch >= batchSize) {
        await currentBatch.commit();
        currentBatch = dbNs.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) {
    await currentBatch.commit();
  }

  return updatedCount;
}
`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync(path, code, 'utf8');
  console.log('Replaced successfully');
} else {
  console.error('Could not find function body');
}
