Write-Output "=== CPU & VIRTUALIZATION FIRMWARE ==="
Get-CimInstance -ClassName Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, VirtualizationFirmwareEnabled | Format-List

Write-Output "=== SYSTEM MEMORY ==="
$os = Get-CimInstance -ClassName Win32_OperatingSystem
$totalRam = [math]::Round($os.TotalVisibleMemorySize / 1024 / 1024, 2)
$freeRam = [math]::Round($os.FreePhysicalMemory / 1024 / 1024, 2)
Write-Output "Total RAM (GB): $totalRam"
Write-Output "Free RAM (GB): $freeRam"

Write-Output "=== DISK SPACE (C:) ==="
$drive = Get-PSDrive C
$freeDisk = [math]::Round($drive.Free / 1024 / 1024 / 1024, 2)
Write-Output "Free Disk (GB): $freeDisk"

Write-Output "=== ADMINISTRATOR ROLE ==="
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Output "Is Administrator: $isAdmin"

Write-Output "=== HYPERVISOR DRIVERS & COMMANDS ==="
$vbox = Get-Command VBoxManage.exe -ErrorAction SilentlyContinue
Write-Output "VBoxManage: $vbox"
$vmrun = Get-Command vmrun.exe -ErrorAction SilentlyContinue
Write-Output "vmrun: $vmrun"
$vagrant = Get-Command vagrant.exe -ErrorAction SilentlyContinue
Write-Output "vagrant: $vagrant"
$wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
Write-Output "wsl: $wsl"

Write-Output "=== SYSTEMINFO HYPER-V STATUS ==="
systeminfo | Select-String "Hyper-V", "Virtualization"
