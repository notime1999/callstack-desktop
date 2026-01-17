import { Component, OnInit, OnDestroy, signal, Output, EventEmitter } from '@angular/core';
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
        
        <div class="test-buttons">
          <button class="test-btn" (click)="testOutput()">
            🔊 Test Sound
          </button>
          <button 
            class="test-btn" 
            [class.active]="isLoopbackActive()"
            (click)="toggleVoiceTest()">
            {{ isLoopbackActive() ? '🔴 Stop Voice Test' : '🎤 Test Your Voice' }}
          </button>
        </div>
      </div>

      <!-- Voice Test Modal -->
      @if (isLoopbackActive()) {
        <div class="voice-test-panel">
          <div class="voice-test-header">
            <span>🎤 Voice Test Active</span>
            <span class="voice-test-hint">You should hear yourself speaking</span>
          </div>
          <div class="voice-test-meter">
            <div class="voice-test-bar" [style.width.%]="micLevel()"></div>
          </div>
          <button class="stop-test-btn" (click)="toggleVoiceTest()">
            Stop Test
          </button>
        </div>
      }

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
          <input type="checkbox" [(ngModel)]="noiseSuppression" (ngModelChange)="onSettingChange()">
          <span>Noise Suppression</span>
        </label>
      </div>

      <!-- Echo Cancellation -->
      <div class="setting-group">
        <label class="option-toggle">
          <input type="checkbox" [(ngModel)]="echoCancellation" (ngModelChange)="onSettingChange()">
          <span>Echo Cancellation</span>
        </label>
      </div>

      <!-- Push-to-talk -->
      <div class="setting-group">
        <label class="setting-label">Voice Activation</label>
        <div class="voice-mode-options">
          <label class="radio-option" [class.selected]="voiceActivation === 'ptt'">
            <input type="radio" name="voiceMode" value="ptt" [(ngModel)]="voiceActivation" (ngModelChange)="onSettingChange()">
            Push-to-Talk
          </label>
          <label class="radio-option" [class.selected]="voiceActivation === 'vad'">
            <input type="radio" name="voiceMode" value="vad" [(ngModel)]="voiceActivation" (ngModelChange)="onSettingChange()">
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
            [(ngModel)]="vadSensitivity"
            (ngModelChange)="onSettingChange()">
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

    .test-buttons {
      display: flex;
      gap: 8px;
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
      transition: all 0.2s;
    }

    .test-btn:hover {
      background: #444;
    }

    .test-btn.active {
      background: #ef4444;
      color: #fff;
    }

    .test-btn.active:hover {
      background: #dc2626;
    }

    .voice-test-panel {
      background: #252542;
      border: 2px solid #6366f1;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .voice-test-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .voice-test-header span:first-child {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .voice-test-hint {
      font-size: 12px;
      color: #888;
    }

    .voice-test-meter {
      height: 12px;
      background: #1a1a2e;
      border-radius: 6px;
      overflow: hidden;
    }

    .voice-test-bar {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
      transition: width 0.05s;
    }

    .stop-test-btn {
      padding: 10px 20px;
      background: #ef4444;
      border: none;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }

    .stop-test-btn:hover {
      background: #dc2626;
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
export class AudioSettingsComponent implements OnInit, OnDestroy {
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
  isLoopbackActive = signal(false);

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
  
  // Loopback audio elements
  private loopbackAudioContext: AudioContext | null = null;
  private loopbackStream: MediaStream | null = null;
  private loopbackAudioElement: HTMLAudioElement | null = null;

  async ngOnInit(): Promise<void> {
    this.loadSavedSettings();
    await this.loadDevices();
    await this.startMicTest();
  }

  private loadSavedSettings(): void {
    try {
      const saved = localStorage.getItem('clutch-audio-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.selectedInput = settings.inputDevice || '';
        this.selectedOutput = settings.outputDevice || '';
        this.inputVolume = settings.inputVolume ?? 100;
        this.noiseSuppression = settings.noiseSuppression ?? true;
        this.echoCancellation = settings.echoCancellation ?? true;
        this.voiceActivation = settings.voiceActivation || 'ptt';
        this.vadSensitivity = settings.vadSensitivity ?? 50;
        console.log('[AudioSettings] Loaded saved settings:', settings);
      }
    } catch (error) {
      console.error('[AudioSettings] Failed to load saved settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settings = {
        inputDevice: this.selectedInput,
        outputDevice: this.selectedOutput,
        inputVolume: this.inputVolume,
        noiseSuppression: this.noiseSuppression,
        echoCancellation: this.echoCancellation,
        voiceActivation: this.voiceActivation,
        vadSensitivity: this.vadSensitivity
      };
      localStorage.setItem('clutch-audio-settings', JSON.stringify(settings));
      console.log('[AudioSettings] Saved settings:', settings);
    } catch (error) {
      console.error('[AudioSettings] Failed to save settings:', error);
    }
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

      // Set defaults only if not already set from saved settings
      if (!this.selectedInput && inputs.length > 0) {
        this.selectedInput = inputs[0].deviceId;
      }
      if (!this.selectedOutput && outputs.length > 0) {
        this.selectedOutput = outputs[0].deviceId;
      }
      
      // Verify saved devices still exist, otherwise use default
      if (this.selectedInput && !inputs.find(d => d.deviceId === this.selectedInput)) {
        this.selectedInput = inputs.length > 0 ? inputs[0].deviceId : '';
      }
      if (this.selectedOutput && !outputs.find(d => d.deviceId === this.selectedOutput)) {
        this.selectedOutput = outputs.length > 0 ? outputs[0].deviceId : '';
      }
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

  onSettingChange(): void {
    this.saveSettings();
    this.emitSettings();
  }

  testOutput(): void {
    // Generate a test beep sound using Web Audio API
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 440; // A4 note
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
    
    // Play a second beep after a short pause
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 554.37; // C#5 note
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.5);
      
      setTimeout(() => ctx.close(), 600);
    }, 200);
  }

  async toggleVoiceTest(): Promise<void> {
    if (this.isLoopbackActive()) {
      this.stopLoopback();
    } else {
      await this.startLoopback();
    }
  }

  private async startLoopback(): Promise<void> {
    try {
      // Get microphone stream
      this.loopbackStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: this.selectedInput || undefined,
          echoCancellation: false, // Disable for loopback
          noiseSuppression: this.noiseSuppression,
          autoGainControl: true
        }
      });

      // Create audio element for playback
      this.loopbackAudioElement = new Audio();
      this.loopbackAudioElement.srcObject = this.loopbackStream;
      
      // Set output device if supported
      if (this.selectedOutput && 'setSinkId' in this.loopbackAudioElement) {
        await (this.loopbackAudioElement as any).setSinkId(this.selectedOutput);
      }
      
      this.loopbackAudioElement.play();
      this.isLoopbackActive.set(true);
      
      console.log('[AudioSettings] Voice loopback started');
    } catch (error) {
      console.error('[AudioSettings] Failed to start loopback:', error);
      this.stopLoopback();
    }
  }

  private stopLoopback(): void {
    if (this.loopbackAudioElement) {
      this.loopbackAudioElement.pause();
      this.loopbackAudioElement.srcObject = null;
      this.loopbackAudioElement = null;
    }
    
    if (this.loopbackStream) {
      this.loopbackStream.getTracks().forEach(track => track.stop());
      this.loopbackStream = null;
    }
    
    if (this.loopbackAudioContext) {
      this.loopbackAudioContext.close();
      this.loopbackAudioContext = null;
    }
    
    this.isLoopbackActive.set(false);
    console.log('[AudioSettings] Voice loopback stopped');
  }

  private stopMicTest(): void {
    this.micStream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
    this.micStream = null;
    this.audioContext = null;
    this.analyser = null;
  }

  private emitSettings(): void {
    this.saveSettings();
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
    this.stopLoopback();
  }
}
