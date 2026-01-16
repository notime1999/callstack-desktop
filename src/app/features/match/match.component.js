var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../core/services/team.service';
import { VoiceService } from '../../core/services/voice.service';
let MatchComponent = class MatchComponent {
    constructor() {
        this.teamService = inject(TeamService);
        this.voiceService = inject(VoiceService);
        this.voiceMode = this.teamService.voiceMode;
        this.canSpeak = this.teamService.canSpeak;
        this.players = this.teamService.players;
        this.isIGL = this.teamService.isIGL;
        this.showModeFeedback = false;
    }
    getIGL() {
        return this.players().find((p) => p.role === 'igl');
    }
    onKeyDown(event) {
        // Solo IGL può cambiare modalità
        if (!this.isIGL()) {
            // Ma tutti possono usare PTT e mute
            if (event.code === 'Space') {
                this.voiceService.startTalking();
            }
            return;
        }
        switch (event.key) {
            case 'F1':
                this.changeMode('default');
                break;
            case 'F2':
                this.changeMode('clutch');
                break;
            case 'F3':
                this.changeMode('prep');
                break;
        }
        if (event.code === 'Space') {
            this.voiceService.startTalking();
        }
        if (event.key.toLowerCase() === 'm') {
            this.voiceService.toggleMute();
        }
        if (event.key.toLowerCase() === 'd') {
            const currentPlayer = this.teamService.currentPlayer();
            if (currentPlayer) {
                this.teamService.markDead(currentPlayer.id);
            }
        }
    }
    onKeyUp(event) {
        if (event.code === 'Space') {
            this.voiceService.stopTalking();
        }
    }
    changeMode(mode) {
        this.teamService.setVoiceMode(mode);
        this.showModeFeedback = true;
        setTimeout(() => this.showModeFeedback = false, 1500);
    }
    ngOnInit() {
        // Initialize voice engine
        this.voiceService.initialize();
    }
    ngOnDestroy() {
        this.voiceService.destroy();
    }
};
__decorate([
    HostListener('window:keydown', ['$event'])
], MatchComponent.prototype, "onKeyDown", null);
__decorate([
    HostListener('window:keyup', ['$event'])
], MatchComponent.prototype, "onKeyUp", null);
MatchComponent = __decorate([
    Component({
        selector: 'app-match',
        standalone: true,
        imports: [CommonModule],
        template: `
    <div class="match-container" [class.clutch]="voiceMode() === 'clutch'">
      <!-- Mode Indicator -->
      <div class="mode-indicator">
        <span class="mode-label">MODE:</span>
        <span class="mode-value" [class]="voiceMode()">
          {{ voiceMode() | uppercase }}
        </span>
      </div>

      <!-- IGL Indicator -->
      <div class="igl-indicator">
        <span class="igl-icon">🎙️</span>
        <span class="igl-name">{{ getIGL()?.name ?? 'No IGL' }}</span>
        @if (getIGL()?.isSpeaking) {
          <span class="speaking-dot"></span>
        }
      </div>

      <!-- Hotkey Hints -->
      <div class="hotkey-hints">
        <div class="hotkey" [class.active]="voiceMode() === 'default'">
          <kbd>F1</kbd> Default
        </div>
        <div class="hotkey" [class.active]="voiceMode() === 'clutch'">
          <kbd>F2</kbd> Clutch
        </div>
        <div class="hotkey" [class.active]="voiceMode() === 'prep'">
          <kbd>F3</kbd> Prep
        </div>
      </div>

      <!-- Self Status -->
      <div class="self-status">
        <span class="ptt-hint">
          Push-to-talk: <kbd>SPACE</kbd>
        </span>
        <span class="mute-hint">
          Mute: <kbd>M</kbd>
        </span>
      </div>

      <!-- Can Speak Indicator -->
      <div class="speak-status" [class.can-speak]="canSpeak()" [class.muted]="!canSpeak()">
        {{ canSpeak() ? '🎤 You can speak' : '🔇 Muted by mode' }}
      </div>
    </div>

    <!-- Mode Change Feedback -->
    @if (showModeFeedback) {
      <div class="mode-feedback">
        {{ voiceMode() | uppercase }} MODE ENABLED
      </div>
    }
  `,
        styles: [`
    .match-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #1a1a2e;
      color: #eee;
      border-radius: 12px;
      min-width: 240px;
      font-family: 'Inter', sans-serif;
    }

    .match-container.clutch {
      border: 2px solid #ef4444;
      background: #2a1a1e;
    }

    .mode-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mode-label {
      font-size: 11px;
      color: #888;
    }

    .mode-value {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
    }
    .mode-value.default { background: #22c55e20; color: #22c55e; }
    .mode-value.clutch { background: #ef444420; color: #ef4444; }
    .mode-value.prep { background: #3b82f620; color: #3b82f6; }

    .igl-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #252542;
      border-radius: 6px;
    }

    .speaking-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .hotkey-hints {
      display: flex;
      gap: 8px;
    }

    .hotkey {
      padding: 4px 8px;
      background: #333;
      border-radius: 4px;
      font-size: 11px;
      opacity: 0.6;
    }
    .hotkey.active {
      opacity: 1;
      background: #444;
    }

    kbd {
      padding: 2px 6px;
      background: #555;
      border-radius: 3px;
      font-family: monospace;
    }

    .speak-status {
      padding: 8px;
      border-radius: 6px;
      text-align: center;
      font-size: 12px;
    }
    .speak-status.can-speak { background: #22c55e20; color: #22c55e; }
    .speak-status.muted { background: #ef444420; color: #ef4444; }

    .mode-feedback {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 16px 32px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      animation: fadeOut 1.5s forwards;
    }

    @keyframes fadeOut {
      0% { opacity: 1; }
      70% { opacity: 1; }
      100% { opacity: 0; }
    }
  `]
    })
], MatchComponent);
export { MatchComponent };
