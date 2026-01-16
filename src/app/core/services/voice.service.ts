import { Injectable, inject, signal } from '@angular/core';
import SimplePeer, { SignalData } from 'simple-peer';
import { TeamService } from './team.service';
import { SocketService } from './socket.service';
import { Player, VoiceMode, VOICE_RULES } from '../../shared/types';

interface PeerConnection {
  peerId: string;
  peer: SimplePeer.Instance;
  stream?: MediaStream;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private teamService = inject(TeamService);
  private socketService = inject(SocketService);

  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerConnection>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  // State
  private _isMuted = signal(false);
  private _isTalking = signal(false);
  private _isInitialized = signal(false);

  readonly isMuted = this._isMuted.asReadonly();
  readonly isTalking = this._isTalking.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();

  async initialize(): Promise<void> {
    // Don't initialize twice
    if (this._isInitialized()) {
      console.log('[VoiceService] Already initialized, skipping');
      return;
    }

    try {
      console.log('[VoiceService] Initializing...');
      
      // Get microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('[VoiceService] Got microphone access');

      // Setup audio analysis for speaking detection
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // Start speaking detection
      this.detectSpeaking();

      // Listen for WebRTC signals
      this.setupSignalHandlers();

      this._isInitialized.set(true);
      console.log('[VoiceService] Initialized successfully');
    } catch (error) {
      console.error('[VoiceService] Failed to initialize:', error);
      throw error;
    }
  }

  private setupSignalHandlers(): void {
    console.log('[VoiceService] Setting up signal handlers');
    
    // Incoming offer
    this.socketService.on('webrtc-offer', (data: { from: string; signal: unknown }) => {
      this.handleIncomingOffer(data.from, data.signal as SignalData);
    });

    // Incoming answer
    this.socketService.on('webrtc-answer', (data: { from: string; signal: unknown }) => {
      const conn = this.peers.get(data.from);
      if (conn) {
        conn.peer.signal(data.signal as SignalData);
      }
    });

    // ICE candidates
    this.socketService.on('webrtc-ice', (data: { from: string; candidate: unknown }) => {
      const conn = this.peers.get(data.from);
      if (conn) {
        conn.peer.signal(data.candidate as SignalData);
      }
    });

    // Player joined - initiate connection
    this.socketService.on('player-joined', (player: Player) => {
      this.createPeerConnection(player.id, true);
    });

    // Player left - cleanup
    this.socketService.on('player-left', (playerId: string) => {
      this.removePeer(playerId);
    });
  }

  createPeerConnection(peerId: string, initiator: boolean): void {
    if (this.peers.has(peerId) || !this.localStream) return;

    console.log(`[VoiceService] Creating peer connection to ${peerId}, initiator: ${initiator}`);

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: true,
      config: {
        iceServers: [
          // STUN servers (free, for NAT traversal discovery)
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Free TURN servers (for symmetric NAT fallback)
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      }
    });

    peer.on('signal', (signal: SignalData) => {
      console.log(`[VoiceService] Sending signal to ${peerId}:`, signal.type || 'ice-candidate');
      if (signal.type === 'offer') {
        this.socketService.emit('webrtc-offer', { to: peerId, signal });
      } else if (signal.type === 'answer') {
        this.socketService.emit('webrtc-answer', { to: peerId, signal });
      } else {
        this.socketService.emit('webrtc-ice', { to: peerId, candidate: signal });
      }
    });

    peer.on('connect', () => {
      console.log(`[VoiceService] Peer ${peerId} connected!`);
    });

    peer.on('stream', (stream: MediaStream) => {
      console.log(`[VoiceService] Received stream from ${peerId}`);
      const conn = this.peers.get(peerId);
      if (conn) {
        conn.stream = stream;
        this.playRemoteStream(peerId, stream);
      }
    });

    peer.on('error', (err: Error) => {
      console.error(`[VoiceService] Peer ${peerId} error:`, err.message);
      this.removePeer(peerId);
    });

    peer.on('close', () => {
      console.log(`[VoiceService] Peer ${peerId} closed`);
      this.removePeer(peerId);
    });

    this.peers.set(peerId, { peerId, peer });
  }

  private handleIncomingOffer(from: string, signal: SignalData): void {
    if (!this.peers.has(from)) {
      this.createPeerConnection(from, false);
    }
    const conn = this.peers.get(from);
    if (conn) {
      conn.peer.signal(signal);
    }
  }

  private playRemoteStream(peerId: string, stream: MediaStream): void {
    // Create audio element for this peer
    let audio = document.getElementById(`audio-${peerId}`) as HTMLAudioElement;
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = `audio-${peerId}`;
      audio.autoplay = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = stream;
  }

  private removePeer(peerId: string): void {
    const conn = this.peers.get(peerId);
    if (conn) {
      conn.peer.destroy();
      this.peers.delete(peerId);

      // Remove audio element
      const audio = document.getElementById(`audio-${peerId}`);
      audio?.remove();
    }
  }

  // Speaking detection
  private detectSpeaking(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const threshold = 30; // Adjust sensitivity

    const check = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      const isSpeaking = average > threshold && !this._isMuted();

      if (isSpeaking !== this._isTalking()) {
        this._isTalking.set(isSpeaking);
        this.updateSpeakingState(isSpeaking);
      }

      requestAnimationFrame(check);
    };

    check();
  }

  private updateSpeakingState(isSpeaking: boolean): void {
    const currentPlayer = this.teamService.currentPlayer();
    if (currentPlayer) {
      this.socketService.emit('update-player', { isSpeaking });
    }
  }

  // Voice mode handling
  applyVoiceMode(mode: VoiceMode): void {
    const currentPlayer = this.teamService.currentPlayer();
    if (!currentPlayer) return;

    const rules = VOICE_RULES[mode];
    const canSpeak = rules.canSpeak[currentPlayer.role];

    if (!canSpeak) {
      this.mute();
    }

    // Apply ducking if enabled
    if (rules.duckingEnabled && !rules.hasPriority.includes(currentPlayer.role)) {
      this.applyDucking(true);
    } else {
      this.applyDucking(false);
    }
  }

  private applyDucking(enabled: boolean): void {
    // Reduce volume of non-priority speakers
    this.peers.forEach((conn) => {
      const audio = document.getElementById(`audio-${conn.peerId}`) as HTMLAudioElement;
      if (audio) {
        audio.volume = enabled ? 0.3 : 1.0;
      }
    });
  }

  // Public controls
  startTalking(): void {
    if (!this.teamService.canSpeak()) return;
    this.unmute();
  }

  stopTalking(): void {
    // For push-to-talk
    this.mute();
  }

  toggleMute(): void {
    if (this._isMuted()) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  mute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
    this._isMuted.set(true);
  }

  unmute(): void {
    if (!this.teamService.canSpeak()) return;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
    this._isMuted.set(false);
  }

  destroy(): void {
    // Stop local stream
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;

    // Close all peer connections
    this.peers.forEach((conn) => conn.peer.destroy());
    this.peers.clear();

    // Close audio context
    this.audioContext?.close();
    this.audioContext = null;

    this._isInitialized.set(false);
    console.log('[VoiceService] Destroyed');
  }
}
