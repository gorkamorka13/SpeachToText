import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AudioSourceSelect from './AudioSourceSelect';

const inputs = [
    { id: 'mic1', label: 'Microphone (Realtek(R) Audio)' },
    { id: 'mix1', label: 'Stereo Mix (Realtek(R) Audio)' }
];

const setup = (props = {}) => {
    const onChange = vi.fn();
    render(<AudioSourceSelect audioSource="mic" audioInputId="" audioInputs={inputs} onChange={onChange} {...props} />);
    return { onChange, select: screen.getByRole('combobox', { name: 'Source audio' }) };
};

describe('AudioSourceSelect', () => {
    it('regroupe les entrées audio et le partage d\'onglet dans une seule liste', () => {
        setup();

        expect(screen.getByRole('option', { name: '🎙️ Entrée par défaut de Windows' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '🎙️ Microphone (Realtek(R) Audio)' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '🖥️ Audio système / onglet' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Entrées audio' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: "Partage d'onglet ou d'écran" })).toBeInTheDocument();
    });

    it('signale Stereo Mix comme le son du PC', () => {
        setup();

        expect(screen.getByRole('option', { name: '🔊 Stereo Mix (Realtek(R) Audio) · son du PC' })).toBeInTheDocument();
    });

    it('sélectionne l\'entrée par défaut au départ', () => {
        const { select } = setup();

        expect(select).toHaveValue('mic:');
    });

    it('reflète l\'entrée choisie', () => {
        const { select } = setup({ audioInputId: 'mix1' });

        expect(select).toHaveValue('mic:mix1');
    });

    it('choisir une entrée renvoie la source « micro » et cette entrée', () => {
        const { onChange, select } = setup();

        fireEvent.change(select, { target: { value: 'mic:mix1' } });

        expect(onChange).toHaveBeenCalledWith({ source: 'mic', inputId: 'mix1' });
    });

    it('choisir le partage d\'onglet ne touche pas à l\'entrée mémorisée', () => {
        const { onChange, select } = setup({ audioInputId: 'mix1' });

        fireEvent.change(select, { target: { value: 'system' } });

        expect(onChange).toHaveBeenCalledWith({ source: 'system' });
    });

    it('l\'option de mixage nomme l\'entrée utilisée', () => {
        setup({ audioSource: 'both', audioInputId: 'mic1' });

        expect(screen.getByRole('option', { name: '🔀 Microphone (Realtek(R) Audio) + onglet' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Source audio' })).toHaveValue('both');
    });

    it('le mixage sans entrée choisie utilise l\'entrée par défaut', () => {
        setup({ audioSource: 'both' });

        expect(screen.getByRole('option', { name: '🔀 Entrée par défaut de Windows + onglet' })).toBeInTheDocument();
    });

    it('signale une entrée mémorisée qui n\'est plus disponible', () => {
        const { select } = setup({ audioInputId: 'disparue' });

        expect(screen.getByRole('option', { name: '⚠️ Entrée choisie (introuvable)' })).toBeInTheDocument();
        expect(select).toHaveValue('mic:disparue');
    });

    it('est verrouillée pendant l\'enregistrement', () => {
        const { select } = setup({ disabled: true });

        expect(select).toBeDisabled();
    });
});
