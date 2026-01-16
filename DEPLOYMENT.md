# 🚀 Guide de Déploiement GitHub Pages

## Étapes pour déployer votre application Speech-to-Text

### 1️⃣ Publier sur GitHub (si pas encore fait)

```bash
# Créer un repository sur GitHub: https://github.com/new
# Nom suggéré: SpeachToText

# Ajouter le remote et pousser le code
git remote add origin https://github.com/VOTRE_USERNAME/SpeachToText.git
git branch -M main
git push -u origin main
```

### 2️⃣ Déployer sur GitHub Pages

```bash
# Déployer l'application
npm run deploy
```

Cette commande va :
- Builder l'application (`npm run build`)
- Créer une branche `gh-pages`
- Publier le contenu du dossier `dist/` sur cette branche

### 3️⃣ Activer GitHub Pages

1. Allez dans les **Settings** de votre repository GitHub
2. Cliquez sur **Pages** dans le menu de gauche
3. Dans **Source**, sélectionnez la branche `gh-pages`
4. Cliquez sur **Save**

### 4️⃣ Accéder à votre application

Votre application sera disponible à l'adresse :
```
https://VOTRE_USERNAME.github.io/SpeachToText/
```

⏱️ **Note** : Le déploiement peut prendre 1-2 minutes.

---

## ⚠️ Configuration de la clé API Gemini

**IMPORTANT** : Pour que l'analyse IA fonctionne en production, vous devez gérer la clé API de manière sécurisée.

### Options :

#### Option 1 : Variable d'environnement publique (Simple mais moins sécurisé)
- La clé sera visible dans le code JavaScript côté client
- Acceptable pour des tests ou usage personnel
- Configurez des restrictions d'API sur Google Cloud Console

#### Option 2 : Backend proxy (Recommandé pour production)
- Créer un backend (Node.js, Python, etc.) qui appelle l'API Gemini
- Votre frontend appelle votre backend au lieu d'appeler directement Gemini
- La clé API reste secrète côté serveur

#### Option 3 : Utiliser Vercel/Netlify avec variables d'environnement
- Ces plateformes supportent les variables d'environnement serveur
- Plus sécurisé que GitHub Pages pour les clés API

---

## 🔄 Mettre à jour le déploiement

Après avoir fait des modifications :

```bash
# Commiter vos changements
git add .
git commit -m "Description des modifications"
git push

# Redéployer sur GitHub Pages
npm run deploy
```

---

## 🛠️ Dépannage

### L'application ne se charge pas
- Vérifiez que `base: '/SpeachToText/'` dans `vite.config.js` correspond au nom de votre repository
- Si votre repository s'appelle différemment, modifiez cette valeur

### Erreur 404
- Assurez-vous que GitHub Pages est activé dans les settings
- Vérifiez que la branche `gh-pages` existe

### L'analyse IA ne fonctionne pas
- Vérifiez que votre clé API Gemini est valide
- Consultez la console du navigateur pour les erreurs
- Envisagez d'utiliser un backend proxy pour la production

---

## 📚 Ressources

- [Documentation GitHub Pages](https://docs.github.com/pages)
- [Documentation Vite](https://vitejs.dev/guide/static-deploy.html)
- [Google Gemini API](https://ai.google.dev/)
