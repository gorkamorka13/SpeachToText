# 🎤 My Encounter - Speech-to-Text & AI Agent

Une plateforme web de pointe pour la transcription, la traduction et l'analyse intelligente de contenu audio, propulsée par l'intelligence artificielle Google Gemini.

![My Encounter Preview](https://img.shields.io/badge/Status-Version%202.0-blue?style=for-the-badge&logo=react)
![Technology](https://img.shields.io/badge/Powered%20By-Gemini%202.0-purple?style=for-the-badge&logo=google-gemini)

## ✨ Fonctionnalités Avancées

### 🚀 Modes de Transcription Hybrides
- **Mode Live (Rapide)** : Utilise l'API Web Speech native pour une transcription instantanée à l'écran. Idéal pour les prises de notes rapides.
- **Mode Post (Précis)** : Utilise **Gemini 2.0 Flash** pour transcrire directement des fichiers audio enregistrés. Offre une précision chirurgicale et une meilleure gestion de la ponctuation.

### 🤖 Intelligence Artificielle "Encounter"
- **Analyse Automatique** : Système de correction intelligent intégré (Orthographe, syntaxe, suppression des espaces/sauts de ligne inutiles).
- **Mise en forme intelligente** : Identification automatique des paragraphes et structuration du texte.
- **Agent Personnalisable** : Modifiez les instructions de l'IA et le modèle utilisé (Gemini 2.0, 2.5, etc.) directement dans les paramètres.

### ⏱️ Automatisation & Sécurité
- **Support Multilingue Complet** : Transcription et traduction supportant les scripts complexes, dont l'**Arabe** avec gestion intelligente du Right-to-Left (RTL).
- **Arrêt Automatique sur Silence** : Détecte les pauses de 15 secondes et déclenche automatiquement l'arrêt de l'enregistrement.
- **Flux de Sauvegarde Automatique** : En un seul clic (ou automatiquement), génère et télécharge :
  - Un rapport **PDF "Encounter"** : Mise en page professionnelle avec support **BiDi** (plus d'inversion des mots latins dans les textes arabes).
  - Un fichier **Texte Brut (.txt)**.
  - Un document **Word (.docx)** (Mise en page éditable).
  - L'enregistrement **Audio Haute Qualité (.webm)**.
- **Historique Local** : Stockage sécurisé de vos sessions directement dans votre navigateur.

### 📊 Interface de Contrôle Premium
- **VU-mètre en Temps Réel** : Visualisez l'intensité du signal micro grâce à une barre de niveau LED dynamique.
- **Capture Multi-Sources** : Choix entre le microphone seul ou le mix Microphone + Audio Système.
- **Design Adaptatif** : Interface moderne "Glassmorphism" compatible avec le Mode Sombre (Dark Mode) et parfaitement optimisée pour mobile.

## 🚀 Installation & Déploiement

### Prérequis
- Node.js 18+
- Clé API Google Gemini ([ai.google.dev](https://ai.google.dev/))

### Installation rapide
```bash
# Installation
git clone https://github.com/votre-compte/my-encounter.git
cd my-encounter
npm install

# Configuration (.env)
VITE_GEMINI_API_KEY=votre_cle_ici

# Lancement
npm run dev
```

### Déploiement (Vite / Netlify / GitHub Pages)
L'application utilise des chemins relatifs (`base: './'`), ce qui la rend portable sur n'importe quel service de déploiement sans configuration supplémentaire des chemins.

## 📄 Licence & Crédits
Copyright © Michel ESPARSA - 2026.
Version : __APP_VERSION__

---
Développé avec ❤️ pour une expérience de transcription ultime.
