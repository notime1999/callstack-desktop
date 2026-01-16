var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
let OverlayComponent = class OverlayComponent {
    constructor() {
        this.players = signal([]);
        this.voiceMode = signal('default');
        this.teamName = signal('');
    }
    ngOnInit() {
        // Listen for overlay data from main process
        if (window.electronAPI) {
            window.electronAPI.onOverlayData((data) => {
                const overlayData = data;
                this.players.set(overlayData.players);
                this.voiceMode.set(overlayData.voiceMode);
                this.teamName.set(overlayData.teamName);
            });
        }
    }
    ngOnDestroy() {
        // Cleanup if needed
    }
    getRoleIcon(role) {
        const icons = {
            igl: '🎙️',
            caller: '📢',
            player: '🎮',
            coach: '👁️'
        };
        return icons[role];
    }
    getModeIcon(mode) {
        const icons = {
            default: '🟢',
            clutch: '🔴',
            prep: '🧠'
        };
        return icons[mode];
    }
};
OverlayComponent = __decorate([
    Component({
        selector: 'app-overlay',
        standalone: true,
        imports: [CommonModule],
        template: `
    <div class="overlay-container" [class]="voiceMode()">
      <!-- Mode Badge -->
      <div class="mode-badge" [class]="voiceMode()">
        {{ getModeIcon(voiceMode()) }} {{ voiceMode() | uppercase }}
      </div>

      <!-- Players List -->
      <div class="players-list">
        @for (player of players(); track player.id) {
          <div 
            class="player-row" 
            [class.speaking]="player.isSpeaking"
            [class.muted]="player.isMuted"
            [class.dead]="!player.isAlive"
            [class]="player.role">
            
            <span class="role-icon">{{ getRoleIcon(player.role) }}</span>
            <span class="player-name">{{ player.name }}</span>
            
            @if (player.isSpeaking) {
              <span class="speaking-indicator">
                <span class="wave"></span>
                <span class="wave"></span>
                <span class="wave"></span>
              </span>
            }
            
            @if (player.isMuted) {
              <span class="muted-icon">🔇</span>
            }
          </div>
        }
      </div>
    </div>
  `,
        styles: [`
    :host {
      display: block;
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }

    .overlay-container {
      background: rgba(20, 20, 35, 0.85);
      border-radius: 12px;
      padding: 12px;
      min-width: 200px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .overlay-container.clutch {
      border-color: rgba(239, 68, 68, 0.5);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
    }

    .mode-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }

    .mode-badge.default { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .mode-badge.clutch { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .mode-badge.prep { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .player-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border-left: 3px solid transparent;
      transition: all 0.15s ease;
    }

    .player-row.igl { border-left-color: #f59e0b; }
    .player-row.caller { border-left-color: #8b5cf6; }
    .player-row.player { border-left-color: #6366f1; }
    .player-row.coach { border-left-color: #64748b; }

    .player-row.speaking {
      background: rgba(34, 197, 94, 0.15);
      border-left-color: #22c55e;
    }

    .player-row.muted {
      opacity: 0.5;
    }

    .player-row.dead {
      opacity: 0.3;
      text-decoration: line-through;
    }

    .role-icon {
      font-size: 14px;
      width: 20px;
      text-align: center;
    }

    .player-name {
      flex: 1;
      font-size: 13px;
      font-weight: 500;
      color: #fff;
    }

    .speaking-indicator {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 14px;
    }

    .wave {
      width: 3px;
      height: 100%;
      background: #22c55e;
      border-radius: 2px;
      animation: wave 0.5s ease-in-out infinite;
    }

    .wave:nth-child(2) { animation-delay: 0.1s; }
    .wave:nth-child(3) { animation-delay: 0.2s; }

    @keyframes wave {
      0%, 100% { transform: scaleY(0.4); }
      50% { transform: scaleY(1); }
    }

    .muted-icon {
      font-size: 12px;
    }
  `]
    })
], OverlayComponent);
export { OverlayComponent };
