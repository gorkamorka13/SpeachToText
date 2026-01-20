import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel

app = Flask(__name__)
CORS(app)  # Autorise les requêtes depuis votre application React

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
        # Transcription
        segments, info = model.transcribe(temp_path, beam_size=5)

        full_text = ""
        for segment in segments:
            full_text += segment.text + " "

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
    # Lance le serveur sur le port 5000
    print("Serveur Whisper prêt sur http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)
