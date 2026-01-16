var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TeamService } from '../../core/services/team.service';
import { SocketService } from '../../core/services/socket.service';
import { VoiceService } from '../../core/services/voice.service';
import { PlayerCardComponent } from '../../shared/components/player-card/player-card.component';
import { SettingsModalComponent } from '../../shared/components/settings-modal/settings-modal.component';
import { InviteModalComponent } from '../../shared/components/invite-modal/invite-modal.component';
let LobbyComponent = class LobbyComponent {
    constructor() {
        this.teamService = inject(TeamService);
        this.socketService = inject(SocketService);
        this.voiceService = inject(VoiceService);
        this.router = inject(Router);
        this.team = this.teamService.team;
        this.players = this.teamService.players;
        this.currentPlayer = this.teamService.currentPlayer;
        this.isIGL = this.teamService.isIGL;
        this.roles = ['igl', 'caller', 'player', 'coach'];
        this.showSettingsModal = signal(false);
        this.showInviteModal = signal(false);
    }
    async ngOnInit() {
        // If no team is set, redirect to home
        if (!this.team()) {
            this.router.navigate(['/home']);
            return;
        }
        // Initialize voice service
        try {
            await this.voiceService.initialize();
            console.log('[Lobby] Voice service initialized');
            // Connect to existing players in the team
            const currentPlayerId = this.currentPlayer()?.id;
            for (const player of this.players()) {
                if (player.id !== currentPlayerId) {
                    console.log('[Lobby] Creating peer connection to existing player:', player.id);
                    this.voiceService.createPeerConnection(player.id, true);
                }
            }
        }
        catch (error) {
            console.error('[Lobby] Failed to initialize voice:', error);
        }
        // Listen for server updates
        this.socketService.on('team-state', (team) => {
            this.teamService.setTeam(team);
        });
        this.socketService.on('player-joined', (player) => {
            console.log('[Lobby] Player joined:', player);
            // Voice service will handle the peer connection via its own listener
        });
        this.socketService.on('player-left', (playerId) => {
            console.log('[Lobby] Player left:', playerId);
        });
    }
    ngOnDestroy() {
        // Don't destroy voice service here - keep it running for match
    }
    getRoleLabel(role) {
        const labels = {
            igl: '🎙️ IGL',
            caller: '📢 Caller',
            player: '🎮 Player',
            coach: '👁️ Coach'
        };
        return labels[role];
    }
    onGameChange(event) {
        const select = event.target;
        this.teamService.setGame(select.value);
    }
    onRoleChange(playerId, role) {
        this.teamService.changeRole(playerId, role);
    }
    onPlayerDrop(event) {
        console.log('Player dropped', event);
    }
    onSettingsSaved(settings) {
        console.log('Settings saved:', settings);
    }
    startMatch() {
        if (this.isIGL()) {
            this.router.navigate(['/pre-match']);
        }
    }
};
LobbyComponent = __decorate([
    Component({
        selector: 'app-lobby',
        standalone: true,
        imports: [
            CommonModule,
            DragDropModule,
            PlayerCardComponent,
            SettingsModalComponent,
            InviteModalComponent
        ],
        template: `
    <div class="lobby-container">
      <!-- Header -->
      <header class="team-header">
        <div class="team-info">
          <h1 class="team-name">{{ team()?.name ?? 'No Team' }}</h1>
          <span class="team-status" [class]="team()?.status">
            {{ team()?.status | uppercase }}
          </span>
        </div>
        
        <div class="game-selector">
          <label>GAME:</label>
          <select 
            [value]="team()?.game" 
            (change)="onGameChange($event)"
            [disabled]="!isIGL()">
            <option value="cs2">Counter-Strike 2</option>
            <option value="valorant">Valorant</option>
            <option value="lol">League of Legends</option>
          </select>
        </div>
      </header>

      <!-- Players List -->
      <section class="players-section">
        <h2>PLAYERS</h2>
        
        <div 
          class="players-list"
          cdkDropList
          (cdkDropListDropped)="onPlayerDrop($event)">
          
          @for (player of players(); track player.id) {
            <app-player-card
              [player]="player"
              [isCurrentUser]="player.id === currentPlayer()?.id"
              [canEdit]="isIGL()"
              (roleChange)="onRoleChange(player.id, $event)"
              cdkDrag
              [cdkDragDisabled]="!isIGL()">
            </app-player-card>
          }
        </div>

        <button class="invite-btn" (click)="showInviteModal.set(true)">
          + Invite Player
        </button>
      </section>

      <!-- Role Legend -->
      @if (isIGL()) {
        <section class="role-management">
          <h3>DRAG TO ASSIGN ROLE</h3>
          <div class="role-slots">
            @for (role of roles; track role) {
              <div class="role-slot" [attr.data-role]="role">
                {{ getRoleLabel(role) }}
              </div>
            }
          </div>
        </section>
      }

      <!-- Actions -->
      <footer class="lobby-actions">
        @if (isIGL()) {
          <button class="btn-primary btn-large" (click)="startMatch()">
            START MATCH
          </button>
        }
        <button class="btn-secondary" (click)="showSettingsModal.set(true)">
          ⚙️ Settings
        </button>
      </footer>
    </div>

    <!-- Modals -->
    @if (showSettingsModal()) {
      <app-settings-modal 
        (close)="showSettingsModal.set(false)"
        (settingsSaved)="onSettingsSaved($event)">
      </app-settings-modal>
    }

    @if (showInviteModal()) {
      <app-invite-modal
        [teamId]="team()?.id ?? ''"
        (close)="showInviteModal.set(false)">
      </app-invite-modal>
    }
  `,
        styles: [`
    .lobby-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 24px;
      background: #1a1a2e;
      color: #eee;
    }

    .team-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .team-name {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    }

    .team-status {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .team-status.idle { background: #2d4a3e; color: #4ade80; }
    .team-status.in-match { background: #4a2d2d; color: #f87171; }

    .game-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .game-selector label {
      font-size: 12px;
      color: #888;
    }

    .game-selector select {
      padding: 8px 12px;
      background: #252542;
      border: 1px solid #333;
      border-radius: 6px;
      color: #fff;
    }

    .players-section {
      flex: 1;
    }

    .players-section h2 {
      font-size: 12px;
      color: #888;
      margin-bottom: 12px;
      letter-spacing: 1px;
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .invite-btn {
      margin-top: 16px;
      padding: 12px;
      background: transparent;
      border: 2px dashed #444;
      color: #888;
      cursor: pointer;
      width: 100%;
      border-radius: 8px;
    }
    .invite-btn:hover { border-color: #666; color: #aaa; }

    .role-management {
      padding: 16px;
      background: #16162a;
      border-radius: 8px;
      margin: 16px 0;
    }

    .role-management h3 {
      font-size: 11px;
      color: #666;
      margin: 0 0 12px;
    }

    .role-slots {
      display: flex;
      gap: 12px;
    }

    .role-slot {
      padding: 8px 16px;
      background: #252542;
      border-radius: 4px;
      font-size: 12px;
    }

    .lobby-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #333;
    }

    .btn-primary {
      flex: 1;
      padding: 16px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:hover { background: #5558e3; }

    .btn-secondary {
      padding: 16px 24px;
      background: #333;
      color: #ccc;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
  `]
    })
], LobbyComponent);
export { LobbyComponent };
