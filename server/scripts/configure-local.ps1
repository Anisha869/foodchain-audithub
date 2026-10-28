$ErrorActionPreference = "Stop"

function ConvertFrom-SecureInput {
  param([Parameter(Mandatory = $true)][System.Security.SecureString]$Value)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$defaultUrl = "https://psgrhthaihipumqazsca.supabase.co"
$inputUrl = Read-Host "Supabase project URL [$defaultUrl]"
$supabaseUrl = if ([string]::IsNullOrWhiteSpace($inputUrl)) { $defaultUrl } else { $inputUrl.Trim() }
if ($supabaseUrl -notmatch '^https://[a-z0-9-]+\.supabase\.co$') {
  throw "Enter the Supabase project URL without angle brackets, for example https://project-ref.supabase.co."
}

$secretInput = Read-Host "Paste the Supabase secret/service-role key (input hidden)" -AsSecureString
$secretKey = ConvertFrom-SecureInput $secretInput
if ($secretKey.StartsWith("sb_publishable_") -or $secretKey.StartsWith("<") -or $secretKey.Length -lt 30) {
  $secretKey = $null
  throw "A server secret/service-role key is required. A publishable key cannot perform the server's admin operations."
}

$passwordInput = Read-Host "Choose a new administrator password (minimum 8 characters; input hidden)" -AsSecureString
$adminPassword = ConvertFrom-SecureInput $passwordInput
if ($adminPassword.Length -lt 8) {
  $adminPassword = $null
  $secretKey = $null
  throw "The administrator password must be at least 8 characters."
}

[Environment]::SetEnvironmentVariable("SUPABASE_URL", $supabaseUrl, "User")
[Environment]::SetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY", $secretKey, "User")
$env:SUPABASE_URL = $supabaseUrl
$env:SUPABASE_SERVICE_ROLE_KEY = $secretKey
$env:ADMIN_SEED_PASSWORD = $adminPassword
$secretKey = $null
$adminPassword = $null

Write-Host "Supabase URL and server key saved to your Windows user environment."
Write-Host "Creating the administrator account..."
& npm run seed
if ($LASTEXITCODE -ne 0) {
  Remove-Item Env:\ADMIN_SEED_PASSWORD -ErrorAction SilentlyContinue
  throw "Administrator seeding failed. Check the error above and verify the Supabase migration and credentials."
}
Remove-Item Env:\ADMIN_SEED_PASSWORD -ErrorAction SilentlyContinue
Write-Host "Setup complete. Start the API with: npm run dev"
