# 🎤 My Encounter - Speech-to-Text & AI Agent

Une plateforme web de pointe pour la transcription, la traduction et l'analyse intelligente de contenu audio, propulsée par l'intelligence artificielle Google Gemini.

![My Encounter Preview](https://img.shields.io/badge/Status-Version%202.0-blue?style=for-the-badge&logo=react)
![Technology](https://img.shields.io/badge/Powered%20By-Gemini%202.0-purple?style=for-the-badge&logo=google-gemini)

## ✨ Fonctionnalités Avancées

### 🚀 Modes de Transcription Hybrides
- **Google Gemini (Cloud)** : Utilise **Gemini 3.1 Flash Lite** (palier gratuit) pour une transcription ultra-rapide et précise via le cloud.
    - *Support Large* : Gère désormais les fichiers ultra-volumineux jusqu'à **389 Mo** (et plus) grâce à un système de conversion par segments (chunking).
    - *Compatibilité WebM* : Normalisation automatique des flux `video/webm` en `audio/webm` pour une acceptation sans erreur par l'IA.
- **Whisper (Local)** : Transcription privée et hors-ligne utilisant le modèle **OpenAI Whisper** via un serveur local Python.
    - *Avantages* : Confidentialité totale, pas de coût API, supporte les fichiers sans limite de taille.

### 🤖 Intelligence Artificielle "Encounter"
- **Analyse Automatique** : Système de correction intelligent intégré (Orthographe, syntaxe, restructuration).
- **Mise en forme intelligente** : Identification automatique des paragraphes et des points clés.
- **Agent Personnalisable** : Modifiez les instructions et le modèle (modèles gratuits Flash, ou tout modèle via « Autre modèle... ») directement dans l'interface.
- **Multi-fournisseurs gratuit** : Gemini (audio + analyse + traduction) ou OpenRouter (analyse + traduction, modèles `:free`).

### ⏱️ Automatisation & Exports
- **Nommage Personnalisé** : Nouveau champ "Nom du fichier" pour personnaliser vos exports TXT, PDF, Word et Audio.
- **PDF Professionnel** :
  - **Justification Réelle** : Algorithme de justification sur-mesure pour un rendu parfait (support colonnes & multilingue).
  - **Support RTL** : Gestion avancée de l'Arabe et des écritures de droite à gauche.
- **Persistance des Réglages** : Vos choix (langue, moteur, modèle, URL Whisper, durée d'enregistrement) sont sauvegardés localement.
- **Arrêt Automatique sur Silence** : détection des pauses prolongées pour stopper et sauvegarder. Le délai est réglable dans les Paramètres : **30, 40 (défaut) ou 50 secondes**.
- **Durée Maximale d'Enregistrement** : limite configurable (15 min → 3 h, **1 heure par défaut**, ou illimité). À l'échéance, l'enregistrement s'arrête et est sauvegardé automatiquement. Un badge dans la barre d'outils affiche la limite, puis le temps restant pendant l'enregistrement.

### 📊 Interface de Contrôle Premium
- **VU-mètre en Temps Réel** : l'intensité du signal micro est affichée **en permanence** (au repos comme pendant l'enregistrement), grâce à une surveillance continue qui ne dépend pas de l'enregistrement. Si le micro est refusé ou indisponible, le vu-mètre l'indique (« Micro bloqué ») au lieu de rester muet.
- **Token Counter** : Suivez votre consommation de tokens Gemini.
- **Design Adaptatif** : Interface "Glassmorphism" avec Mode Sombre/Clair automatique.

## 🚀 Installation & Déploiement

### Prérequis
- **Navigateur Google Chrome** (Recommandé pour une compatibilité audio optimale)
- **Node.js 18+**
- **Python 3.8+** (Uniquement pour le mode Whisper Local)

### Installation rapide

#### 1. Application Web (React)
```bash
git clone https://github.com/votre-compte/speech-to-text.git
cd speech-to-text
npm install

# Lancement
npm run dev
```

**Au premier lancement** : ouvrez ⚙️ **Paramètres → Fournisseur IA** et collez
votre clé gratuite (Gemini et/ou OpenRouter). C'est la **seule configuration
nécessaire** — aucun fichier de configuration n'est requis.

#### Clés API gratuites & multi-fournisseurs
Deux fournisseurs IA **gratuits** sont intégrés (configurables dans
**Paramètres → Fournisseur IA**, avec un bouton « Tester la connexion ») :

| Fournisseur | Clé gratuite | Modèles gratuits | Notes |
|---|---|---|---|
| **Google Gemini** | [aistudio.google.com](https://aistudio.google.com) | modèles « Flash » (palier gratuit) | Audio ✅, Analyse ✅, Traduction ✅ |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | modèles taggés `:free` (vision) | Analyse ✅, Traduction ✅ — **pas de transcription audio** |

- Les clés sont saisies dans l'application et stockées **localement**
  (localStorage de votre navigateur) — aucun secret n'est incrusté dans le
  build déployé, aucun rebuild nécessaire pour changer de clé.
- La transcription reste assurée par Gemini (cloud) ou Whisper (local).

#### 2. Serveur Whisper (Optionnel - Pour mode Local)
Si vous souhaitez utiliser la transcription locale :

```bash
# Installation des dépendances Python
pip install flask flask-cors faster-whisper

# Lancement du serveur (Port 5000, interface locale uniquement)
python whisper_server.py
```
*Note : Le serveur doit rester ouvert pendant l'utilisation du mode Local.*

**Sécurité (par défaut)** : le serveur n'écoute que sur `127.0.0.1` (inaccessible
depuis le réseau local) et n'accepte que les origines de l'app (Vite :5173/:4173).
Options via variables d'environnement :
- `WHISPER_TOKEN=monsecret` — exige l'en-tête `X-Whisper-Token: monsecret`
  (saisir la même valeur dans **Paramètres → Configuration Whisper Local**)
- `WHISPER_ALLOWED_ORIGIN=https://mon-site.github.io` — autoriser l'app déployée
- `WHISPER_MAX_MB=500` — taille d'upload maximale

#### 3. Qualité & tests
```bash
npm run test        # suite de tests (Vitest + React Testing Library)
npm run test:watch  # mode veille
npm run lint        # ESLint
```

### Déploiement
L'application est prête pour **Netlify**, **Vercel** ou **GitHub Pages**.
Pour la production, le mode Cloud (Gemini) est recommandé car il ne nécessite pas de backend Python.
Le guide pas-à-pas GitHub Pages est dans [`DEPLOYMENT.md`](DEPLOYMENT.md).

## 📄 Licence & Crédits
Copyright © Michel ESPARSA - 2026.
Développé avec ❤️ pour une expérience de transcription ultime.
