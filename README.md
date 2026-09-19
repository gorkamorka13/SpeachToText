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

### 🎚️ Sources Audio
- **Liste unique « source audio »** (barre d'outils, icône haut-parleur) : choisissez d'où vient le son — une **entrée audio** (micro Realtek, webcam, **Stereo Mix**…, ou l'entrée par défaut de Windows), **🖥️ Audio système / onglet** (partage d'un onglet ou d'un écran), ou **🔀 entrée + onglet**. Le choix est mémorisé et verrouillé pendant l'enregistrement ; le vu-mètre affiche le nom de l'entrée mesurée.
- **Audio système** : capture le son d'un **onglet** du navigateur (Chrome, Edge, Firefox) — choisissez un onglet et cochez « Partager l'audio ». L'app vous **avertit** si le partage ne contient aucune piste audio (cas d'un écran entier partagé sous Chrome), et en source « système seul », un partage annulé **annule l'enregistrement** au lieu de produire un fichier muet.
- **Enregistrer le son du PC sans micro** (vidéo, lecteur, appel) : activez **Stereo Mix** dans Windows (Paramètres du son → Plus de paramètres de son → Enregistrement → clic droit → *Afficher les périphériques désactivés* → *Stereo Mix* → *Activer*), puis choisissez-le dans la liste (« 🔊 Stereo Mix · son du PC »). Il ne capte que ce qui sort sur les haut-parleurs de **sa** carte son (pas ceux d'un écran HDMI) : envoyez le lecteur vers cette sortie dans le mélangeur de volume de Windows. Pour ce type d'entrée, l'annulation d'écho et la suppression de bruit sont coupées afin de ne pas altérer la musique ou les vidéos.
- **Le contrôle automatique du gain est désactivé** sur les flux micro : sous Chrome/Windows, il réécrit sinon le volume d'entrée de Windows en continu.
- **Le VU-mètre et l'arrêt sur silence mesurent le mixage réellement enregistré** (micro + audio système), pas seulement le micro.
- ⚠️ **Limites** : Safari ne fournit **aucun** audio système (utilisez le microphone) ; le mode **Live** (`SpeechRecognition`) est verrouillé sur le micro par défaut de l'OS — pour transcrire l'audio système, utilisez le mode **Post** (Gemini/Whisper traitent le mixage). En source « Micro + Système » avec haut-parleurs, la même voix peut être captée deux fois : un casque est conseillé.

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
