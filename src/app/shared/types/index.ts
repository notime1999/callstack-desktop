// ============ ENUMS ============

export type GameType = 'cs2' | 'valorant' | 'lol';

export type PlayerRole = 'igl' | 'caller' | 'player' | 'coach';

export type VoiceMode = 'lobby' | 'default' | 'clutch' | 'prep';

export type PlayerStatus = 'ready' | 'no-mic' | 'listen-only' | 'in-match';

export type TeamStatus = 'idle' | 'in-match' | 'review';

// ============ CORE ENTITIES ============

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  status: PlayerStatus;
  isMuted: boolean;
  isSpeaking: boolean;
  isAlive: boolean;
}

export interface Team {
  id: string;
  name: string;
  game: GameType;
  status: TeamStatus;
  leaderId: string;
  players: Player[];
  maxPlayers: number;
}

export interface MatchState {
  teamId: string;
  voiceMode: VoiceMode;
  startedAt: Date;
  isRecording: boolean;
  overlayEnabled: boolean;
}

// ============ VOICE RULES ============

export interface VoiceRules {
  mode: VoiceMode;
  canSpeak: Record<PlayerRole, boolean>;
  hasPriority: PlayerRole[];
  duckingEnabled: boolean;
}

export const VOICE_RULES: Record<VoiceMode, VoiceRules> = {
  lobby: {
    mode: 'lobby',
    canSpeak: { igl: true, caller: true, player: true, coach: true },
    hasPriority: [],
    duckingEnabled: false
  },
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
    duckingEnabled: true
  }
};

// ============ SOCKET EVENTS ============

export interface ServerToClientEvents {
  'team-state': (team: Team) => void;
  'player-joined': (player: Player) => void;
  'player-left': (playerId: string) => void;
  'player-updated': (player: Player) => void;
  'voice-mode-changed': (mode: VoiceMode) => void;
  'match-started': (state: MatchState) => void;
  'match-ended': () => void;
  'webrtc-offer': (data: { from: string; signal: unknown }) => void;
  'webrtc-answer': (data: { from: string; signal: unknown }) => void;
  'webrtc-ice': (data: { from: string; candidate: unknown }) => void;
}

export interface ClientToServerEvents {
  'join-team': (teamId: string, player: Omit<Player, 'id'>) => void;
  'leave-team': () => void;
  'update-player': (update: Partial<Player>) => void;
  'change-role': (playerId: string, role: PlayerRole) => void;
  'change-voice-mode': (mode: VoiceMode) => void;
  'start-match': (options: { recording: boolean; overlay: boolean }) => void;
  'end-match': () => void;
  'webrtc-offer': (data: { to: string; signal: unknown }) => void;
  'webrtc-answer': (data: { to: string; signal: unknown }) => void;
  'webrtc-ice': (data: { to: string; candidate: unknown }) => void;
}

// ============ HOTKEYS ============

export interface HotkeyConfig {
  defaultMode: string;
  clutchMode: string;
  prepMode: string;
  pushToTalk: string;
  toggleMute: string;
  markDead: string;
}

export const DEFAULT_HOTKEYS: HotkeyConfig = {
  defaultMode: 'F1',
  clutchMode: 'F2',
  prepMode: 'F3',
  pushToTalk: 'Space',
  toggleMute: 'M',
  markDead: 'D'
};

// ============ RECORDING ============

export interface VoiceEvent {
  timestamp: number;
  type: 'mode-change' | 'player-speak' | 'marker';
  data: unknown;
}

export interface MatchRecording {
  matchId: string;
  teamId: string;
  startedAt: Date;
  endedAt: Date;
  duration: number;
  events: VoiceEvent[];
  markers: RecordingMarker[];
}

export interface RecordingMarker {
  timestamp: number;
  type: 'clutch' | 'teamfight' | 'timeout' | 'custom';
  label?: string;
}
