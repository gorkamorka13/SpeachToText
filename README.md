# 🎤 Speech-to-Text Application

Une application web moderne de transcription vocale en temps réel avec traduction instantanée et analyse IA, propulsée par Google Gemini.

![Speech-to-Text](https://img.shields.io/badge/React-18.3-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)

## ✨ Fonctionnalités

- 🎙️ **Transcription vocale en temps réel** - Reconnaissance vocale multi-langues
- 🌍 **Traduction instantanée** - Traduction en temps réel vers plusieurs langues
- 🤖 **Analyse IA avec Google Gemini** - Analyse intelligente du texte transcrit
- 🎨 **Mode sombre/clair** - Interface moderne avec thème personnalisable
- 💾 **Historique des transcriptions** - Sauvegarde locale de vos transcriptions
- 🔊 **Enregistrement audio** - Capture audio du microphone et du système
- 📄 **Export PDF** - Génération de rapports PDF des analyses IA
- 📱 **Design responsive** - Interface adaptée mobile, tablette et desktop

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Clé API Google Gemini ([Obtenir une clé](https://ai.google.dev/))

### Étapes d'installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/VOTRE_USERNAME/SpeachToText.git
   cd SpeachToText
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**

   Créez un fichier `.env` à la racine du projet :
   ```env
   VITE_GEMINI_API_KEY=votre_clé_api_gemini_ici
   ```

4. **Lancer l'application en développement**
   ```bash
   npm run dev
   ```

5. **Ouvrir dans le navigateur**

   L'application sera accessible sur `http://localhost:5173`

## 🛠️ Technologies utilisées

- **React 18** - Bibliothèque UI
- **Vite** - Build tool ultra-rapide
- **TailwindCSS** - Framework CSS utility-first
- **Google Gemini AI** - Modèle d'IA pour l'analyse de texte
- **Web Speech API** - Reconnaissance vocale native
- **jsPDF** - Génération de PDF
- **Lucide React** - Icônes modernes

## 📦 Build pour la production

```bash
npm run build
```

Les fichiers optimisés seront générés dans le dossier `dist/`.

## 🌐 Déploiement

### Déploiement sur Vercel

```bash
npm install -g vercel
vercel
```

### Déploiement sur Netlify

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

### Déploiement sur GitHub Pages

```bash
npm install --save-dev gh-pages
npm run deploy
```

⚠️ **Important** : N'oubliez pas de configurer la variable d'environnement `VITE_GEMINI_API_KEY` dans les paramètres de votre plateforme de déploiement.

## 🎯 Utilisation

1. **Sélectionner la langue source** et la langue cible
2. **Activer la traduction** si nécessaire
3. **Cliquer sur "Commencer"** pour démarrer la transcription
4. **Parler dans le microphone** - Le texte apparaîtra en temps réel
5. **Analyser avec l'IA** - Cliquer sur le bouton pour obtenir une analyse
6. **Exporter** - Sauvegarder en PDF, texte ou audio

## 📝 Langues supportées

- 🇫🇷 Français
- 🇺🇸 Anglais
- 🇪🇸 Espagnol
- 🇩🇪 Allemand
- 🇮🇹 Italien
- 🇸🇦 Arabe

## 🔐 Sécurité

- Les clés API sont stockées dans des variables d'environnement
- Le fichier `.env` est exclu du contrôle de version
- Aucune donnée n'est envoyée à des serveurs tiers (sauf Google Gemini pour l'analyse)

## 📄 Licence

Copyright © Michel ESPARSA - 15/01/2025

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📧 Contact

Pour toute question ou suggestion, n'hésitez pas à me contacter.

---

Développé avec ❤️ par Michel ESPARSA
