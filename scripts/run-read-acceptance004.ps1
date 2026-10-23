param([string]$ApiUrl = 'http://127.0.0.1:3000/api', [string]$Report = '', [switch]$PublicOnly)
$ErrorActionPreference = 'Stop'
$runnerPath = Join-Path $PSScriptRoot 'read-acceptance004.mjs'
$repositoryPath = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath $runnerPath -PathType Leaf)) { throw 'D004_RUNNER_NOT_FOUND' }
$fixtureSecret = $null
$fixturePointer = [IntPtr]::Zero
Push-Location -LiteralPath $repositoryPath
try {
    $runnerArguments = @($runnerPath)
    if (-not $PublicOnly) {
        $fixtureSecret = Read-Host 'Enter the development fixture password (masked; read-only acceptance)' -AsSecureString
        $fixturePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($fixtureSecret)
        $env:VALRYDE_D004_FIXTURE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($fixturePointer)
        $runnerArguments += '--authenticated'
    }
    $env:VALRYDE_D004_API_URL = $ApiUrl
    if ($Report) { $runnerArguments += @('--report', $Report) }
    & $nodePath @runnerArguments
    $acceptanceExit = $LASTEXITCODE
} finally {
    if ($fixturePointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($fixturePointer) }
    if ($fixtureSecret) { $fixtureSecret.Dispose() }
    if (-not $PublicOnly) { Remove-Item Env:VALRYDE_D004_FIXTURE_PASSWORD -ErrorAction SilentlyContinue }
    Remove-Item Env:VALRYDE_D004_API_URL -ErrorAction SilentlyContinue
    Pop-Location
}
exit $acceptanceExit
