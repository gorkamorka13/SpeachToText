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
});