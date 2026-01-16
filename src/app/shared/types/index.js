// ============ ENUMS ============
export const VOICE_RULES = {
    default: {
        mode: 'default',
        canSpeak: { igl: true, caller: true, player: true, coach: false },
        hasPriority: ['igl'],
        duckingEnabled: true
    },
    clutch: {
        mode: 'clutch',
        canSpeak: { igl: true, caller: false, player: false, coach: false },
        hasPriority: ['igl'],
        duckingEnabled: false
    },
    prep: {
        mode: 'prep',
        canSpeak: { igl: true, caller: false, player: false, coach: true },
        hasPriority: ['igl', 'coach'],
        duckingEnabled: false
    }
};
export const DEFAULT_HOTKEYS = {
    defaultMode: 'F1',
    clutchMode: 'F2',
    prepMode: 'F3',
    pushToTalk: 'Space',
    toggleMute: 'M',
    markDead: 'D'
};
