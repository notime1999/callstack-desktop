import { Injectable, inject, signal, effect } from '@angular/core';
import SimplePeer, { SignalData } from 'simple-peer';
import { TeamService } from './team.service';
import { SocketService } from './socket.service';
import { Player, VoiceMode, PlayerRole, VOICE_RULES } from '../../shared/types';

interface PeerConnection {
  peerId: string;
  peer: SimplePeer.Instance;
  stream?: MediaStream;
  gainNode?: GainNode;
  audioSource?: MediaStreamAudioSourceNode;
}

interface DuckingState {
  enabled: boolean;
  prioritySpeakers: Set<string>;
  duckingLevel: number; // 0.0 to 1.0
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private teamService = inject(TeamService);
  private socketService = inject(SocketService);

  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerConnection>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGainNode: GainNode | null = null;

  // Ducking state
  private duckingState: DuckingState = {
    enabled: true,
    prioritySpeakers: new Set(),
    duckingLevel: 0.25 // When ducking, reduce to 25% volume
  };

  // State
  private _isMuted = signal(false);
  private _isTalking = signal(false);
  private _isInitialized = signal(false);
  private _isDucked = signal(false);

  readonly isMuted = this._isMuted.asReadonly();
  readonly isTalking = this._isTalking.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isDucked = this._isDucked.asReadonly();

  constructor() {
    // React to voice mode changes
    effect(() => {
      const mode = this.teamService.voiceMode();
      if (this._isInitialized()) {
        this.applyVoiceMode(mode);
      }
    });
  }

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

      // Create master gain node for overall volume control
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = 1.0;

      // Start speaking detection
      this.detectSpeaking();

      // Listen for WebRTC signals
      this.setupSignalHandlers();

      // Listen for player speaking updates (for ducking)
      this.setupDuckingHandlers();

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

    // Create gain node for this peer (for ducking control)
    if (this.audioContext) {
      const conn = this.peers.get(peerId);
      if (conn) {
        try {
          const source = this.audioContext.createMediaStreamSource(stream);
          const gainNode = this.audioContext.createGain();
          gainNode.gain.value = 1.0;
          
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          conn.audioSource = source;
          conn.gainNode = gainNode;
          
          console.log(`[VoiceService] Created gain node for peer ${peerId}`);
        } catch (err) {
          console.error(`[VoiceService] Failed to create gain node for peer ${peerId}:`, err);
        }
      }
    }
  }

  private removePeer(peerId: string): void {
    const conn = this.peers.get(peerId);
    if (conn) {
      conn.peer.destroy();
      
      // Disconnect audio nodes
      if (conn.gainNode) {
        conn.gainNode.disconnect();
      }
      if (conn.audioSource) {
        conn.audioSource.disconnect();
      }
      
      this.peers.delete(peerId);

      // Remove from priority speakers if present
      this.duckingState.prioritySpeakers.delete(peerId);

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

  // Voice mode handling - automatically mute/unmute based on role and mode
  applyVoiceMode(mode: VoiceMode): void {
    const currentPlayer = this.teamService.currentPlayer();
    if (!currentPlayer) return;

    const rules = VOICE_RULES[mode];
    const canSpeak = rules.canSpeak[currentPlayer.role];
    const hasPriority = rules.hasPriority.includes(currentPlayer.role);

    console.log(`[VoiceService] Applying voice mode: ${mode}, canSpeak: ${canSpeak}, hasPriority: ${hasPriority}`);

    // Mute/unmute based on role permissions
    if (!canSpeak) {
      this.mute();
      console.log(`[VoiceService] Auto-muted: ${currentPlayer.role} cannot speak in ${mode} mode`);
    } else if (this._isMuted() && canSpeak) {
      // Only auto-unmute if player was muted due to mode change, not manual mute
      // For now, we don't auto-unmute to respect manual mutes
    }

    // Update ducking settings
    this.duckingState.enabled = rules.duckingEnabled;
    
    // Apply ducking to other players if I'm not priority
    if (rules.duckingEnabled && !hasPriority) {
      this.setDucked(true);
    } else {
      this.setDucked(false);
    }
  }

  // Setup handlers for IGL priority ducking
  private setupDuckingHandlers(): void {
    // When any player's speaking state changes, update ducking
    this.socketService.on('player-updated', (player: Player) => {
      this.handlePlayerSpeakingUpdate(player);
    });
  }

  // Handle when another player starts/stops speaking
  private handlePlayerSpeakingUpdate(player: Player): void {
    const currentPlayer = this.teamService.currentPlayer();
    if (!currentPlayer || player.id === currentPlayer.id) return;

    const mode = this.teamService.voiceMode();
    const rules = VOICE_RULES[mode];

    // Check if the speaking player has priority
    const speakerHasPriority = rules.hasPriority.includes(player.role);
    const iAmPriority = rules.hasPriority.includes(currentPlayer.role);

    if (speakerHasPriority && player.isSpeaking) {
      // Priority player started speaking
      this.duckingState.prioritySpeakers.add(player.id);
      
      // If I'm not priority, duck my outgoing audio and incoming audio
      if (!iAmPriority && rules.duckingEnabled) {
        this.applyDuckingToAllPeers(true);
        console.log(`[VoiceService] Priority player ${player.name} speaking - ducking enabled`);
      }
    } else if (speakerHasPriority && !player.isSpeaking) {
      // Priority player stopped speaking
      this.duckingState.prioritySpeakers.delete(player.id);
      
      // If no more priority speakers, restore audio
      if (this.duckingState.prioritySpeakers.size === 0) {
        this.applyDuckingToAllPeers(false);
        console.log(`[VoiceService] No priority speakers - ducking disabled`);
      }
    }
  }

  // Set ducking state for local player's perception
  private setDucked(ducked: boolean): void {
    this._isDucked.set(ducked);
    
    // Apply to master gain if we have audio context
    if (this.masterGainNode) {
      const targetGain = ducked ? this.duckingState.duckingLevel : 1.0;
      // Smooth transition over 100ms
      this.masterGainNode.gain.linearRampToValueAtTime(
        targetGain,
        this.audioContext!.currentTime + 0.1
      );
    }
  }

  // Apply ducking to all peer audio
  private applyDuckingToAllPeers(enabled: boolean): void {
    const targetGain = enabled ? this.duckingState.duckingLevel : 1.0;
    
    this.peers.forEach((conn) => {
      if (conn.gainNode && this.audioContext) {
        // Smooth transition over 100ms
        conn.gainNode.gain.linearRampToValueAtTime(
          targetGain,
          this.audioContext.currentTime + 0.1
        );
      } else {
        // Fallback to HTML audio element volume
        const audio = document.getElementById(`audio-${conn.peerId}`) as HTMLAudioElement;
        if (audio) {
          audio.volume = targetGain;
        }
      }
    });
  }

  // Check if current player can speak in current mode
  canCurrentPlayerSpeak(): boolean {
    const player = this.teamService.currentPlayer();
    const mode = this.teamService.voiceMode();
    if (!player) return false;
    return VOICE_RULES[mode].canSpeak[player.role];
  }

  // Check if current player has priority
  hasCurrentPlayerPriority(): boolean {
    const player = this.teamService.currentPlayer();
    const mode = this.teamService.voiceMode();
    if (!player) return false;
    return VOICE_RULES[mode].hasPriority.includes(player.role);
  }

  private applyDucking(enabled: boolean): void {
    // Reduce volume of non-priority speakers
    this.applyDuckingToAllPeers(enabled);
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
    this.peers.forEach((conn) => {
      conn.peer.destroy();
      conn.gainNode?.disconnect();
      conn.audioSource?.disconnect();
    });
    this.peers.clear();

    // Clear ducking state
    this.duckingState.prioritySpeakers.clear();

    // Disconnect master gain
    this.masterGainNode?.disconnect();
    this.masterGainNode = null;

    // Close audio context
    this.audioContext?.close();
    this.audioContext = null;

    this._isInitialized.set(false);
    console.log('[VoiceService] Destroyed');
  }
}
