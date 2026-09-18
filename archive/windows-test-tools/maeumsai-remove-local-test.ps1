$ErrorActionPreference = 'Stop'
$taskRule = 'Maeumsai-iPhone-Test-8081-8787'
& netsh advfirewall firewall delete rule "name=$taskRule"
if ($LASTEXITCODE -ne 0) { throw 'Could not remove the rule. Run in an administrator PowerShell window.' }
