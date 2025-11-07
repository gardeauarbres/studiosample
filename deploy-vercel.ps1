# Script PowerShell de déploiement sur Vercel
# Usage: .\deploy-vercel.ps1

Write-Host "🚀 Déploiement sur Vercel" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Vercel CLI est installé
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✅ Vercel CLI détecté: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI n'est pas installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 Installation..." -ForegroundColor Yellow
    npm install -g vercel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation" -ForegroundColor Red
        Write-Host "Installez manuellement avec: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Vercel CLI installé" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Vérification des prérequis..." -ForegroundColor Yellow

# Vérifier que les variables d'environnement sont dans .env
if (Test-Path .env) {
    Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green
} else {
    Write-Host "⚠️  Fichier .env non trouvé" -ForegroundColor Yellow
    Write-Host "   Assurez-vous d'ajouter les variables dans Vercel Dashboard" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Vérification des variables d'environnement..." -ForegroundColor Yellow

$envContent = Get-Content .env -ErrorAction SilentlyContinue
if ($envContent -match "VITE_SUPABASE_URL" -and $envContent -match "VITE_SUPABASE_PUBLISHABLE_KEY") {
    Write-Host "✅ Variables locales trouvées" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT : Vérifiez que les mêmes variables sont dans Vercel Dashboard" -ForegroundColor Yellow
    Write-Host "   Settings > Environment Variables" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Variables non trouvées dans .env" -ForegroundColor Yellow
    Write-Host "   Ajoutez-les dans Vercel Dashboard avant de déployer" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔐 Connexion à Vercel..." -ForegroundColor Cyan
Write-Host "   (Si pas encore connecté, suivez les instructions)" -ForegroundColor Gray
vercel login

Write-Host ""
Write-Host "📦 Déploiement en production..." -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Voulez-vous déployer en production ? (O/N)"

if ($response -eq "O" -or $response -eq "o" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🚀 Déploiement en production..." -ForegroundColor Green
    vercel --prod
} else {
    Write-Host ""
    Write-Host "🚀 Déploiement en preview..." -ForegroundColor Green
    vercel
}

Write-Host ""
Write-Host "✅ Déploiement terminé !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes :" -ForegroundColor Yellow
Write-Host "1. Vérifiez votre lien dans Vercel Dashboard" -ForegroundColor White
Write-Host "2. Testez l'application en production" -ForegroundColor White
Write-Host "3. Vérifiez que les fonctionnalités Supabase fonctionnent" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Votre application sera accessible sur : https://votre-projet.vercel.app" -ForegroundColor Cyan

