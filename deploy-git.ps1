# Script PowerShell de redéploiement Git
# Usage: .\deploy-git.ps1 [message-commit]

param(
    [string]$CommitMessage = "feat: Mise à jour application"
)

Write-Host ""
Write-Host "🚀 Redéploiement Git" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Git est installé
try {
    $gitVersion = git --version 2>&1
    Write-Host "✅ Git détecté: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git n'est pas installé" -ForegroundColor Red
    Write-Host "Installez Git depuis: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Étape 1: Vérification de l'état" -ForegroundColor Yellow
Write-Host ""

# Vérifier l'état
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Fichiers modifiés/nouveaux détectés:" -ForegroundColor Cyan
    Write-Host $status -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✅ Aucune modification détectée" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vérification des commits non pushés..." -ForegroundColor Yellow
    
    $unpushed = git log origin/main..HEAD --oneline 2>&1
    if ($unpushed -and $unpushed -notmatch "fatal") {
        Write-Host "📤 Commits non pushés trouvés:" -ForegroundColor Cyan
        Write-Host $unpushed -ForegroundColor White
        Write-Host ""
        $skipAdd = $true
    } else {
        Write-Host "✅ Tout est à jour, rien à faire" -ForegroundColor Green
        exit 0
    }
}

if (-not $skipAdd) {
    Write-Host "📦 Étape 2: Ajout des fichiers" -ForegroundColor Yellow
    Write-Host ""
    
    git add .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'ajout des fichiers" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Fichiers ajoutés" -ForegroundColor Green
    Write-Host ""
}

Write-Host "💾 Étape 3: Création du commit" -ForegroundColor Yellow
Write-Host ""
Write-Host "Message: $CommitMessage" -ForegroundColor Cyan
Write-Host ""

if (-not $skipAdd) {
    git commit -m $CommitMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la création du commit" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Commit créé" -ForegroundColor Green
    Write-Host ""
}

Write-Host "📤 Étape 4: Push vers GitHub" -ForegroundColor Yellow
Write-Host ""

# Vérifier la branche actuelle
$branch = git branch --show-current
Write-Host "Branche: $branch" -ForegroundColor Cyan
Write-Host ""

# Push
Write-Host "Envoi vers origin/$branch..." -ForegroundColor Yellow
git push origin $branch

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erreur lors du push" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions possibles:" -ForegroundColor Yellow
    Write-Host "  1. Vérifier votre connexion Internet" -ForegroundColor White
    Write-Host "  2. Vérifier vos credentials Git" -ForegroundColor White
    Write-Host "  3. Faire un 'git pull origin $branch' avant" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "✅ Push réussi!" -ForegroundColor Green
Write-Host ""

Write-Host "🔍 Étape 5: Vérification" -ForegroundColor Yellow
Write-Host ""

$lastCommit = git log --oneline -1
Write-Host "Dernier commit:" -ForegroundColor Cyan
Write-Host "  $lastCommit" -ForegroundColor White
Write-Host ""

$unpushed = git log origin/$branch..HEAD --oneline 2>&1
if ($unpushed -and $unpushed -notmatch "fatal") {
    Write-Host "⚠️  Commits non pushés restants:" -ForegroundColor Yellow
    Write-Host $unpushed -ForegroundColor White
} else {
    Write-Host "✅ Tout est synchronisé avec GitHub" -ForegroundColor Green
}

Write-Host ""
Write-Host "🌐 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "  1. Vérifier sur GitHub: https://github.com/gardeauarbres/studiosample" -ForegroundColor White
Write-Host "  2. Vercel redéploiera automatiquement" -ForegroundColor White
Write-Host "  3. Vérifier le dashboard Vercel" -ForegroundColor White
Write-Host ""

