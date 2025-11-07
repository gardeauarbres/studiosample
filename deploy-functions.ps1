# Script PowerShell de déploiement des Edge Functions Supabase
# Usage: .\deploy-functions.ps1

Write-Host "Deploiement des Edge Functions Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que Supabase CLI est installe
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "[OK] Supabase CLI detecte: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Supabase CLI n'est pas installe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Options d'installation pour Windows :" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 (Recommandé) - Via Scoop :" -ForegroundColor Cyan
    Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor White
    Write-Host "  scoop install supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 - Via winget :" -ForegroundColor Cyan
    Write-Host "  winget install --id=Supabase.CLI -e" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3 - Via Dashboard (Pas besoin de CLI) :" -ForegroundColor Cyan
    Write-Host "  Allez sur Supabase Dashboard > Edge Functions > Deploy" -ForegroundColor White
    Write-Host ""
    Write-Host "Voir doc/INSTALL_SUPABASE_CLI.md pour plus de details" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Verification de la configuration..." -ForegroundColor Yellow
supabase status

Write-Host ""
Write-Host "Deploiement des fonctions..." -ForegroundColor Yellow
Write-Host ""

# Deployer toutes les fonctions
Write-Host "[1/4] Deploiement de analyze-audio..." -ForegroundColor Cyan
supabase functions deploy analyze-audio

Write-Host ""
Write-Host "[2/4] Deploiement de analyze-audio-advanced..." -ForegroundColor Cyan
supabase functions deploy analyze-audio-advanced

Write-Host ""
Write-Host "[3/4] Deploiement de get-inspiration..." -ForegroundColor Cyan
supabase functions deploy get-inspiration

Write-Host ""
Write-Host "[4/4] Deploiement de creative-insights..." -ForegroundColor Cyan
supabase functions deploy creative-insights

Write-Host ""
Write-Host "[OK] Deploiement termine !" -ForegroundColor Green
Write-Host ""
Write-Host "[IMPORTANT] Verifiez que le secret GOOGLE_GEMINI_API_KEY est configure dans Supabase Dashboard" -ForegroundColor Yellow
Write-Host "   Edge Functions > Secrets" -ForegroundColor Yellow
Write-Host ""
Write-Host "Testez les fonctions dans votre application !" -ForegroundColor Green

