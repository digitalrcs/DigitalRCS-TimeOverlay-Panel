param(
  [string]$GrafanaUrl = 'http://localhost:3001',
  [string]$DashboardPath = (Join-Path $PSScriptRoot '..\provisioning\dashboards\dashboard.json'),
  [PSCredential]$Credential = (Get-Credential -Message 'Grafana administrator or editor credentials'),
  [switch]$Overwrite
)

$ErrorActionPreference = 'Stop'

$resolvedDashboardPath = (Resolve-Path -LiteralPath $DashboardPath).Path
$dashboard = Get-Content -Raw -LiteralPath $resolvedDashboardPath | ConvertFrom-Json
$body = @{
  dashboard = $dashboard
  overwrite = [bool]$Overwrite
} | ConvertTo-Json -Depth 100

$tokenBytes = [Text.Encoding]::ASCII.GetBytes(
  "{0}:{1}" -f $Credential.UserName, $Credential.GetNetworkCredential().Password
)
$headers = @{ Authorization = "Basic $([Convert]::ToBase64String($tokenBytes))" }
$endpoint = '{0}/api/dashboards/db' -f $GrafanaUrl.TrimEnd('/')

$result = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType 'application/json' -Body $body
Write-Host "Dashboard imported: $($result.url)"
