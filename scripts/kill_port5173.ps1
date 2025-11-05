Write-Output 'Buscando procesos en puerto 5173'
$lines = netstat -ano | Select-String ':5173'
if (-not $lines -or $lines.Count -eq 0) {
    Write-Output 'No se encontraron procesos en el puerto 5173'
    exit 0
}
else {
    foreach ($line in $lines) {
        $s = $line.ToString()
        # split por espacios en blanco; el PID es el último elemento
        $parts = $s -split '\s+'
        $foundPid = $parts[-1]
        if ($foundPid -and $foundPid -match '^\d+$') {
            Write-Output "Matando PID $foundPid"
            try {
                Stop-Process -Id ([int]$foundPid) -Force -ErrorAction Stop
            }
            catch {
                Write-Output ("No se pudo matar PID {0}: {1}" -f $foundPid, $_)
            }
        }
        else {
            Write-Output "PID inválido encontrado: $foundPid"
        }
    }
}
