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
      <!-- Back Button -->
      <button class="btn-back" (click)="goBack()">
        ← Back to Lobby
      </button>

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

      <!-- Self Mute Control -->
      <div class="self-mute-control">
        <button 
          class="btn-self-mute" 
          [class.muted]="voiceService.isMuted()"
          (click)="toggleSelfMute()">
          {{ voiceService.isMuted() ? '🔇 Unmute Myself' : '🎤 Mute Myself' }}
        </button>
        <span class="ptt-hint">
          PTT: <kbd>SPACE</kbd> | Toggle: <kbd>M</kbd>
        </span>
      </div>

      <!-- Can Speak Indicator -->
      <div class="speak-status" [class.can-speak]="canSpeak()" [class.muted]="!canSpeak()">
        {{ canSpeak() ? '🎤 You can speak' : '🔇 Muted by mode' }}
      </div>

      <!-- Players List (for IGL/Coach to mute individuals) -->
      @if (isIGL() || currentPlayer()?.role === 'coach') {
        <div class="players-list-section">
          <h3>TEAM</h3>
          <div class="players-list">
            @for (player of players(); track player.id) {
              <div class="player-row" [class.is-me]="player.id === currentPlayer()?.id">
                <span class="player-info">
                  <span class="role-badge" [class]="player.role">{{ getRoleEmoji(player.role) }}</span>
                  <span class="player-name">{{ player.name }}</span>
                  @if (player.isSpeaking) {
                    <span class="speaking-indicator">🔊</span>
                  }
                </span>
                @if (player.id !== currentPlayer()?.id && player.role !== 'igl' && player.role !== 'coach') {
                  <button 
                    class="btn-mute-player" 
                    [class.muted]="player.isMuted"
                    (click)="mutePlayer(player.id)">
                    {{ player.isMuted ? '🔇' : '🔊' }}
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- IGL Controls -->
      @if (isIGL()) {
        <div class="igl-controls">
          <button 
            class="btn-mute-all" 
            [class.active]="allPlayersMuted()"
            (click)="toggleMuteAll()">
            {{ allPlayersMuted() ? '🔊 Unmute All Players' : '🔇 Mute All Players' }}
          </button>
          <button class="btn-end-match" (click)="endMatch()">
            🛑 End Match
          </button>
        </div>
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

    .btn-back {
      padding: 8px 16px;
      background: transparent;
      color: #888;
      border: 1px solid #444;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      align-self: flex-start;
      transition: all 0.2s;
    }
    .btn-back:hover { color: #fff; border-color: #666; }

    .igl-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }

    .btn-mute-all {
      padding: 10px 20px;
      background: #333;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-mute-all:hover { background: #444; }
    .btn-mute-all.active { background: #22c55e; }

    .self-mute-control {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: #252542;
      border-radius: 6px;
    }

    .btn-self-mute {
      padding: 8px 16px;
      background: #333;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-self-mute:hover { background: #444; }
    .btn-self-mute.muted { background: #ef4444; }

    .players-list-section {
      background: #252542;
      border-radius: 8px;
      padding: 12px;
    }

    .players-list-section h3 {
      margin: 0 0 8px;
      font-size: 11px;
      color: #888;
      letter-spacing: 1px;
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .player-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      background: #1a1a2e;
      border-radius: 6px;
    }
    .player-row.is-me { border: 1px solid #6366f1; }

    .player-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-badge {
      width: 24px;
      text-align: center;
    }

    .player-name {
      font-size: 13px;
    }

    .speaking-indicator {
      animation: pulse 0.5s infinite;
    }

    .btn-mute-player {
      padding: 4px 8px;
      background: #333;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-mute-player:hover { background: #444; }
    .btn-mute-player.muted { background: #ef4444; }

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
  voiceService = inject(VoiceService);  // Made public for template access
  private socketService = inject(SocketService);
  private router = inject(Router);

  voiceMode = this.teamService.voiceMode;
  canSpeak = this.teamService.canSpeak;
  players = this.teamService.players;
  isIGL = this.teamService.isIGL;
  currentPlayer = this.teamService.currentPlayer;
  allPlayersMuted = this.teamService.allPlayersMuted;

  showModeFeedback = false;

  getIGL(): Player | undefined {
    return this.players().find((p: Player) => p.role === 'igl');
  }

  getRoleEmoji(role: string): string {
    const emojis: Record<string, string> = {
      igl: '🎙️',
      caller: '📢',
      player: '🎮',
      coach: '👁️'
    };
    return emojis[role] || '🎮';
  }

  toggleSelfMute() {
    this.voiceService.toggleMute();
  }

  goBack() {
    // Reset to lobby mode so everyone can speak
    this.teamService.resetToLobbyMode();
    this.router.navigate(['/lobby']);
  }

  toggleMuteAll() {
    const currentlyMuted = this.allPlayersMuted();
    const shouldMute = !currentlyMuted;
    
    // Update team state (for UI)
    this.teamService.muteAllPlayers(shouldMute);
    
    // Actually mute the audio in voice service
    this.voiceService.muteAllPlayers(shouldMute, ['igl', 'coach']);
  }

  // Mute a specific player (IGL/coach only)
  mutePlayer(playerId: string) {
    if (!this.isIGL() && this.teamService.currentPlayer()?.role !== 'coach') return;
    
    const player = this.players().find(p => p.id === playerId);
    if (!player) return;
    
    const shouldMute = !player.isMuted;
    this.teamService.updatePlayer(playerId, { isMuted: shouldMute });
    this.voiceService.mutePlayer(playerId, shouldMute);
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
      // Reset to lobby mode so everyone can speak again
      this.teamService.resetToLobbyMode();
      this.socketService.endMatch();
      this.router.navigate(['/lobby']);
    }
  }

  ngOnInit() {
    // Initialize voice engine if not already
    if (!this.voiceService.isInitialized()) {
      this.voiceService.initialize();
    }

    // Listen for match end (IGL ended the match)
    this.socketService.on('match-ended', () => {
      console.log('[Match] Match ended, navigating to lobby');
      this.teamService.resetToLobbyMode();
      this.router.navigate(['/lobby']);
    });

    // Listen for player updates (speaking state, mute, etc.)
    this.socketService.on('player-updated', (player: any) => {
      console.log('[Match] Player updated:', player);
      this.teamService.updatePlayer(player.id, player);
    });
  }

  ngOnDestroy() {
    // Don't destroy voice service - keep it running for lobby
    // Voice service persists across navigation
    this.socketService.off('match-ended');
    this.socketService.off('player-updated');
  }
}
