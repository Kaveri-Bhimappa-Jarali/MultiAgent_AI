# PowerShell script to start SSH reverse tunnels for the Virtual Lab VMs
# Keeps local SOC backend (127.0.0.1:8000) accessible to the remote VMs on 127.0.0.1:18000

param(
    [string]$KeyPath = "$HOME\.ssh\soc_lab",
    [string]$VictimHost = "45.74.156.42",
    [string]$AttackerHost = "45.74.156.41",
    [string]$User = "ubuntu"
)

Write-Host "Starting SOC VM Reverse Tunnels..." -ForegroundColor Cyan
Write-Host "Victim VM: $User@$VictimHost (127.0.0.1:18000 -> 127.0.0.1:8000)" -ForegroundColor Green
Write-Host "Attacker VM: $User@$AttackerHost (127.0.0.1:18000 -> 127.0.0.1:8000)" -ForegroundColor Yellow

$victimJob = Start-Job -ScriptBlock {
    param($key, $user, $host)
    while ($true) {
        ssh -i $key -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -N -T -R 127.0.0.1:18000:127.0.0.1:8000 "$user@$host"
        Start-Sleep -Seconds 5
    }
} -ArgumentList $KeyPath, $User, $VictimHost

$attackerJob = Start-Job -ScriptBlock {
    param($key, $user, $host)
    while ($true) {
        ssh -i $key -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -N -T -R 127.0.0.1:18000:127.0.0.1:8000 "$user@$host"
        Start-Sleep -Seconds 5
    }
} -ArgumentList $KeyPath, $User, $AttackerHost

Write-Host "Tunnels launched in background jobs ($($victimJob.Id), $($attackerJob.Id))." -ForegroundColor Cyan
Write-Host "Press Ctrl+C or run 'Stop-Job $($victimJob.Id), $($attackerJob.Id)' to stop."
