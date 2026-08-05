param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\provisioning\data\datasource-grafana.csv'),
  [string]$TimeZoneId = 'America/New_York'
)

$rows = Import-Csv -LiteralPath (Resolve-Path -LiteralPath $InputPath)
if ($rows.Count -eq 0) {
  throw 'The CSV contains no data rows.'
}

$columnMap = [System.Collections.Generic.Dictionary[string, string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($column in $rows[0].PSObject.Properties.Name) {
  $trimmedColumn = $column.Trim()
  if ($columnMap.ContainsKey($trimmedColumn)) {
    throw "Duplicate column name after trimming whitespace: '$trimmedColumn'."
  }
  $columnMap[$trimmedColumn] = $column
}
$timeColumn = if ($columnMap.ContainsKey('_time')) { $columnMap['_time'] } elseif ($columnMap.ContainsKey('time')) { $columnMap['time'] } else { $null }
if (-not $timeColumn) {
  throw 'Expected a time column named _time or time (case-insensitive).'
}
$dataColumns = @($columnMap.GetEnumerator() | Where-Object { $_.Value -ne $timeColumn })
if ($dataColumns.Count -eq 0) {
  throw 'Expected at least one numeric data column after the time column.'
}

$timeZoneCandidates = @($TimeZoneId)
if ($TimeZoneId -eq 'America/New_York') {
  $timeZoneCandidates += 'Eastern Standard Time'
} elseif ($TimeZoneId -eq 'Eastern Standard Time') {
  $timeZoneCandidates += 'America/New_York'
}
$defaultTimeZone = $null
foreach ($candidate in $timeZoneCandidates) {
  try {
    $defaultTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById($candidate)
    break
  } catch {
    continue
  }
}
if (-not $defaultTimeZone) {
  throw "Unknown time zone '$TimeZoneId'. Supply a valid IANA or system time-zone ID."
}

$outputLines = [System.Collections.Generic.List[string]]::new()
$outputLines.Add((@('time') + @($dataColumns.Key) | ForEach-Object { '"' + $_.Replace('"', '""') + '"' }) -join ',')
foreach ($row in $rows) {
  $sourceTimestamp = ([string]$row.$timeColumn).Trim()
  $normalizedTimestamp = $sourceTimestamp -replace '([+-]\d{2})(\d{2})$', '$1:$2'
  $parsedTimestamp = [DateTimeOffset]::MinValue
  $hasExplicitZone = $normalizedTimestamp -match '(Z|[+-]\d{2}:\d{2})$'

  if ($hasExplicitZone) {
    $parsed = [DateTimeOffset]::TryParse(
      $normalizedTimestamp,
      [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::AllowWhiteSpaces,
      [ref]$parsedTimestamp
    )
  } else {
    $localTimestamp = [DateTime]::MinValue
    $parsed = [DateTime]::TryParse(
      $normalizedTimestamp,
      [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::AllowWhiteSpaces,
      [ref]$localTimestamp
    )
    if ($parsed) {
      $localTimestamp = [DateTime]::SpecifyKind($localTimestamp, [DateTimeKind]::Unspecified)
      if ($defaultTimeZone.IsInvalidTime($localTimestamp)) {
        throw "Timestamp falls in a daylight-saving gap for $TimeZoneId`: $sourceTimestamp"
      }
      $parsedTimestamp = [DateTimeOffset]::new($localTimestamp, $defaultTimeZone.GetUtcOffset($localTimestamp))
    }
  }

  if (-not $parsed) {
    throw "Invalid timestamp: $($row.$timeColumn)"
  }
  $timestamp = $parsedTimestamp.ToString("yyyy-MM-dd'T'HH:mm:ss.fffzzz", [Globalization.CultureInfo]::InvariantCulture)
  $outputValues = [System.Collections.Generic.List[string]]::new()
  $outputValues.Add($timestamp)
  foreach ($dataColumn in $dataColumns) {
    $number = 0.0
    $sourceValue = ([string]$row.($dataColumn.Value)).Trim()
    $parsedNumber = [double]::TryParse(
      $sourceValue,
      [Globalization.NumberStyles]::Float -bor [Globalization.NumberStyles]::AllowThousands,
      [Globalization.CultureInfo]::InvariantCulture,
      [ref]$number
    )
    if (-not $parsedNumber) {
      throw "Column '$($dataColumn.Key)' must be numeric at timestamp $timestamp."
    }
    $outputValues.Add($number.ToString('R', [Globalization.CultureInfo]::InvariantCulture))
  }
  $outputLines.Add(($outputValues | ForEach-Object { '"' + $_.Replace('"', '""') + '"' }) -join ',')
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($resolvedOutput)) | Out-Null
[System.IO.File]::WriteAllLines($resolvedOutput, $outputLines, [System.Text.UTF8Encoding]::new($false))
Write-Output "Wrote $($rows.Count) rows to $resolvedOutput"
