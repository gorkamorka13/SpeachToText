# 🎤 My Encounter - Speech-to-Text & AI Agent

Une plateforme web de pointe pour la transcription, la traduction et l'analyse intelligente de contenu audio, propulsée par l'intelligence artificielle Google Gemini.

![My Encounter Preview](https://img.shields.io/badge/Status-Version%202.0-blue?style=for-the-badge&logo=react)
![Technology](https://img.shields.io/badge/Powered%20By-Gemini%202.0-purple?style=for-the-badge&logo=google-gemini)

## ✨ Fonctionnalités Avancées

### 🚀 Modes de Transcription Hybrides
- **Google Gemini (Cloud)** : Utilise **Gemini 2.0 Flash** pour une transcription ultra-rapide et précise via le cloud.
    - *Support Large* : Gère désormais les fichiers ultra-volumineux jusqu'à **389 Mo** (et plus) grâce à un système de conversion par segments (chunking).
    - *Compatibilité WebM* : Normalisation automatique des flux `video/webm` en `audio/webm` pour une acceptation sans erreur par l'IA.
- **Whisper (Local)** : Transcription privée et hors-ligne utilisant le modèle **OpenAI Whisper** via un serveur local Python.
    - *Avantages* : Confidentialité totale, pas de coût API, supporte les fichiers sans limite de taille.

### 🤖 Intelligence Artificielle "Encounter"
- **Analyse Automatique** : Système de correction intelligent intégré (Orthographe, syntaxe, restructuration).
- **Mise en forme intelligente** : Identification automatique des paragraphes et des points clés.
- **Agent Personnalisable** : Modifiez les instructions et le modèle (Flash, Pro) directement dans l'interface.

### ⏱️ Automatisation & Exports
- **Nommage Personnalisé** : Nouveau champ "Nom du fichier" pour personnaliser vos exports TXT, PDF, Word et Audio.
- **PDF Professionnel** :
  - **Justification Réelle** : Algorithme de justification sur-mesure pour un rendu parfait (support colonnes & multilingue).
  - **Support RTL** : Gestion avancée de l'Arabe et des écritures de droite à gauche.
- **Persistance des Réglages** : Vos choix (langue, moteur, modèle, URL Whisper) sont sauvegardés localement.
- **Arrêt Automatique sur Silence** : Détection des pauses prolongées (15s) pour stopper et sauvegarder.

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
