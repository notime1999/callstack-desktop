import { Injectable, signal } from '@angular/core';
import { VoiceEvent, RecordingMarker, MatchRecording, VoiceMode } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class RecordingService {
  private _isRecording = signal(false);
  private _currentRecording = signal<MatchRecording | null>(null);

  private events: VoiceEvent[] = [];
  private markers: RecordingMarker[] = [];
  private audioChunks: Blob[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private startTime: Date | null = null;

  readonly isRecording = this._isRecording.asReadonly();
  readonly currentRecording = this._currentRecording.asReadonly();

  async startRecording(_teamId: string, audioStream: MediaStream): Promise<void> {
    if (this._isRecording()) return;

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
    } catch (error) {
      console.error('[RecordingService] Failed to start recording:', error);
      throw error;
    }
  }

  stopRecording(): MatchRecording | null {
    if (!this._isRecording() || !this.startTime) return null;

    this.mediaRecorder?.stop();

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);

    const recording: MatchRecording = {
      matchId: crypto.randomUUID(),
      teamId: '', // Set by caller
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
  logVoiceModeChange(mode: VoiceMode): void {
    if (!this._isRecording()) return;

    this.events.push({
      timestamp: this.getCurrentTimestamp(),
      type: 'mode-change',
      data: { mode }
    });
  }

  logPlayerSpeak(playerId: string, playerName: string): void {
    if (!this._isRecording()) return;

    this.events.push({
      timestamp: this.getCurrentTimestamp(),
      type: 'player-speak',
      data: { playerId, playerName }
    });
  }

  // Add markers
  addMarker(type: RecordingMarker['type'], label?: string): void {
    if (!this._isRecording()) return;

    this.markers.push({
      timestamp: this.getCurrentTimestamp(),
      type,
      label
    });

    console.log('[RecordingService] Marker added:', type, label);
  }

  addClutchMarker(): void {
    this.addMarker('clutch', 'Clutch situation');
  }

  addTeamfightMarker(): void {
    this.addMarker('teamfight', 'Teamfight');
  }

  addTimeoutMarker(): void {
    this.addMarker('timeout', 'Timeout');
  }

  addCustomMarker(label: string): void {
    this.addMarker('custom', label);
  }

  // Get audio blob for playback/export
  async getAudioBlob(): Promise<Blob | null> {
    if (this.audioChunks.length === 0) return null;

    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }

  // Export recording
  async exportRecording(format: 'json' | 'audio' = 'json'): Promise<void> {
    const recording = this._currentRecording();
    if (!recording) return;

    if (format === 'json') {
      const data = JSON.stringify(recording, null, 2);
      this.downloadFile(data, `match-${recording.matchId}.json`, 'application/json');
    } else {
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
  getEventsInRange(startTime: number, endTime: number): VoiceEvent[] {
    return this.events.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  // Get markers by type
  getMarkersByType(type: RecordingMarker['type']): RecordingMarker[] {
    return this.markers.filter(m => m.type === type);
  }

  private getCurrentTimestamp(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Playback
  private audioElement: HTMLAudioElement | null = null;
  private _isPlaying = signal(false);
  private _playbackTime = signal(0);

  readonly isPlaying = this._isPlaying.asReadonly();
  readonly playbackTime = this._playbackTime.asReadonly();

  async initPlayback(): Promise<void> {
    const blob = await this.getAudioBlob();
    if (!blob) return;

    this.audioElement = new Audio(URL.createObjectURL(blob));

    this.audioElement.ontimeupdate = () => {
      this._playbackTime.set(Math.floor(this.audioElement!.currentTime));
    };

    this.audioElement.onended = () => {
      this._isPlaying.set(false);
    };
  }

  play(): void {
    this.audioElement?.play();
    this._isPlaying.set(true);
  }

  pause(): void {
    this.audioElement?.pause();
    this._isPlaying.set(false);
  }

  seekTo(time: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
      this._playbackTime.set(time);
    }
  }

  destroyPlayback(): void {
    this.audioElement?.pause();
    if (this.audioElement?.src) {
      URL.revokeObjectURL(this.audioElement.src);
    }
    this.audioElement = null;
    this._isPlaying.set(false);
    this._playbackTime.set(0);
  }
}
