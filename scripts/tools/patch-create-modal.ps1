# Add jurisdiction inputs to openCreateUserModal
$content = [System.IO.File]::ReadAllText('public/js/ui/usuarios.js', [System.Text.Encoding]::UTF8)

$targetHtml = "<!-- Permiso de Concursos -->"
$jurisdiccionHtml = Get-Content -Raw "scripts\tools\create-user-jurisdiction-html.txt"

$idx = $content.LastIndexOf($targetHtml)
if ($idx -gt 0) {
  $content = $content.Substring(0, $idx) + $jurisdiccionHtml + "`r`n" + $content.Substring($idx + $targetHtml.Length)
  Write-Host "Injected jurisdiction fields in openCreateUserModal"
}

# Update saving logic
$oldSaveBlock = "      // 4. Guardar rol en la colección 'roles'`r`n      const hasConcursos = Boolean(document.getElementById('newAccConcursos')?.checked || role === 'admin');`r`n      await dbNs.collection('roles').doc(newUid).set({`r`n        email: email,`r`n        role: role,`r`n        accesoConcursos: hasConcursos,`r`n        userType: role === 'admin' ? 'coordinador' : 'especialista',`r`n        estado: 'activo',`r`n        estadoVerificacion: 'verificado',`r`n        createdAt: Date.now(),`r`n        creadoPor: currentUser?.email || 'admin'`r`n      });"
if (-not $content.Contains($oldSaveBlock)) {
  $oldSaveBlock = "      // 4. Guardar rol en la colección 'roles'`n      const hasConcursos = Boolean(document.getElementById('newAccConcursos')?.checked || role === 'admin');`n      await dbNs.collection('roles').doc(newUid).set({`n        email: email,`n        role: role,`n        accesoConcursos: hasConcursos,`n        userType: role === 'admin' ? 'coordinador' : 'especialista',`n        estado: 'activo',`n        estadoVerificacion: 'verificado',`n        createdAt: Date.now(),`n        creadoPor: currentUser?.email || 'admin'`n      });"
}

$newSaveBlock = @"
      // 4. Guardar rol y jurisdicción en la colección 'roles'
      const isCoord = (role === 'admin');
      const selectedMods = Array.from(overlay.querySelectorAll('input[name="newAccMod"]:checked')).map(cb => cb.value);
      const selectedReis = Array.from(overlay.querySelectorAll('input[name="newAccRei"]:checked')).map(cb => cb.value);
      const modalidadStr = isCoord ? 'TODAS' : (selectedMods.length ? selectedMods.join(', ') : 'EBR');
      const modalidadesArr = isCoord ? ['TODAS'] : (selectedMods.length ? selectedMods : ['EBR']);
      const reisArr = isCoord ? ['TODAS'] : (selectedReis.length === 16 ? ['TODAS'] : (selectedReis.length ? selectedReis : ['01']));
      const hasConcursos = Boolean(document.getElementById('newAccConcursos')?.checked || role === 'admin');

      await dbNs.collection('roles').doc(newUid).set({
        email: email,
        role: role,
        accesoConcursos: hasConcursos,
        userType: isCoord ? 'coordinador' : 'especialista',
        modalidad: modalidadStr,
        modalidades: modalidadesArr,
        reis: reisArr,
        estado: 'activo',
        estadoVerificacion: 'verificado',
        createdAt: Date.now(),
        creadoPor: currentUser?.email || 'admin'
      });
"@

if ($content.Contains($oldSaveBlock)) {
  $content = $content.Replace($oldSaveBlock, $newSaveBlock)
  Write-Host "Updated save block in openCreateUserModal"
}

[System.IO.File]::WriteAllText('public/js/ui/usuarios.js', $content, [System.Text.Encoding]::UTF8)
Write-Host "Updated openCreateUserModal in usuarios.js successfully."
