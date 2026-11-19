$uPath = "public\js\ui\usuarios.js"
$raw = [System.IO.File]::ReadAllText((Resolve-Path $uPath).Path, [System.Text.Encoding]::UTF8)

# 1. Fix Mojibake in row button
$raw = $raw -replace 'title="Modificar REI\(s\) y Modalidades asignadas">[^<]*Jurisdicci[^<]*</button>', 'title="Modificar REI(s) y Modalidades asignadas">✏️ Jurisdicción</button>'

# 2. Fix Mojibake in openEditUserJurisdictionModal
$raw = $raw -replace 'âœ ï¸ ', '✏️'
$raw = $raw -replace 'JurisdicciÃ³n', 'Jurisdicción'
$raw = $raw -replace 'AsignaciÃ³n', 'Asignación'
$raw = $raw -replace 'Ã—', '×'
$raw = $raw -replace 'mÃ¡s', 'más'
$raw = $raw -replace 'visualizarÃ¡', 'visualizará'
$raw = $raw -replace 'MÃ³dulo', 'Módulo'
$raw = $raw -replace 'ðŸ’¾', '💾'
$raw = $raw -replace 'â ³', '⏳'
$raw = $raw -replace 'Ã©xito', 'éxito'
$raw = $raw -replace 'OcurriÃ³', 'Ocurrió'

# 3. Fix executeCreate to capture and save modalidades and reis
$targetExecute = '      // 4. Guardar rol en la colección ''roles'''
if ($raw.Contains($targetExecute)) {
  # Replace step 4 & 5
  $oldBlock = @"
      // 4. Guardar rol en la colección 'roles'
      const hasConcursos = Boolean(document.getElementById('newAccConcursos')?.checked || role === 'admin');
      await dbNs.collection('roles').doc(newUid).set({
        email: email,
        role: role,
        accesoConcursos: hasConcursos,
        userType: role === 'admin' ? 'coordinador' : 'especialista',
        estado: 'activo',
        estadoVerificacion: 'verificado',
        createdAt: Date.now(),
        creadoPor: currentUser?.email || 'admin'
      });

      // 5. Registrar en logActividades para el Historial
      try {
        await dbNs.collection('logActividades').add({
          tipo: 'CREACION_USUARIO_ADMIN',
          usuarioUid: newUid,
          usuarioEmail: email,
          usuarioNombre: email.split('@')[0],
          rolSolicitado: role === 'admin' ? 'coordinador' : 'especialista',
          modalidad: 'EBR',
          reis: ['TODAS'],
          creadoPor: currentUser?.email || 'admin',
          timestamp: Date.now(),
          fecha: new Date().toISOString(),
          detalle: `Usuario creado y autorizado directamente por el administrador (` + (currentUser?.email || 'admin') + `) con rol ` + role
        });
      } catch (logErr) {
        console.warn('Aviso al registrar log de creación:', logErr);
      }
"@

  # Let's find the actual block in $raw around step 4
  $idx4 = $raw.IndexOf("// 4. Guardar rol en la colección 'roles'")
  $idx6 = $raw.IndexOf("// 6. Vista de éxito", $idx4)
  if ($idx4 -gt 0 -and $idx6 -gt $idx4) {
    $beforeBlock = $raw.Substring(0, $idx4)
    $afterBlock = $raw.Substring($idx6)
    
    $newMiddle = @"// 4. Guardar rol en la colección 'roles' con Modalidad y REIs asignadas
      const hasConcursos = Boolean(document.getElementById('newAccConcursos')?.checked || role === 'admin');
      const selectedMods = (role === 'admin')
        ? ['TODAS']
        : Array.from(overlay.querySelectorAll('input[name="newAccMod"]:checked')).map(cb => cb.value);
      const selectedReis = (role === 'admin')
        ? ['TODAS']
        : newReiCbs.filter(cb => cb.checked).map(cb => cb.value);

      if (role !== 'admin') {
        if (selectedMods.length === 0) {
          errorAlert.textContent = 'Debes seleccionar al menos una modalidad a su cargo (ej. EBR, EBE o JEC).';
          errorAlert.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>👤➕</span> <span>Crear y Autorizar Cuenta</span>';
          return;
        }
        if (selectedReis.length === 0) {
          errorAlert.textContent = 'Debes seleccionar al menos una RED Educativa a su cargo (o marcar Todas).';
          errorAlert.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>👤➕</span> <span>Crear y Autorizar Cuenta</span>';
          return;
        }
      }

      const modalidadStr = (role === 'admin') ? 'TODAS' : selectedMods.join(', ');
      const reisToSave = (role === 'admin' || selectedReis.length === 16) ? ['TODAS'] : selectedReis;

      await dbNs.collection('roles').doc(newUid).set({
        email: email,
        role: role,
        accesoConcursos: hasConcursos,
        userType: role === 'admin' ? 'coordinador' : 'especialista',
        modalidad: modalidadStr,
        modalidades: (role === 'admin') ? ['TODAS'] : selectedMods,
        reis: reisToSave,
        estado: 'activo',
        estadoVerificacion: 'verificado',
        createdAt: Date.now(),
        creadoPor: currentUser?.email || 'admin'
      });

      // 5. Registrar en logActividades para el Historial
      try {
        await dbNs.collection('logActividades').add({
          tipo: 'CREACION_USUARIO_ADMIN',
          usuarioUid: newUid,
          usuarioEmail: email,
          usuarioNombre: email.split('@')[0],
          rolSolicitado: role === 'admin' ? 'coordinador' : 'especialista',
          modalidad: modalidadStr,
          modalidades: (role === 'admin') ? ['TODAS'] : selectedMods,
          reis: reisToSave,
          creadoPor: currentUser?.email || 'admin',
          timestamp: Date.now(),
          fecha: new Date().toISOString(),
          detalle: `Usuario creado y autorizado directamente por el administrador (${currentUser?.email || 'admin'}) con rol ${role}. Modalidad(es): [${modalidadStr}], REI(s): [${reisToSave.join(', ')}]`
        });
      } catch (logErr) {
        console.warn('Aviso al registrar log de creación:', logErr);
      }

      "@
    $raw = $beforeBlock + $newMiddle + $afterBlock
    Write-Host "Successfully patched openCreateUserModal logic!"
  }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path $uPath).Path, $raw, $utf8NoBom)
Write-Host "Updated usuarios.js saved successfully!"
