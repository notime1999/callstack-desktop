import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TeamService } from '../../core/services/team.service';
import { VoiceService } from '../../core/services/voice.service';
import { SocketService } from '../../core/services/socket.service';
import { VoiceMode, Player } from '../../shared/types';

@Component({
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

      <!-- End Match Button (IGL only) -->
      @if (isIGL()) {
        <button class="btn-end-match" (click)="endMatch()">
          🛑 End Match
        </button>
      }
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

    .btn-end-match {
      margin-top: 16px;
      padding: 12px 24px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-end-match:hover { background: #b91c1c; }

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
export class MatchComponent implements OnInit, OnDestroy {
  private teamService = inject(TeamService);
  private voiceService = inject(VoiceService);
  private socketService = inject(SocketService);
  private router = inject(Router);

  voiceMode = this.teamService.voiceMode;
  canSpeak = this.teamService.canSpeak;
  players = this.teamService.players;
  isIGL = this.teamService.isIGL;

  showModeFeedback = false;

  getIGL(): Player | undefined {
    return this.players().find((p: Player) => p.role === 'igl');
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
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

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') {
      this.voiceService.stopTalking();
    }
  }

  private changeMode(mode: VoiceMode) {
    this.teamService.setVoiceMode(mode);
    this.showModeFeedback = true;
    setTimeout(() => this.showModeFeedback = false, 1500);
  }

  endMatch() {
    if (this.isIGL()) {
      this.socketService.endMatch();
    }
  }

  ngOnInit() {
    // Initialize voice engine
    this.voiceService.initialize();

    // Listen for match end (IGL ended the match)
    this.socketService.on('match-ended', () => {
      console.log('[Match] Match ended, navigating to post-match');
      this.router.navigate(['/post-match']);
    });
  }

  ngOnDestroy() {
    this.voiceService.destroy();
    this.socketService.off('match-ended');
  }
}
