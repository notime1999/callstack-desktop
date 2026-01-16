import { Component, OnInit, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

@Component({
  selector: 'app-audio-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audio-settings">
      <h3>🎧 Audio Settings</h3>

      <!-- Microphone -->
      <div class="setting-group">
        <label class="setting-label">Microphone</label>
        <select 
          class="setting-select"
          [(ngModel)]="selectedInput"
          (ngModelChange)="onInputChange()">
          @for (device of inputDevices(); track device.deviceId) {
            <option [value]="device.deviceId">{{ device.label }}</option>
          }
        </select>
        
        <!-- Mic Level -->
        <div class="level-meter">
          <div class="level-bar" [style.width.%]="micLevel()"></div>
        </div>
        <span class="level-hint">Speak to test</span>
      </div>

      <!-- Output -->
      <div class="setting-group">
        <label class="setting-label">Output Device</label>
        <select 
          class="setting-select"
          [(ngModel)]="selectedOutput"
          (ngModelChange)="onOutputChange()">
          @for (device of outputDevices(); track device.deviceId) {
            <option [value]="device.deviceId">{{ device.label }}</option>
          }
        </select>
        
        <button class="test-btn" (click)="testOutput()">
          🔊 Test Sound
        </button>
      </div>

      <!-- Input Volume -->
      <div class="setting-group">
        <label class="setting-label">Input Volume</label>
        <input 
          type="range" 
          class="volume-slider"
          min="0" 
          max="100" 
          [(ngModel)]="inputVolume"
          (ngModelChange)="onVolumeChange()">
        <span class="volume-value">{{ inputVolume }}%</span>
      </div>

      <!-- Noise Suppression -->
      <div class="setting-group">
        <label class="option-toggle">
          <input type="checkbox" [(ngModel)]="noiseSuppression">
          <span>Noise Suppression</span>
        </label>
      </div>

      <!-- Echo Cancellation -->
      <div class="setting-group">
        <label class="option-toggle">
          <input type="checkbox" [(ngModel)]="echoCancellation">
          <span>Echo Cancellation</span>
        </label>
      </div>

      <!-- Push-to-talk -->
      <div class="setting-group">
        <label class="setting-label">Voice Activation</label>
        <div class="voice-mode-options">
          <label class="radio-option" [class.selected]="voiceActivation === 'ptt'">
            <input type="radio" name="voiceMode" value="ptt" [(ngModel)]="voiceActivation">
            Push-to-Talk
          </label>
          <label class="radio-option" [class.selected]="voiceActivation === 'vad'">
            <input type="radio" name="voiceMode" value="vad" [(ngModel)]="voiceActivation">
            Voice Activity
          </label>
        </div>
      </div>

      @if (voiceActivation === 'vad') {
        <div class="setting-group">
          <label class="setting-label">Sensitivity</label>
          <input 
            type="range" 
            class="volume-slider"
            min="0" 
            max="100" 
            [(ngModel)]="vadSensitivity">
          <span class="volume-value">{{ vadSensitivity }}%</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .audio-settings {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
      background: #1a1a2e;
      border-radius: 12px;
    }

    h3 {
      margin: 0 0 8px;
      font-size: 16px;
      color: #fff;
    }

    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .setting-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .setting-select {
      padding: 10px 12px;
      background: #252542;
      border: 1px solid #333;
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    .setting-select:focus {
      outline: none;
      border-color: #6366f1;
    }

    .level-meter {
      height: 8px;
      background: #252542;
      border-radius: 4px;
      overflow: hidden;
    }

    .level-bar {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
      transition: width 0.1s;
    }

    .level-hint {
      font-size: 11px;
      color: #666;
    }

    .test-btn {
      padding: 8px 16px;
      background: #333;
      border: none;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      align-self: flex-start;
    }

    .test-btn:hover {
      background: #444;
    }

    .volume-slider {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      background: #252542;
      border-radius: 3px;
      outline: none;
    }

    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: #6366f1;
      border-radius: 50%;
      cursor: pointer;
    }

    .volume-value {
      font-size: 12px;
      color: #888;
      align-self: flex-end;
    }

    .option-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .option-toggle input {
      width: 18px;
      height: 18px;
      accent-color: #6366f1;
    }

    .option-toggle span {
      font-size: 14px;
      color: #ccc;
    }

    .voice-mode-options {
      display: flex;
      gap: 12px;
    }

    .radio-option {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: #252542;
      border: 2px solid #333;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      color: #aaa;
    }

    .radio-option input { display: none; }

    .radio-option.selected {
      border-color: #6366f1;
      color: #fff;
      background: #6366f120;
    }
  `]
})
export class AudioSettingsComponent implements OnInit {
  @Output() settingsChange = new EventEmitter<{
    inputDevice: string;
    outputDevice: string;
    inputVolume: number;
    noiseSuppression: boolean;
    echoCancellation: boolean;
    voiceActivation: 'ptt' | 'vad';
    vadSensitivity: number;
  }>();

  inputDevices = signal<AudioDevice[]>([]);
  outputDevices = signal<AudioDevice[]>([]);
  micLevel = signal(0);

  selectedInput = '';
  selectedOutput = '';
  inputVolume = 100;
  noiseSuppression = true;
  echoCancellation = true;
  voiceActivation: 'ptt' | 'vad' = 'ptt';
  vadSensitivity = 50;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadDevices();
    await this.startMicTest();
  }

  private async loadDevices(): Promise<void> {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputs = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`,
          kind: 'audioinput' as const
        }));

      const outputs = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 4)}`,
          kind: 'audiooutput' as const
        }));

      this.inputDevices.set(inputs);
      this.outputDevices.set(outputs);

      // Set defaults
      if (inputs.length > 0) this.selectedInput = inputs[0].deviceId;
      if (outputs.length > 0) this.selectedOutput = outputs[0].deviceId;
    } catch (error) {
      console.error('Failed to load audio devices:', error);
    }
  }

  private async startMicTest(): Promise<void> {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: this.selectedInput }
      });

      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.updateMicLevel();
    } catch (error) {
      console.error('Failed to start mic test:', error);
    }
  }

  private updateMicLevel(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      this.micLevel.set(Math.min(100, average * 1.5));

      requestAnimationFrame(update);
    };

    update();
  }

  async onInputChange(): Promise<void> {
    // Restart mic test with new device
    this.stopMicTest();
    await this.startMicTest();
    this.emitSettings();
  }

  onOutputChange(): void {
    this.emitSettings();
  }

  onVolumeChange(): void {
    this.emitSettings();
  }

  testOutput(): void {
    // Play test sound
    const audio = new Audio('assets/sounds/test-sound.mp3');
    if (this.selectedOutput && 'setSinkId' in audio) {
      (audio as any).setSinkId(this.selectedOutput);
    }
    audio.play();
  }

  private stopMicTest(): void {
    this.micStream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
    this.micStream = null;
    this.audioContext = null;
    this.analyser = null;
  }

  private emitSettings(): void {
    this.settingsChange.emit({
      inputDevice: this.selectedInput,
      outputDevice: this.selectedOutput,
      inputVolume: this.inputVolume,
      noiseSuppression: this.noiseSuppression,
      echoCancellation: this.echoCancellation,
      voiceActivation: this.voiceActivation,
      vadSensitivity: this.vadSensitivity
    });
  }

  ngOnDestroy(): void {
    this.stopMicTest();
  }
}
