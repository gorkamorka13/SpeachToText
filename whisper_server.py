import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel

app = Flask(__name__)

# ------------------------------------------------------------------
# CORS restreint : uniquement les origines de l'application web
# (dev Vite :5173, preview :4173). Surchargable via la variable
# d'environnement WHISPER_ALLOWED_ORIGIN (séparées par des virgules),
# ex. pour autoriser l'app déployée :
# WHISPER_ALLOWED_ORIGIN=https://mon-site.github.io
# ------------------------------------------------------------------
_allowed_origins = [
    o.strip() for o in os.environ.get(
        "WHISPER_ALLOWED_ORIGIN",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
    ).split(",")
    if o.strip()
]
CORS(app, origins=_allowed_origins or [])

# ------------------------------------------------------------------
# Token partagé OPTIONNEL : si la variable d'environnement WHISPER_TOKEN
# est définie, chaque requête /transcribe doit porter l'en-tête
# X-Whisper-Token avec la même valeur. Ce token se saisit dans les
# Paramètres de l'application (section Whisper Local).
# ------------------------------------------------------------------
WHISPER_TOKEN = os.environ.get("WHISPER_TOKEN", "").strip()

@app.before_request
def _check_shared_token():
    # Le endpoint /health reste libre (vérification de disponibilité)
    if request.path == '/health':
        return None
    if WHISPER_TOKEN and request.headers.get('X-Whisper-Token', '') != WHISPER_TOKEN:
        return jsonify({"error": "Accès refusé : token invalide ou manquant (en-tête X-Whisper-Token)"}), 401

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "token_required": bool(WHISPER_TOKEN)})

# Taille maximale d'un upload (défaut 500 Mo, ajustable via WHISPER_MAX_MB)
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get("WHISPER_MAX_MB", "500")) * 1024 * 1024

# Vous pouvez ajuster le modèle ici (tiny, base, small, medium, large-v3)
# 'base' est un bon compromis vitesse/précision pour une utilisation locale
model_size = "base"
print(f"Chargement du modèle Whisper '{model_size}'...")
model = WhisperModel(model_size, device="cpu", compute_type="int8")
print("Modèle chargé !")

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio_file' not in request.files:
        return jsonify({"error": "Aucun fichier audio trouvé"}), 400

    audio_file = request.files['audio_file']

    # Création d'un fichier temporaire pour stocker l'audio reçu
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        audio_file.save(temp_audio.name)
        temp_path = temp_audio.name

    try:
        # Transcription avec vad_filter pour accélérer grandement en ignorant les silences
        print("Début du traitement de l'audio...", flush=True)
        # Using a generator avoids loading all segments into memory before returning
        segments, info = model.transcribe(temp_path, beam_size=2, vad_filter=True)

        print(f"Langue détectée: {info.language} ({info.language_probability:.2f})", flush=True)

        full_text = ""
        for segment in segments:
            full_text += segment.text + " "
            # Afficher l'avancement dans la console Python pour montrer que ce n'est pas bloqué
            print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}", flush=True)

        print("Traitement terminé, envoi de la réponse au navigateur...", flush=True)
        return jsonify({
            "text": full_text.strip(),
            "language": info.language,
            "language_probability": info.language_probability
        })

    except Exception as e:
        print(f"Erreur durant la transcription : {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Nettoyage du fichier temporaire
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    # N'écoute que sur l'interface locale (127.0.0.1) : le serveur n'est
    # plus accessible depuis les autres machines du réseau local.
    print("Serveur Whisper prêt sur http://127.0.0.1:5000 (interface locale uniquement)")
    if WHISPER_TOKEN:
        print("Protection par token ACTIVEE (X-Whisper-Token)")
    else:
        print("Aucun token configure (WHISPER_TOKEN) : accessible sans authentification en local")
    app.run(host='127.0.0.1', port=5000)
