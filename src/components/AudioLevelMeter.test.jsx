import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AudioLevelMeter from './AudioLevelMeter';

describe('AudioLevelMeter', () => {
    it('displays the level percentage when the monitor is active', () => {
        render(<AudioLevelMeter volumeLevel={64} status="live" />);
        expect(screen.getByText('Niveau Signal')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.queryByText('Micro bloqué')).not.toBeInTheDocument();
    });

    it('defaults to the active state when no status is provided', () => {
        render(<AudioLevelMeter volumeLevel={0} />);
        expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('shows a permission message when the microphone is denied', () => {
        render(<AudioLevelMeter volumeLevel={100} status="denied" />);
        expect(screen.getByText('Micro bloqué')).toBeInTheDocument();
        expect(screen.getByText(/Autorisez le microphone/)).toBeInTheDocument();
        // Le pourcentage est masqué tant que le micro est inaccessible
        expect(screen.queryByText('78%')).not.toBeInTheDocument();
    });

    it('shows the initialization state before the monitor is ready', () => {
        render(<AudioLevelMeter volumeLevel={0} status="idle" />);
        expect(screen.getByText('Initialisation...')).toBeInTheDocument();
    });

    it('shows an unsupported state on browsers without getUserMedia', () => {
        render(<AudioLevelMeter volumeLevel={0} status="unsupported" />);
        expect(screen.getByText('Non supporté')).toBeInTheDocument();
        expect(screen.queryByText(/Autorisez le microphone/)).not.toBeInTheDocument();
    });

    it('place le trait du seuil de silence sur la même échelle que les barres', () => {
        render(<AudioLevelMeter volumeLevel={0} status="live" threshold={32} />);
        // 32 / 128 = 25 %
        expect(screen.getByTestId('silence-threshold').style.left).toBe('25%');
    });

    it('masque le trait sans seuil (arrêt auto désactivé) ou micro inaccessible', () => {
        const { rerender } = render(<AudioLevelMeter volumeLevel={0} status="live" threshold={null} />);
        expect(screen.queryByTestId('silence-threshold')).not.toBeInTheDocument();

        rerender(<AudioLevelMeter volumeLevel={0} status="denied" threshold={10} />);
        expect(screen.queryByTestId('silence-threshold')).not.toBeInTheDocument();
    });

    it('affiche la source mesurée quand elle est précisée', () => {
        render(<AudioLevelMeter volumeLevel={10} status="live" label="audio système" />);
        expect(screen.getByText(/audio système/)).toBeInTheDocument();
        expect(screen.getByText(/Niveau Signal/)).toBeInTheDocument();
    });
});