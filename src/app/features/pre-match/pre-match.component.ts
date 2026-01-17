import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../core/services/team.service';
import { SocketService } from '../../core/services/socket.service';
import { VoiceMode, VOICE_RULES } from '../../shared/types';

@Component({
  selector: 'app-pre-match',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pre-match-container">
      <header>
        <h1>PRE-MATCH SETUP</h1>
        <p class="subtitle">Configure voice rules before starting</p>
      </header>

      <!-- Initial Mode -->
      <section class="setup-section">
        <h2>STARTING MODE</h2>
        <div class="mode-options">
          @for (mode of modes; track mode.value) {
            <label 
              class="mode-option" 
              [class.selected]="selectedMode === mode.value">
              <input 
                type="radio" 
                name="mode" 
                [value]="mode.value"
                [(ngModel)]="selectedMode">
              <span class="mode-icon">{{ mode.icon }}</span>
              <span class="mode-label">{{ mode.label }}</span>
            </label>
          }
        </div>
      </section>

      <!-- Voice Rules Preview -->
      <section class="setup-section">
        <h2>VOICE RULES</h2>
        <div class="rules-preview">
          @for (rule of getCurrentRules(); track rule.role) {
            <div class="rule-item" [class.can-speak]="rule.canSpeak">
              <span class="rule-role">{{ rule.role | uppercase }}</span>
              <span class="rule-status">
                {{ rule.canSpeak ? '✅ Can speak' : '🔇 Muted' }}
              </span>
            </div>
          }
        </div>
      </section>

      <!-- Advanced Options -->
      <section class="setup-section">
        <h2>ADVANCED</h2>
        <div class="options-list">
          <label class="option-item">
            <input type="checkbox" [(ngModel)]="enableClutchMode">
            <span>Enable Clutch Mode (F2)</span>
          </label>
          <label class="option-item">
            <input type="checkbox" [(ngModel)]="enableDucking">
            <span>Voice Ducking (IGL priority)</span>
          </label>
          <label class="option-item">
            <input type="checkbox" [(ngModel)]="enableRecording">
            <span>Record Voice (for review)</span>
          </label>
        </div>
      </section>

      <!-- Streaming -->
      <section class="setup-section">
        <h2>STREAMING</h2>
        <label class="option-item">
          <input type="checkbox" [(ngModel)]="enableOverlay">
          <span>Enable Voice Overlay</span>
        </label>
        @if (enableOverlay) {
          <p class="hint">Overlay will show who's speaking</p>
        }
      </section>

      <!-- Actions -->
      <footer class="actions">
        <button class="btn-secondary" (click)="goBack()" [disabled]="isStarting">
          ← Back to Lobby
        </button>
        <button 
          class="btn-primary btn-large" 
          (click)="startMatch()"
          [disabled]="isStarting">
          {{ isStarting ? '⏳ Starting...' : '🎮 START MATCH NOW' }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .pre-match-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 32px;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
    }

    header h1 {
      margin: 0;
      font-size: 24px;
    }

    .subtitle {
      color: #888;
      margin: 4px 0 0;
    }

    .setup-section {
      background: #252542;
      padding: 20px;
      border-radius: 12px;
    }

    .setup-section h2 {
      margin: 0 0 16px;
      font-size: 12px;
      color: #888;
      letter-spacing: 1px;
    }

    .mode-options {
      display: flex;
      gap: 12px;
    }

    .mode-option {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: #1a1a2e;
      border: 2px solid #333;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-option input { display: none; }

    .mode-option.selected {
      border-color: #6366f1;
      background: #6366f120;
    }

    .mode-icon { font-size: 24px; }
    .mode-label { font-size: 14px; font-weight: 600; }

    .rules-preview {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rule-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #1a1a2e;
      border-radius: 6px;
    }

    .rule-item.can-speak { color: #22c55e; }
    .rule-item:not(.can-speak) { color: #888; }

    .options-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }

    .option-item input[type="checkbox"] {
      width: 20px;
      height: 20px;
      accent-color: #6366f1;
    }

    .hint {
      margin: 8px 0 0 32px;
      font-size: 12px;
      color: #888;
    }

    .actions {
      display: flex;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 24px;
      border-top: 1px solid #333;
    }

    .btn-primary {
      padding: 16px 32px;
      background: #22c55e;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:hover { background: #1ea34d; }

    .btn-secondary {
      padding: 16px 24px;
      background: transparent;
      color: #888;
      border: 1px solid #444;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-secondary:hover { color: #fff; border-color: #666; }
  `]
})
export class PreMatchComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private teamService = inject(TeamService);
  private socketService = inject(SocketService);

  modes = [
    { value: 'default' as VoiceMode, label: 'Default', icon: '🟢' },
    { value: 'prep' as VoiceMode, label: 'Prep', icon: '🧠' }
  ];

  selectedMode: VoiceMode = 'default';
  enableClutchMode = true;
  enableDucking = true;
  enableRecording = false;
  enableOverlay = false;
  isStarting = false;

  ngOnInit() {
    // Listen for match started event to navigate to match
    this.socketService.on('match-started', (matchState: any) => {
      console.log('[PreMatch] Match started, navigating to match:', matchState);
      this.isStarting = false;
      this.router.navigate(['/match']);
    });
  }

  ngOnDestroy() {
    this.socketService.off('match-started');
  }

  getCurrentRules() {
    const rules = VOICE_RULES[this.selectedMode];
    return Object.entries(rules.canSpeak).map(([role, canSpeak]) => ({
      role,
      canSpeak
    }));
  }

  goBack() {
    this.router.navigate(['/lobby']);
  }

  startMatch() {
    if (this.isStarting) return;
    this.isStarting = true;

    console.log('[PreMatch] Starting match...');

    // Set initial voice mode
    this.teamService.setVoiceMode(this.selectedMode);

    // Enable overlay if selected
    if (this.enableOverlay) {
      window.electronAPI?.toggleOverlay(true);
    }

    // If connected to server, emit event
    if (this.socketService.isConnected()) {
      this.socketService.startMatch({
        recording: this.enableRecording,
        overlay: this.enableOverlay
      });
    }

    // Navigate to match immediately
    this.isStarting = false;
    
    // Try router first, fallback to direct navigation
    try {
      this.router.navigate(['/match']).then(success => {
        if (!success) {
          console.log('[PreMatch] Router navigate failed, using fallback');
          window.location.hash = '#/match';
        }
      });
    } catch (e) {
      console.error('[PreMatch] Navigation error:', e);
      window.location.hash = '#/match';
    }
  }
}
