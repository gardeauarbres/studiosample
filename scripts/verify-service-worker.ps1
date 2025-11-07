# Script PowerShell pour vérifier la configuration du service worker
# Usage: .\scripts\verify-service-worker.ps1

Write-Host ""
Write-Host "=== VERIFICATION DU SERVICE WORKER ===" -ForegroundColor Cyan
Write-Host ""

$swPath = "dist/sw.js"

# Vérifier si le fichier existe
if (-not (Test-Path $swPath)) {
    Write-Host "❌ Le fichier dist/sw.js n'existe pas !" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solution: Lancez d'abord 'npm run build'" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Fichier dist/sw.js trouvé" -ForegroundColor Green
Write-Host ""

# Lire le contenu du fichier
$content = Get-Content $swPath -Raw

# Vérifier les patterns de cache
$patterns = @(
    "supabase-storage-audio-cache",
    "supabase-functions-cache",
    "supabase-api-cache",
    "audio-external-cache",
    "google-fonts-cache"
)

Write-Host "Recherche des configurations de cache..." -ForegroundColor Yellow
Write-Host ""

$allFound = $true
foreach ($pattern in $patterns) {
    if ($content -match $pattern) {
        Write-Host "  ✅ $pattern" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $pattern (non trouvé)" -ForegroundColor Red
        $allFound = $false
    }
}

Write-Host ""

# Vérifier les patterns d'URL
Write-Host "Vérification des patterns d'URL..." -ForegroundColor Yellow
Write-Host ""

$urlPatterns = @(
    "storage/v1/object/samples",
    "functions/v1"
)

foreach ($urlPattern in $urlPatterns) {
    if ($content -match $urlPattern) {
        Write-Host "  ✅ Pattern URL: $urlPattern" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Pattern URL: $urlPattern (non trouvé)" -ForegroundColor Red
        $allFound = $false
    }
}

Write-Host ""

if ($allFound) {
    Write-Host "✅ Toutes les configurations sont présentes !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Le service worker est correctement configuré." -ForegroundColor White
} else {
    Write-Host "⚠️  Certaines configurations sont manquantes." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Vérifiez que:" -ForegroundColor Yellow
    Write-Host "  1. Le build a été lancé avec 'npm run build'" -ForegroundColor White
    Write-Host "  2. vite.config.ts contient bien la configuration Workbox" -ForegroundColor White
}

Write-Host ""


