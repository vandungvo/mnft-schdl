# Text-to-speech with the Windows OneCore voices (offline, nothing leaves the machine).
# Usage: powershell -ExecutionPolicy Bypass -File tts.ps1 -Script narration.json -OutDir audio [-Voice "Microsoft Mark"] [-Rate 1.0]
# narration.json: [{"id": "s01", "text": "..."}, ...]  ->  audio/s01.wav, ...
param(
    [Parameter(Mandatory = $true)][string]$Script,
    [Parameter(Mandatory = $true)][string]$OutDir,
    [string]$Voice = "Microsoft Mark",
    [double]$Rate = 1.0,
    [switch]$ListVoices
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

# WinRT async -> .NET Task, so PowerShell 5.1 can wait on it.
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Await($operation, [Type]$resultType) {
    $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
    $task.Wait() | Out-Null
    $task.Result
}

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
if ($ListVoices) {
    [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | ForEach-Object { "$($_.DisplayName) | $($_.Language) | $($_.Gender)" }
    exit 0
}
$match = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "$Voice*" } | Select-Object -First 1
if (-not $match) { throw "Voice '$Voice' not found" }
$synth.Voice = $match
$synth.Options.SpeakingRate = $Rate
$synth.Options.AppendedSilence = [Windows.Media.SpeechSynthesis.SpeechAppendedSilence]::Min

New-Item -ItemType Directory -Force $OutDir | Out-Null
$items = Get-Content -Raw -Encoding UTF8 $Script | ConvertFrom-Json
foreach ($item in $items) {
    $stream = Await ($synth.SynthesizeTextToStreamAsync($item.text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    $size = [uint32]$stream.Size
    $null = Await ($reader.LoadAsync($size)) ([uint32])
    $bytes = New-Object byte[] $size
    $reader.ReadBytes($bytes)
    [System.IO.File]::WriteAllBytes((Join-Path $OutDir "$($item.id).wav"), $bytes)
    $reader.Dispose(); $stream.Dispose()
    Write-Output "$($item.id) $size"
}
