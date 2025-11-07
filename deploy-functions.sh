#!/bin/bash

# Script de déploiement des Edge Functions Supabase
# Usage: ./deploy-functions.sh

echo "🚀 Déploiement des Edge Functions Supabase"
echo "=========================================="
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI détecté"
echo ""

# Vérifier que le projet est lié
echo "📋 Vérification de la configuration..."
supabase status

echo ""
echo "📦 Déploiement des fonctions..."
echo ""

# Déployer toutes les fonctions
echo "1️⃣  Déploiement de analyze-audio..."
supabase functions deploy analyze-audio

echo ""
echo "2️⃣  Déploiement de analyze-audio-advanced..."
supabase functions deploy analyze-audio-advanced

echo ""
echo "3️⃣  Déploiement de get-inspiration..."
supabase functions deploy get-inspiration

echo ""
echo "4️⃣  Déploiement de creative-insights..."
supabase functions deploy creative-insights

echo ""
echo "✅ Déploiement terminé !"
echo ""
echo "⚠️  IMPORTANT : Vérifiez que le secret GOOGLE_GEMINI_API_KEY est configuré dans Supabase Dashboard"
echo "   Edge Functions > Secrets"
echo ""
echo "🧪 Testez les fonctions dans votre application !"

