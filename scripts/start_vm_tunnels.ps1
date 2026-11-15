# PowerShell script to start SSH reverse tunnels for the Virtual Lab VMs
# Keeps local SOC backend (127.0.0.1:8000) accessible to the remote VMs on 127.0.0.1:18000

param(
    [string]$KeyPath = "$HOME\.ssh\id_ed25519",
    [string]$VictimHost = "45.74.156.43",
    [string]$AttackerHost = "45.74.156.44",
    [string]$User = "ubuntu"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting Resilient Multi-Agent AI SOC Reverse Tunnels" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Victim VM  : $User@$VictimHost (127.0.0.1:18000 -> 127.0.0.1:8000)" -ForegroundColor Green
Write-Host "Attacker VM: $User@$AttackerHost (127.0.0.1:18000 -> 127.0.0.1:8000)" -ForegroundColor Yellow
Write-Host "SSH Key    : $KeyPath" -ForegroundColor Gray

# Clear any stale sockets on remote VMs first
try {
    Write-Host "Clearing stale remote 18000 port listeners on Victim VM..." -ForegroundColor Gray
    ssh -i $KeyPath -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 "$User@$VictimHost" "sudo fuser -k 18000/tcp || true" 2>$null
    Write-Host "Clearing stale remote 18000 port listeners on Attacker VM..." -ForegroundColor Gray
    ssh -i $KeyPath -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 "$User@$AttackerHost" "sudo fuser -k 18000/tcp || true" 2>$null
} catch {}

$victimJob = Start-Job -ScriptBlock {
    param($key, $user, $host)
    while ($true) {
        # Ensure remote port is clear before binding
        ssh -i $key -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 "$user@$host" "sudo fuser -k 18000/tcp 2>/dev/null || true"
        # Start persistent reverse tunnel with keepalives
        ssh -i $key -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=6 -o ExitOnForwardFailure=yes -N -T -R 127.0.0.1:18000:127.0.0.1:8000 "$user@$host"
        Start-Sleep -Seconds 5
    }
} -ArgumentList $KeyPath, $User, $VictimHost

$attackerJob = Start-Job -ScriptBlock {
    param($key, $user, $host)
    while ($true) {
        # Ensure remote port is clear before binding
        ssh -i $key -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 "$user@$host" "sudo fuser -k 18000/tcp 2>/dev/null || true"
        # Start persistent reverse tunnel with keepalives
        ssh -i $key -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=6 -o ExitOnForwardFailure=yes -N -T -R 127.0.0.1:18000:127.0.0.1:8000 "$user@$host"
        Start-Sleep -Seconds 5
    }
} -ArgumentList $KeyPath, $User, $AttackerHost

Write-Host "Tunnels launched in persistent background jobs: Victim (Job ID: $($victimJob.Id)), Attacker (Job ID: $($attackerJob.Id))." -ForegroundColor Cyan
Write-Host "Tunnels will auto-reconnect if dropped." -ForegroundColor Cyan
Write-Host "Run 'Stop-Job $($victimJob.Id), $($attackerJob.Id)' to terminate." -ForegroundColor Gray
