var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject, signal } from '@angular/core';
import SimplePeer from 'simple-peer';
import { TeamService } from './team.service';
import { SocketService } from './socket.service';
import { VOICE_RULES } from '../../shared/types';
let VoiceService = class VoiceService {
    constructor() {
        this.teamService = inject(TeamService);
        this.socketService = inject(SocketService);
        this.localStream = null;
        this.peers = new Map();
        this.audioContext = null;
        this.analyser = null;
        // State
        this._isMuted = signal(false);
        this._isTalking = signal(false);
        this._isInitialized = signal(false);
        this.isMuted = this._isMuted.asReadonly();
        this.isTalking = this._isTalking.asReadonly();
        this.isInitialized = this._isInitialized.asReadonly();
    }
    async initialize() {
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
        }
        catch (error) {
            console.error('[VoiceService] Failed to initialize:', error);
            throw error;
        }
    }
    setupSignalHandlers() {
        console.log('[VoiceService] Setting up signal handlers');
        // Incoming offer
        this.socketService.on('webrtc-offer', (data) => {
            this.handleIncomingOffer(data.from, data.signal);
        });
        // Incoming answer
        this.socketService.on('webrtc-answer', (data) => {
            const conn = this.peers.get(data.from);
            if (conn) {
                conn.peer.signal(data.signal);
            }
        });
        // ICE candidates
        this.socketService.on('webrtc-ice', (data) => {
            const conn = this.peers.get(data.from);
            if (conn) {
                conn.peer.signal(data.candidate);
            }
        });
        // Player joined - initiate connection
        this.socketService.on('player-joined', (player) => {
            this.createPeerConnection(player.id, true);
        });
        // Player left - cleanup
        this.socketService.on('player-left', (playerId) => {
            this.removePeer(playerId);
        });
    }
    createPeerConnection(peerId, initiator) {
        if (this.peers.has(peerId) || !this.localStream)
            return;
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
        peer.on('signal', (signal) => {
            console.log(`[VoiceService] Sending signal to ${peerId}:`, signal.type || 'ice-candidate');
            if (signal.type === 'offer') {
                this.socketService.emit('webrtc-offer', { to: peerId, signal });
            }
            else if (signal.type === 'answer') {
                this.socketService.emit('webrtc-answer', { to: peerId, signal });
            }
            else {
                this.socketService.emit('webrtc-ice', { to: peerId, candidate: signal });
            }
        });
        peer.on('connect', () => {
            console.log(`[VoiceService] Peer ${peerId} connected!`);
        });
        peer.on('stream', (stream) => {
            console.log(`[VoiceService] Received stream from ${peerId}`);
            const conn = this.peers.get(peerId);
            if (conn) {
                conn.stream = stream;
                this.playRemoteStream(peerId, stream);
            }
        });
        peer.on('error', (err) => {
            console.error(`[VoiceService] Peer ${peerId} error:`, err.message);
            this.removePeer(peerId);
        });
        peer.on('close', () => {
            console.log(`[VoiceService] Peer ${peerId} closed`);
            this.removePeer(peerId);
        });
        this.peers.set(peerId, { peerId, peer });
    }
    handleIncomingOffer(from, signal) {
        if (!this.peers.has(from)) {
            this.createPeerConnection(from, false);
        }
        const conn = this.peers.get(from);
        if (conn) {
            conn.peer.signal(signal);
        }
    }
    playRemoteStream(peerId, stream) {
        // Create audio element for this peer
        let audio = document.getElementById(`audio-${peerId}`);
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = `audio-${peerId}`;
            audio.autoplay = true;
            document.body.appendChild(audio);
        }
        audio.srcObject = stream;
    }
    removePeer(peerId) {
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
    detectSpeaking() {
        if (!this.analyser)
            return;
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const threshold = 30; // Adjust sensitivity
        const check = () => {
            if (!this.analyser)
                return;
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
    updateSpeakingState(isSpeaking) {
        const currentPlayer = this.teamService.currentPlayer();
        if (currentPlayer) {
            this.socketService.emit('update-player', { isSpeaking });
        }
    }
    // Voice mode handling
    applyVoiceMode(mode) {
        const currentPlayer = this.teamService.currentPlayer();
        if (!currentPlayer)
            return;
        const rules = VOICE_RULES[mode];
        const canSpeak = rules.canSpeak[currentPlayer.role];
        if (!canSpeak) {
            this.mute();
        }
        // Apply ducking if enabled
        if (rules.duckingEnabled && !rules.hasPriority.includes(currentPlayer.role)) {
            this.applyDucking(true);
        }
        else {
            this.applyDucking(false);
        }
    }
    applyDucking(enabled) {
        // Reduce volume of non-priority speakers
        this.peers.forEach((conn) => {
            const audio = document.getElementById(`audio-${conn.peerId}`);
            if (audio) {
                audio.volume = enabled ? 0.3 : 1.0;
            }
        });
    }
    // Public controls
    startTalking() {
        if (!this.teamService.canSpeak())
            return;
        this.unmute();
    }
    stopTalking() {
        // For push-to-talk
        this.mute();
    }
    toggleMute() {
        if (this._isMuted()) {
            this.unmute();
        }
        else {
            this.mute();
        }
    }
    mute() {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });
        }
        this._isMuted.set(true);
    }
    unmute() {
        if (!this.teamService.canSpeak())
            return;
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
        }
        this._isMuted.set(false);
    }
    destroy() {
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
};
VoiceService = __decorate([
    Injectable({ providedIn: 'root' })
], VoiceService);
export { VoiceService };
