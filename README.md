# 🎤 My Encounter - Speech-to-Text & AI Agent

Une plateforme web de pointe pour la transcription, la traduction et l'analyse intelligente de contenu audio, propulsée par l'intelligence artificielle Google Gemini.

![My Encounter Preview](https://img.shields.io/badge/Status-Version%202.0-blue?style=for-the-badge&logo=react)
![Technology](https://img.shields.io/badge/Powered%20By-Gemini%202.0-purple?style=for-the-badge&logo=google-gemini)

## ✨ Fonctionnalités Avancées

### 🚀 Modes de Transcription Hybrides
- **Google Gemini (Cloud)** : Utilise **Gemini 2.0 Flash** pour une transcription ultra-rapide et précise via le cloud. (Activé par défaut)
- **Whisper (Local)** : Transcription privée et hors-ligne utilisant le modèle **OpenAI Whisper** via un serveur local Python.
    - *Avantages* : Confidentialité totale, pas de coût API.
    - *Prérequis* : Serveur Python (inclus) doit être lancé.

### 🤖 Intelligence Artificielle "Encounter"
- **Analyse Automatique** : Système de correction intelligent intégré (Orthographe, syntaxe, suppression des espaces/sauts de ligne inutiles).
- **Mise en forme intelligente** : Identification automatique des paragraphes et structuration du texte.
- **Agent Personnalisable** : Modifiez les instructions de l'IA et le modèle utilisé (Gemini 2.0, 2.5, etc.) directement dans les paramètres.

### ⏱️ Automatisation & Sécurité
- **Support Multilingue Complet** : Transcription et traduction supportant les scripts complexes, dont l'**Arabe** avec gestion intelligente du Right-to-Left (RTL).
- **Exports Professionnels** :
  - **PDF Justifié** : Rapports PDF avec support complet de l'arabe et options de justification.
  - **Email Assistant** : Workflow intégré pour préparer et envoyer vos rapports par email.
  - **Word & TXT** : Formats éditables pour une flexibilité maximale.
- **Arrêt Automatique sur Silence** : Détecte les pauses de 15 secondes et arrête l'enregistrement.
- **Historique Local** : Stockage sécurisé de vos sessions dans le navigateur.

### 📊 Interface de Contrôle Premium
- **VU-mètre en Temps Réel** : Visualisez l'intensité du signal micro.
- **Token Counter** : Suivez votre consommation de tokens Gemini.
- **Design Adaptatif** : Interface "Glassmorphism" avec Mode Sombre/Clair automatique.

## 🚀 Installation & Déploiement

### Prérequis
- **Navigateur Google Chrome** (Recommandé pour une compatibilité audio optimale)
- **Node.js 18+**
- **Clé API Google Gemini** ([ai.google.dev](https://ai.google.dev/))
- **Python 3.8+** (Uniquement pour le mode Whisper Local)

### Installation rapide

#### 1. Application Web (React)
```bash
# Installation
git clone https://github.com/votre-compte/speech-to-text.git
cd speech-to-text
npm install

# Configuration (.env)
VITE_GEMINI_API_KEY=votre_cle_ici

# Lancement
npm run dev
```

#### 2. Serveur Whisper (Optionnel - Pour mode Local)
Si vous souhaitez utiliser la transcription locale :

```bash
# Installation des dépendances Python
pip install flask flask-cors faster-whisper

# Lancement du serveur (Port 5000)
python whisper_server.py
```
*Note : Le serveur doit rester ouvert pendant l'utilisation du mode Local.*

### Déploiement
L'application est prête pour **Netlify**, **Vercel** ou **GitHub Pages**.
Pour la production, le mode Cloud (Gemini) est recommandé car il ne nécessite pas de backend Python.

## 📄 Licence & Crédits
Copyright © Michel ESPARSA - 2026.
Développé avec ❤️ pour une expérience de transcription ultime.
