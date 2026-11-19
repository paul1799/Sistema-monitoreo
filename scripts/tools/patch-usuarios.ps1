# PowerShell patch for usuarios.js
$content = [System.IO.File]::ReadAllText('public/js/ui/usuarios.js', [System.Text.Encoding]::UTF8)

# 1. Add listener in renderUsuariosTab right before btnResetPass listener
$target = "  container.querySelectorAll('.btnResetPass[data-resetemail]').forEach(btn => {"
$listenerCode = @"
  // Listener: Modificar Jurisdicción de Especialista
  container.querySelectorAll('.btnEditJurisdiccion[data-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const targetUser = activeRoles.find(r => r.id === uid);
      if (!targetUser) return;
      openEditUserJurisdictionModal(targetUser, dbNs, currentUser, () => {
        renderUsuariosTab(container, state, dbNs, currentUser);
      });
    });
  });

"@
if ($content.Contains($target)) {
  $idx = $content.IndexOf($target)
  $content = $content.Substring(0, $idx) + $listenerCode + $content.Substring($idx)
  Write-Host "Inserted btnEditJurisdiccion listener"
} else {
  Write-Host "Target btnResetPass not found"
}

# 2. Inject openEditUserJurisdictionModal before function openCreateUserModal
$targetFunc = "function openCreateUserModal(dbNs, currentUser, onComplete) {"
$modalCode = Get-Content -Raw "scripts\tools\jurisdiction-modal-snippet.txt"
if ($content.Contains($targetFunc)) {
  $idx = $content.IndexOf($targetFunc)
  $content = $content.Substring(0, $idx) + $modalCode + "`r`n`r`n" + $content.Substring($idx)
  Write-Host "Injected openEditUserJurisdictionModal"
} else {
  Write-Host "Target openCreateUserModal not found"
}

[System.IO.File]::WriteAllText('public/js/ui/usuarios.js', $content, [System.Text.Encoding]::UTF8)
Write-Host "usuarios.js updated successfully."
