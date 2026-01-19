# 🌐 Guide de Déploiement Netlify

## Option 1 : Déploiement via l'interface web (Recommandé)

### Étape 1 : Créer un compte Netlify
1. Allez sur [netlify.com](https://www.netlify.com)
2. Cliquez sur "Sign up" et créez un compte (gratuit)
3. Connectez votre compte GitHub

### Étape 2 : Importer votre projet
1. Cliquez sur **"Add new site"** → **"Import an existing project"**
2. Choisissez **"Deploy with GitHub"**
3. Autorisez Netlify à accéder à vos repositories
4. Sélectionnez le repository **`SpeachToText`**

### Étape 3 : Configurer le build
Netlify devrait détecter automatiquement les paramètres, sinon :

- **Branch to deploy**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

Cliquez sur **"Deploy site"**

### Étape 4 : Configurer la variable d'environnement
⚠️ **IMPORTANT** : Pour que l'analyse IA fonctionne

1. Allez dans **Site settings** → **Environment variables**
2. Cliquez sur **"Add a variable"**
3. Ajoutez :
   - **Key**: `VITE_GEMINI_API_KEY`
   - **Value**: Votre clé API Gemini
4. Cliquez sur **"Save"**

### Étape 5 : Redéployer
1. Allez dans **Deploys**
2. Cliquez sur **"Trigger deploy"** → **"Deploy site"**
3. Attendez que le déploiement se termine (1-2 minutes)

### Étape 6 : Accéder à votre site
Votre site sera disponible à une URL comme :
```
https://random-name-123456.netlify.app
```

Vous pouvez personnaliser le nom dans **Site settings** → **Domain management**.

---

## Option 2 : Déploiement via Netlify CLI

### Installation
```bash
npm install -g netlify-cli
```

### Connexion
```bash
netlify login
```
Cela ouvrira votre navigateur pour vous connecter.

### Initialisation
```bash
netlify init
```

Suivez les instructions :
1. Choisissez "Create & configure a new site"
2. Sélectionnez votre équipe
3. Donnez un nom à votre site (optionnel)
4. Build command: `npm run build`
5. Publish directory: `dist`

### Déploiement
```bash
netlify deploy --prod
```

### Configuration de la variable d'environnement via CLI
```bash
netlify env:set VITE_GEMINI_API_KEY "votre_clé_api_ici"
```

Puis redéployez :
```bash
netlify deploy --prod
```

---

## 🔄 Déploiement continu

Une fois configuré via l'interface web, Netlify déploiera automatiquement :
- ✅ À chaque `git push` sur la branche `main`
- ✅ À chaque merge de pull request
- ✅ Avec preview pour les branches de développement

---

## 🎨 Personnalisation du domaine

### Domaine Netlify gratuit
1. Allez dans **Site settings** → **Domain management**
2. Cliquez sur **"Options"** → **"Edit site name"**
3. Changez `random-name-123456` en `speech-to-text-app` (si disponible)
4. Votre URL devient : `https://speech-to-text-app.netlify.app`

### Domaine personnalisé (optionnel)
1. Achetez un domaine (ex: `monspeechtotext.com`)
2. Dans **Domain management** → **"Add custom domain"**
3. Suivez les instructions pour configurer les DNS

---

## 🛠️ Fonctionnalités Netlify

- **Déploiement continu** : Auto-déploiement à chaque push
- **Preview deployments** : Aperçu pour chaque pull request
- **Rollback** : Retour à une version précédente en un clic
- **Analytics** : Statistiques de trafic (payant)
- **Forms** : Gestion de formulaires (gratuit)
- **Functions** : Serverless functions pour backend (gratuit jusqu'à 125k requêtes/mois)

---

## 🔐 Sécurité de la clé API

> [!WARNING]
> La clé API Gemini sera exposée côté client. Pour une meilleure sécurité :

### ✅ Solution implémentée : Proxy via Netlify Functions

L'application est maintenant configurée pour utiliser automatiquement une fonction Netlify (`/.netlify/functions/gemini`) lorsqu'elle est déployée. Cela permet de :
1. **Masquer votre clé API** du navigateur de l'utilisateur.
2. **Éviter les limites de quota** côté client.
3. **Sécuriser votre backend** Gemini.

Le fichier a été créé dans `netlify/functions/gemini.js` et utilise la variable `VITE_GEMINI_API_KEY` configurée dans votre interface Netlify.

---

## 📊 Comparaison GitHub Pages vs Netlify

| Fonctionnalité | GitHub Pages | Netlify |
|----------------|--------------|---------|
| **Gratuit** | ✅ Oui | ✅ Oui |
| **Déploiement continu** | ⚠️ Manuel | ✅ Automatique |
| **Variables d'environnement** | ❌ Non | ✅ Oui |
| **Serverless functions** | ❌ Non | ✅ Oui |
| **Preview deployments** | ❌ Non | ✅ Oui |
| **Domaine personnalisé** | ✅ Oui | ✅ Oui |
| **SSL/HTTPS** | ✅ Oui | ✅ Oui |
| **Rollback facile** | ❌ Non | ✅ Oui |

**Recommandation** : Utilisez Netlify pour une meilleure expérience de déploiement et la sécurité des variables d'environnement.

---

## 🆘 Dépannage

### Le site ne se charge pas
- Vérifiez que le build s'est terminé sans erreur
- Consultez les logs de déploiement dans l'interface Netlify

### L'analyse IA ne fonctionne pas
- Vérifiez que `VITE_GEMINI_API_KEY` est bien configurée
- Redéployez après avoir ajouté la variable
- Consultez la console du navigateur pour les erreurs

### Erreur de build
- Vérifiez que `package.json` contient toutes les dépendances
- Assurez-vous que Node.js version est compatible (18+)

---

## 📚 Ressources

- [Documentation Netlify](https://docs.netlify.com/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)
