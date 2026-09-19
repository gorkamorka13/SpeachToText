import React, { memo } from 'react';
import {
  encodeAudioChoice,
  decodeAudioChoice,
  describeAudioInput,
  isLoopbackInputLabel
} from '../utils/audioUtils';

// Les popups natifs des <select> ne sont pas stylés par Tailwind : on force les
// couleurs des <option>/<optgroup> pour rester lisible en mode sombre.
const OPTION_CLASS = 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100';

const inputOptionLabel = (input) =>
  isLoopbackInputLabel(input.label) ? `🔊 ${input.label} · son du PC` : `🎙️ ${input.label}`;

/**
 * Liste unique « d'où vient le son » : une entrée audio (micro, Stereo Mix…),
 * le partage d'un onglet/écran, ou une entrée + un onglet.
 * Remplace l'ancien couple « source » + « entrée » qui faisait doublon.
 */
const AudioSourceSelect = memo(({
  audioSource,
  audioInputId = '',
  audioInputs = [],
  onChange,
  disabled = false,
  className = ''
}) => {
  const missingInput = Boolean(audioInputId) && !audioInputs.some(input => input.id === audioInputId);
  const inputName = describeAudioInput(audioInputs, audioInputId);

  return (
    <select
      aria-label="Source audio"
      value={encodeAudioChoice(audioSource, audioInputId)}
      onChange={(e) => onChange(decodeAudioChoice(e.target.value))}
      disabled={disabled}
      className={className}
    >
      <optgroup label="Entrées audio" className={OPTION_CLASS}>
        <option value="mic:" className={OPTION_CLASS}>🎙️ Entrée par défaut de Windows</option>
        {audioInputs.map(input => (
          <option key={input.id} value={`mic:${input.id}`} className={OPTION_CLASS}>{inputOptionLabel(input)}</option>
        ))}
        {missingInput && (
          <option value={`mic:${audioInputId}`} className={OPTION_CLASS}>⚠️ Entrée choisie (introuvable)</option>
        )}
      </optgroup>
      <optgroup label="Partage d'onglet ou d'écran" className={OPTION_CLASS}>
        <option value="system" className={OPTION_CLASS}>🖥️ Audio système / onglet</option>
        <option value="both" className={OPTION_CLASS}>{`🔀 ${inputName} + onglet`}</option>
      </optgroup>
    </select>
  );
});

export default AudioSourceSelect;
