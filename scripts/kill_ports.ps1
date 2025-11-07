param(
    [Parameter(Mandatory = $true)]
    [int[]]$Ports
)

foreach ($p in $Ports) {
    Write-Output "Buscando procesos en puerto $p"
    $lines = netstat -ano | Select-String ":$p"
    if (-not $lines -or $lines.Count -eq 0) {
        Write-Output "No se encontraron procesos en el puerto $p"
        continue
    }

    foreach ($line in $lines) {
        $s = $line.ToString()
        $parts = $s -split '\s+'
        $procId = $parts[-1]

        if ($procId -and $procId -match '^\d+$') {
            try {
                Stop-Process -Id ([int]$procId) -Force -ErrorAction Stop
                Write-Output "Matado PID $procId en puerto $p"
            }
            catch {
                Write-Output ("No se pudo matar PID {0}: {1}" -f $procId, $_)
            }
        }
        else {
            Write-Output "PID inválido encontrado: $procId"
        }
    }
}
