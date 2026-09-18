$ErrorActionPreference = 'Stop'
$taskRule = 'Maeumsai-iPhone-Test-8081-8787'
$taskNode = 'C:\Program Files\nodejs\node.exe'
$taskIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$taskPrincipal = [Security.Principal.WindowsPrincipal]::new($taskIdentity)
if (-not $taskPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Administrator permission is required. Run this script in an administrator PowerShell window.'
}
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'The expected Node.js executable was not found.' }
& netsh advfirewall firewall show rule "name=$taskRule" | Out-Null
if ($LASTEXITCODE -eq 0) { throw 'This named rule already exists. Inspect it before changing it.' }
& netsh advfirewall firewall add rule "name=$taskRule" dir=in action=allow "program=$taskNode" protocol=TCP localport=8081,8787 remoteip=192.168.35.0/24 profile=private,public enable=yes edge=no
if ($LASTEXITCODE -ne 0) { throw 'Failed to create the firewall rule.' }
& netsh advfirewall firewall show rule "name=$taskRule" verbose
