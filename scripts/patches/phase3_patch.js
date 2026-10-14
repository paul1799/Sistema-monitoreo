const fs = require('fs');
const path = require('path');

const dirJsPath = path.join(__dirname, '../public/js/directorio.js');
const uiJsPath = path.join(__dirname, '../public/js/ui.js');

let dirJs = fs.readFileSync(dirJsPath, 'utf8');
let uiJs = fs.readFileSync(uiJsPath, 'utf8');

// 1. Update syncDirectivosFromFicha signature and logic
dirJs = dirJs.replace(
  `export async function syncDirectivosFromFicha(dbNs, fichaPayload, activeState, currentUser) {`,
  `export async function syncDirectivosFromFicha(dbNs, fichaPayload, activeState, currentUser, resoluciones = {}) {`
);

// Ignore 'SOLO_VISITA'
dirJs = dirJs.replace(
  `let activeDirector = existingDirectivos.find(d => d.cargo === 'Director' && d.estado === 'activo');\n\n  if (fichaDir && fichaDir.apellidosNombres) {`,
  `let activeDirector = existingDirectivos.find(d => d.cargo === 'Director' && d.estado === 'activo');\n\n  if (resoluciones.director === 'SOLO_VISITA') {\n    changesSummary.push('Director(a): Ignorado por opción Solo Visita');\n    fichaDir = null;\n  }\n\n  if (fichaDir && fichaDir.apellidosNombres) {`
);

// Handle 'ENCARGATURA' for Director
dirJs = dirJs.replace(
  `        const prevDirectorUpdate = {\n          estado: 'anterior',`,
  `        let newState = 'anterior';\n        if (resoluciones.director === 'ENCARGATURA') {\n          newState = 'activo'; // Mantiene el original activo\n          // No actualizar el estado del original a anterior\n        }\n\n        const prevDirectorUpdate = {\n          estado: newState,`
);

dirJs = dirJs.replace(
  `await dbNs.collection('directivos').doc(activeDirector.id).update(prevDirectorUpdate);`,
  `if (resoluciones.director !== 'ENCARGATURA') {\n          await dbNs.collection('directivos').doc(activeDirector.id).update(prevDirectorUpdate);\n        }`
);

dirJs = dirJs.replace(
  `estado: 'activo',\n          avisoRevision: false,`,
  `estado: resoluciones.director === 'ENCARGATURA' ? 'encargado' : 'activo',\n          avisoRevision: false,`
);

// 2. Add detectDirectivoChanges function to directorio.js
const detectCode = `
export async function detectDirectivoChanges(dbNs, fichaPayload, activeState) {
  const colegioId = fichaPayload.colegioId || '';
  const codigoLocal = cleanTextCode(fichaPayload.ie?.codigoLocal || fichaPayload.codigoModular || fichaPayload.codigoLocal || '');
  const institucion = (fichaPayload.institucion || '').trim();

  let matchedColegio = null;
  if (activeState && activeState.colegios) {
    matchedColegio = activeState.colegios.find(c => 
      (colegioId && c.id === colegioId) ||
      (codigoLocal && c.codigoLocal === codigoLocal) ||
      (institucion && normalizeStr(c.ie) === normalizeStr(institucion))
    );
  }

  const effectiveColId = matchedColegio ? matchedColegio.id : colegioId;
  const effectiveCodLocal = matchedColegio ? cleanTextCode(matchedColegio.codigoLocal) : codigoLocal;

  let fichaDir = null;
  if (fichaPayload.director && (fichaPayload.director.nombres || fichaPayload.director.nombre)) {
    const rawNom = fichaPayload.director.nombres || fichaPayload.director.nombre || '';
    if (!isPlaceholderDirectivo(rawNom)) {
      fichaDir = { apellidosNombres: normalizeStr(rawNom), dni: cleanTextCode(fichaPayload.director.dni || fichaPayload.directorDni || '') };
    }
  } else if (fichaPayload.directorDni || fichaPayload.director) {
    const rawNom = typeof fichaPayload.director === 'string' ? fichaPayload.director : '';
    if (!isPlaceholderDirectivo(rawNom)) {
      fichaDir = { apellidosNombres: normalizeStr(rawNom), dni: cleanTextCode(fichaPayload.directorDni || '') };
    }
  }

  let existingDirectivos = [];
  try {
    const snap = await dbNs.collection('directivos').where('codigoLocal', '==', effectiveCodLocal).get();
    if (!snap.empty) {
      existingDirectivos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {}

  const activeDirector = existingDirectivos.find(d => d.cargo === 'Director' && d.estado === 'activo');
  const conflicts = [];

  if (fichaDir && fichaDir.apellidosNombres && activeDirector) {
    const samePerson = (fichaDir.dni && activeDirector.dni && fichaDir.dni === activeDirector.dni) ||
                       (normalizeStr(fichaDir.apellidosNombres) === normalizeStr(activeDirector.apellidosNombres));
    if (!samePerson) {
      conflicts.push({
        cargo: 'director',
        actualName: activeDirector.apellidosNombres,
        actualDni: activeDirector.dni,
        newName: fichaDir.apellidosNombres,
        newDni: fichaDir.dni
      });
    }
  }
  return conflicts;
}
`;
if (!dirJs.includes('detectDirectivoChanges')) {
  dirJs += detectCode;
}

fs.writeFileSync(dirJsPath, dirJs);

// 3. Update ui.js
uiJs = uiJs.replace(
  `import { syncDirectivosFromFicha, fillIEDataFromDirectorio } from './directorio.js?v=20260924_v5';`,
  `import { syncDirectivosFromFicha, fillIEDataFromDirectorio, detectDirectivoChanges } from './directorio.js?v=20260924_v5';`
);

// ui.js modal logic
const modalCode = `
function promptForDirectivoChanges(conflicts) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay';
    wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    
    let html = \`<div class="panel" style="max-width:500px;width:100%;padding:24px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
      <h3 style="margin-top:0;color:#1e3a8a">⚠️ Cambios Detectados en Directorio</h3>
      <p style="font-size:14px;color:#4b5563">El director ingresado en la ficha no coincide con el director registrado actualmente en el sistema para esta IE.</p>\`;
      
    conflicts.forEach((c, idx) => {
      html += \`
        <div style="background:#f3f4f6;padding:12px;border-radius:8px;margin-bottom:16px;">
          <div style="font-weight:600;margin-bottom:4px">Director Actual (Sistema)</div>
          <div style="font-size:13px;color:#374151">\${c.actualName} (\${c.actualDni || 'Sin DNI'})</div>
          
          <div style="font-weight:600;margin-top:8px;margin-bottom:4px;color:#1e3a8a">Nuevo Director (Ficha)</div>
          <div style="font-size:13px;color:#1e3a8a">\${c.newName} (\${c.newDni || 'Sin DNI'})</div>
          
          <div style="margin-top:12px">
            <label style="display:block;margin-bottom:6px;font-size:13px"><input type="radio" name="res_\${idx}" value="CAMBIO" checked> 1. Cambio de director(a) (Reemplazar titular)</label>
            <label style="display:block;margin-bottom:6px;font-size:13px"><input type="radio" name="res_\${idx}" value="ENCARGATURA"> 2. Encargatura temporal (Mantener titular activo)</label>
            <label style="display:block;margin-bottom:6px;font-size:13px"><input type="radio" name="res_\${idx}" value="SOLO_VISITA"> 3. Solo atendió la visita (No actualizar directorio)</label>
          </div>
        </div>
      \`;
    });
    
    html += \`<div style="display:flex;justify-content:flex-end;gap:10px">
      <button id="btnCancelSync" style="background:#e5e7eb;color:#374151;border:none;padding:8px 16px;border-radius:6px;cursor:pointer">Cancelar Guardado</button>
      <button id="btnConfirmSync" style="background:#1e3a8a;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600">Confirmar y Guardar</button>
    </div></div>\`;
    
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    
    wrap.querySelector('#btnCancelSync').onclick = () => {
      document.body.removeChild(wrap);
      resolve(null); // null means cancel
    };
    
    wrap.querySelector('#btnConfirmSync').onclick = () => {
      const resoluciones = {};
      conflicts.forEach((c, idx) => {
        const val = wrap.querySelector(\`input[name="res_\${idx}"]:checked\`).value;
        resoluciones[c.cargo] = val;
      });
      document.body.removeChild(wrap);
      resolve(resoluciones);
    };
  });
}
`;

// Insert promptForDirectivoChanges before onSubmitRegistro
uiJs = uiJs.replace('export async function onSubmitRegistro(e, activeState, currentUser, dbNs, navigate) {', modalCode + '\nexport async function onSubmitRegistro(e, activeState, currentUser, dbNs, navigate) {');

// Intercept normal save
uiJs = uiJs.replace(
  `if (isEdit) {
      await dbNs.collection('submissions').doc(editingSubmissionId).set(docData);`,
  `const conflicts = await detectDirectivoChanges(dbNs, docData, activeState);
    let resoluciones = {};
    if (conflicts.length > 0) {
      resoluciones = await promptForDirectivoChanges(conflicts);
      if (!resoluciones) {
        showToast('Guardado cancelado por el usuario.');
        if (btn) { btn.disabled = false; btn.innerHTML = isEdit ? 'Actualizar ficha' : 'Guardar ficha'; }
        return;
      }
    }

    if (isEdit) {
      await dbNs.collection('submissions').doc(editingSubmissionId).set(docData);`
);

uiJs = uiJs.replace(
  `const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...docData }, activeState, currentUser);`,
  `const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...docData }, activeState, currentUser, resoluciones);`
);

// Intercept EBR save
uiJs = uiJs.replace(
  `if (isEdit) {
        await dbNs.collection('submissions').doc(editingSubmissionId).set(docData, { merge: true });`,
  `const conflicts = await detectDirectivoChanges(dbNs, docData, activeState);
      let resoluciones = {};
      if (conflicts.length > 0) {
        resoluciones = await promptForDirectivoChanges(conflicts);
        if (!resoluciones) {
          showToast('Guardado cancelado por el usuario.');
          if (btn) { btn.disabled = false; btn.innerHTML = isEdit ? '⏳ Actualizando ficha...' : '⏳ Guardando ficha...'; }
          return;
        }
      }

      if (isEdit) {
        await dbNs.collection('submissions').doc(editingSubmissionId).set(docData, { merge: true });`
);

uiJs = uiJs.replace(
  `const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...docData }, activeState, currentUser);`,
  `const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...docData }, activeState, currentUser, resoluciones);`
);

fs.writeFileSync(uiJsPath, uiJs);
console.log("Patch applied successfully.");
