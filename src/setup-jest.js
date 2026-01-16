import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
setupZoneTestEnv();
// Mock Electron API
Object.defineProperty(window, 'electronAPI', {
    value: {
        minimize: jest.fn(),
        maximize: jest.fn(),
        close: jest.fn(),
        toggleOverlay: jest.fn(),
        updateOverlay: jest.fn(),
        onHotkey: jest.fn(),
        removeHotkeyListener: jest.fn(),
        onOverlayData: jest.fn()
    },
    writable: true
});
// Mock MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getUserMedia: jest.fn().mockResolvedValue({
            getTracks: () => [],
            getAudioTracks: () => [{ enabled: true, stop: jest.fn() }]
        }),
        enumerateDevices: jest.fn().mockResolvedValue([])
    },
    writable: true
});
// Mock AudioContext
class MockAudioContext {
    constructor() {
        this.createMediaStreamSource = jest.fn().mockReturnValue({
            connect: jest.fn()
        });
        this.createAnalyser = jest.fn().mockReturnValue({
            fftSize: 256,
            frequencyBinCount: 128,
            getByteFrequencyData: jest.fn()
        });
        this.close = jest.fn();
    }
}
global.AudioContext = MockAudioContext;
