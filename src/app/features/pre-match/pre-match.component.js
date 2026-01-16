var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeamService } from '../../core/services/team.service';
import { SocketService } from '../../core/services/socket.service';
import { VOICE_RULES } from '../../shared/types';
let PreMatchComponent = class PreMatchComponent {
    constructor() {
        this.router = inject(Router);
        this.teamService = inject(TeamService);
        this.socketService = inject(SocketService);
        this.modes = [
            { value: 'default', label: 'Default', icon: '🟢' },
            { value: 'prep', label: 'Prep', icon: '🧠' }
        ];
        this.selectedMode = 'default';
        this.enableClutchMode = true;
        this.enableDucking = true;
        this.enableRecording = false;
        this.enableOverlay = false;
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
        this.socketService.startMatch({
            recording: this.enableRecording,
            overlay: this.enableOverlay
        });
        // Set initial voice mode
        this.teamService.setVoiceMode(this.selectedMode);
        // Enable overlay if selected
        if (this.enableOverlay) {
            window.electronAPI?.toggleOverlay(true);
        }
        this.router.navigate(['/match']);
    }
};
PreMatchComponent = __decorate([
    Component({
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
        <button class="btn-secondary" (click)="goBack()">
          ← Back to Lobby
        </button>
        <button class="btn-primary btn-large" (click)="startMatch()">
          🎮 START MATCH NOW
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
], PreMatchComponent);
export { PreMatchComponent };
