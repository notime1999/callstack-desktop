var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
let PlayerCardComponent = class PlayerCardComponent {
    constructor() {
        this.isCurrentUser = false;
        this.canEdit = false;
        this.roleChange = new EventEmitter();
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
    getStatusLabel(status) {
        const labels = {
            ready: '🟢 Ready',
            'no-mic': '🟡 No Mic',
            'listen-only': '👂 Listen',
            'in-match': '🔴 In Match'
        };
        return labels[status] ?? status;
    }
    onRoleChange(event) {
        const select = event.target;
        this.roleChange.emit(select.value);
    }
};
__decorate([
    Input({ required: true })
], PlayerCardComponent.prototype, "player", void 0);
__decorate([
    Input()
], PlayerCardComponent.prototype, "isCurrentUser", void 0);
__decorate([
    Input()
], PlayerCardComponent.prototype, "canEdit", void 0);
__decorate([
    Output()
], PlayerCardComponent.prototype, "roleChange", void 0);
PlayerCardComponent = __decorate([
    Component({
        selector: 'app-player-card',
        standalone: true,
        imports: [CommonModule],
        template: `
    <div 
      class="player-card" 
      [class.current-user]="isCurrentUser"
      [class.speaking]="player.isSpeaking"
      [class.dead]="!player.isAlive">
      
      <!-- Role Icon -->
      <span class="role-icon">{{ getRoleIcon(player.role) }}</span>
      
      <!-- Player Info -->
      <div class="player-info">
        <span class="player-name">{{ player.name }}</span>
        <span class="player-role">({{ player.role | uppercase }})</span>
      </div>
      
      <!-- Status -->
      <div class="player-status">
        @if (player.isMuted) {
          <span class="status-icon muted">🔇</span>
        }
        @if (player.isSpeaking) {
          <span class="status-icon speaking">🎤</span>
        }
        @if (!player.isAlive) {
          <span class="status-icon dead">💀</span>
        }
      </div>
      
      <!-- Status Badge -->
      <span class="status-badge" [class]="player.status">
        {{ getStatusLabel(player.status) }}
      </span>

      <!-- Role Selector (solo se canEdit) -->
      @if (canEdit) {
        <select 
          class="role-selector"
          [value]="player.role"
          (change)="onRoleChange($event)">
          <option value="igl">IGL</option>
          <option value="caller">Caller</option>
          <option value="player">Player</option>
          <option value="coach">Coach</option>
        </select>
      }
    </div>
  `,
        styles: [`
    .player-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #252542;
      border-radius: 8px;
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .player-card.current-user {
      border-color: #6366f1;
    }

    .player-card.speaking {
      background: #2d4a3e;
      border-color: #22c55e;
    }

    .player-card.dead {
      opacity: 0.5;
    }

    .role-icon {
      font-size: 20px;
    }

    .player-info {
      flex: 1;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .player-name {
      font-weight: 600;
      color: #fff;
    }

    .player-role {
      font-size: 11px;
      color: #888;
    }

    .player-status {
      display: flex;
      gap: 4px;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    .status-badge.ready { background: #22c55e20; color: #22c55e; }
    .status-badge.no-mic { background: #eab30820; color: #eab308; }
    .status-badge.listen-only { background: #3b82f620; color: #3b82f6; }

    .role-selector {
      padding: 4px 8px;
      background: #333;
      color: #fff;
      border: 1px solid #444;
      border-radius: 4px;
      font-size: 11px;
    }
  `]
    })
], PlayerCardComponent);
export { PlayerCardComponent };
