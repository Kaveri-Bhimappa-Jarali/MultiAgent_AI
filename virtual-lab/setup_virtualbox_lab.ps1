# =====================================================================
# Virtual Enterprise Network Lab Setup Automation Script (Windows)
# =====================================================================

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   VIRTUAL ENTERPRISE NETWORK LAB - ENVIRONMENT CHECK & SETUP        " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Check VirtualBox Installation
$vboxPath = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
$hasVBox = Test-Path $vboxPath

if (-not $hasVBox) {
    Write-Host "`n[!] Oracle VirtualBox was not detected in standard program files." -ForegroundColor Yellow
    Write-Host "    To install VirtualBox automatically on Windows via winget, run:" -ForegroundColor White
    Write-Host "    winget install Oracle.VirtualBox`n" -ForegroundColor Green
    Write-Host "    Alternatively, you can run the self-contained multi-node lab runner immediately:" -ForegroundColor White
    Write-Host "    .\.venv\Scripts\python.exe virtual-lab\run_local_virtual_nodes.py`n" -ForegroundColor Green
} else {
    Write-Host "`n[+] Oracle VirtualBox detected at: $vboxPath" -ForegroundColor Green
    
    # 2. Check Host-Only Network Adapter
    Write-Host "[*] Checking VirtualBox Host-Only Ethernet Adapter (192.168.56.1/24)..." -ForegroundColor White
    & $vboxPath list hostonlyifs
}

# 3. Check Vagrant
$hasVagrant = Get-Command vagrant -ErrorAction SilentlyContinue
if ($hasVagrant) {
    Write-Host "[+] Vagrant CLI detected: $($hasVagrant.Version)" -ForegroundColor Green
    Write-Host "    To provision all 3 virtual machines in 1 click, run:" -ForegroundColor White
    Write-Host "    cd virtual-lab && vagrant up" -ForegroundColor Cyan
} else {
    Write-Host "[i] Vagrant is not installed (optional). VMs can be imported manually in VirtualBox GUI." -ForegroundColor Gray
}

# 4. Host Resources Check
$memTotal = (Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1024 / 1024
Write-Host "`n[+] Host Memory: $([math]::Round($memTotal, 2)) GB RAM available." -ForegroundColor White
Write-Host "[+] Virtual Lab Allocation: 3 Nodes x 512MB RAM = 1.5 GB Total (Safe & Optimal)`n" -ForegroundColor Green

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   To start the Virtual Lab right now, run:" -ForegroundColor White
Write-Host "   .\.venv\Scripts\python.exe virtual-lab\run_local_virtual_nodes.py" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
