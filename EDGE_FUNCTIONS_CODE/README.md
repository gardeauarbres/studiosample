# Code des Fonctions Edge Supabase

Ce dossier contient le code de toutes les fonctions Edge pour faciliter le déploiement via le Dashboard Supabase.

## 📋 Liste des fonctions

1. **analyze-audio.txt** - Analyse audio basique avec 4 actions
2. **analyze-audio-advanced.txt** - Analyse audio avancée avec données audio
3. **get-inspiration.txt** - Génération de défis créatifs
4. **creative-insights.txt** - Insights créatifs personnalisés (niveau 2+)
5. **gemini.txt** - Wrapper générique Gemini (voir `supabase/functions/gemini/index.ts`)

## 🚀 Instructions de déploiement

### Pour chaque fonction :

1. **Allez sur https://app.supabase.com**
2. **Sélectionnez votre projet StudioSample**
3. **Edge Functions** → **Create a new function**
4. **Nommez la fonction** (ex: `analyze-audio`)
5. **Copiez-collez le contenu** du fichier `.txt` correspondant
6. **Cliquez sur "Deploy"**

## ✅ Vérifications après déploiement

- [ ] La fonction apparaît dans la liste des Edge Functions
- [ ] `verify_jwt = true` est activé (automatique si configuré dans `config.toml`)
- [ ] `GOOGLE_GEMINI_API_KEY` est dans les Secrets
- [ ] CORS est configuré pour `https://studiosample.vercel.app`

## 📝 Notes

- Les fichiers `.txt` contiennent exactement le code à copier-coller
- Toutes les fonctions nécessitent `GOOGLE_GEMINI_API_KEY`
- Toutes les fonctions nécessitent une authentification JWT
- Toutes les fonctions ont CORS configuré

