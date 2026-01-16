var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, signal } from '@angular/core';
let RecordingService = class RecordingService {
    constructor() {
        this._isRecording = signal(false);
        this._currentRecording = signal(null);
        this.events = [];
        this.markers = [];
        this.audioChunks = [];
        this.mediaRecorder = null;
        this.startTime = null;
        this.isRecording = this._isRecording.asReadonly();
        this.currentRecording = this._currentRecording.asReadonly();
        // Playback
        this.audioElement = null;
        this._isPlaying = signal(false);
        this._playbackTime = signal(0);
        this.isPlaying = this._isPlaying.asReadonly();
        this.playbackTime = this._playbackTime.asReadonly();
    }
    async startRecording(_teamId, audioStream) {
        if (this._isRecording())
            return;
        this.events = [];
        this.markers = [];
        this.audioChunks = [];
        this.startTime = new Date();
        // Setup audio recording
        try {
            this.mediaRecorder = new MediaRecorder(audioStream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            this.mediaRecorder.start(1000); // Chunk every second
            this._isRecording.set(true);
            console.log('[RecordingService] Started recording');
        }
        catch (error) {
            console.error('[RecordingService] Failed to start recording:', error);
            throw error;
        }
    }
    stopRecording() {
        if (!this._isRecording() || !this.startTime)
            return null;
        this.mediaRecorder?.stop();
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);
        const recording = {
            matchId: crypto.randomUUID(),
            teamId: '',
            startedAt: this.startTime,
            endedAt: endTime,
            duration,
            events: [...this.events],
            markers: [...this.markers]
        };
        this._currentRecording.set(recording);
        this._isRecording.set(false);
        console.log('[RecordingService] Stopped recording', recording);
        return recording;
    }
    // Log events during recording
    logVoiceModeChange(mode) {
        if (!this._isRecording())
            return;
        this.events.push({
            timestamp: this.getCurrentTimestamp(),
            type: 'mode-change',
            data: { mode }
        });
    }
    logPlayerSpeak(playerId, playerName) {
        if (!this._isRecording())
            return;
        this.events.push({
            timestamp: this.getCurrentTimestamp(),
            type: 'player-speak',
            data: { playerId, playerName }
        });
    }
    // Add markers
    addMarker(type, label) {
        if (!this._isRecording())
            return;
        this.markers.push({
            timestamp: this.getCurrentTimestamp(),
            type,
            label
        });
        console.log('[RecordingService] Marker added:', type, label);
    }
    addClutchMarker() {
        this.addMarker('clutch', 'Clutch situation');
    }
    addTeamfightMarker() {
        this.addMarker('teamfight', 'Teamfight');
    }
    addTimeoutMarker() {
        this.addMarker('timeout', 'Timeout');
    }
    addCustomMarker(label) {
        this.addMarker('custom', label);
    }
    // Get audio blob for playback/export
    async getAudioBlob() {
        if (this.audioChunks.length === 0)
            return null;
        return new Blob(this.audioChunks, { type: 'audio/webm' });
    }
    // Export recording
    async exportRecording(format = 'json') {
        const recording = this._currentRecording();
        if (!recording)
            return;
        if (format === 'json') {
            const data = JSON.stringify(recording, null, 2);
            this.downloadFile(data, `match-${recording.matchId}.json`, 'application/json');
        }
        else {
            const audioBlob = await this.getAudioBlob();
            if (audioBlob) {
                const url = URL.createObjectURL(audioBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `match-${recording.matchId}.webm`;
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    }
    // Get events in time range
    getEventsInRange(startTime, endTime) {
        return this.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
    }
    // Get markers by type
    getMarkersByType(type) {
        return this.markers.filter(m => m.type === type);
    }
    getCurrentTimestamp() {
        if (!this.startTime)
            return 0;
        return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    }
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    async initPlayback() {
        const blob = await this.getAudioBlob();
        if (!blob)
            return;
        this.audioElement = new Audio(URL.createObjectURL(blob));
        this.audioElement.ontimeupdate = () => {
            this._playbackTime.set(Math.floor(this.audioElement.currentTime));
        };
        this.audioElement.onended = () => {
            this._isPlaying.set(false);
        };
    }
    play() {
        this.audioElement?.play();
        this._isPlaying.set(true);
    }
    pause() {
        this.audioElement?.pause();
        this._isPlaying.set(false);
    }
    seekTo(time) {
        if (this.audioElement) {
            this.audioElement.currentTime = time;
            this._playbackTime.set(time);
        }
    }
    destroyPlayback() {
        this.audioElement?.pause();
        if (this.audioElement?.src) {
            URL.revokeObjectURL(this.audioElement.src);
        }
        this.audioElement = null;
        this._isPlaying.set(false);
        this._playbackTime.set(0);
    }
};
RecordingService = __decorate([
    Injectable({ providedIn: 'root' })
], RecordingService);
export { RecordingService };
