import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';
import { TeamService } from '../../core/services/team.service';
import { Team } from '../../shared/types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="home-container">
      <div class="logo-section">
        <img src="assets/icon.svg" alt="Logo" class="logo">
        <h1>Tactical Voice</h1>
        <p class="tagline">Team communication for competitive gaming</p>
      </div>

      <div class="actions-section">
        <!-- Player Name -->
        <div class="input-group">
          <label>Your Name</label>
          <input 
            type="text" 
            [(ngModel)]="playerName" 
            placeholder="Enter your name"
            class="input-field">
        </div>

        <!-- Create or Join -->
        <div class="mode-tabs">
          <button 
            class="tab" 
            [class.active]="mode() === 'create'"
            (click)="mode.set('create')">
            Create Team
          </button>
          <button 
            class="tab" 
            [class.active]="mode() === 'join'"
            (click)="mode.set('join')">
            Join Team
          </button>
        </div>

        @if (mode() === 'create') {
          <div class="create-section">
            <div class="input-group">
              <label>Team Name</label>
              <input 
                type="text" 
                [(ngModel)]="teamName" 
                placeholder="Enter team name"
                class="input-field">
            </div>
            <button class="btn-primary" (click)="createTeam()" [disabled]="!canCreate()">
              🚀 Create Team
            </button>
          </div>
        }

        @if (mode() === 'join') {
          <div class="join-section">
            <div class="input-group">
              <label>Team Code</label>
              <input 
                type="text" 
                [(ngModel)]="teamCode" 
                placeholder="Enter 6-character code"
                class="input-field code-input"
                maxlength="6"
                (input)="teamCode = teamCode.toUpperCase()">
            </div>
            <button class="btn-primary" (click)="joinTeam()" [disabled]="!canJoin()">
              🔗 Join Team
            </button>
          </div>
        }

        @if (error()) {
          <div class="error-message">{{ error() }}</div>
        }

        <!-- Connection Status -->
        <div class="status" [class.connected]="socketService.isConnected()">
          <span class="dot"></span>
          {{ socketService.isConnected() ? 'Connected to server' : 'Connecting...' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }

    .logo-section {
      text-align: center;
      margin-bottom: 40px;
    }

    .logo {
      width: 80px;
      height: 80px;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 8px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .tagline {
      color: #888;
      font-size: 14px;
    }

    .actions-section {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .input-group label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .input-field {
      padding: 14px 16px;
      background: #252542;
      border: 2px solid #333;
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      transition: border-color 0.2s;
    }

    .input-field:focus {
      outline: none;
      border-color: #6366f1;
    }

    .input-field::placeholder {
      color: #666;
    }

    .code-input {
      font-family: monospace;
      font-size: 24px;
      text-align: center;
      letter-spacing: 8px;
      text-transform: uppercase;
    }

    .mode-tabs {
      display: flex;
      gap: 8px;
      background: #16162a;
      padding: 4px;
      border-radius: 8px;
    }

    .tab {
      flex: 1;
      padding: 12px;
      background: transparent;
      border: none;
      color: #888;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .tab.active {
      background: #6366f1;
      color: #fff;
    }

    .tab:hover:not(.active) {
      background: #252542;
    }

    .btn-primary {
      padding: 16px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5558e3;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-message {
      padding: 12px;
      background: #4a2d2d;
      border: 1px solid #f87171;
      border-radius: 8px;
      color: #f87171;
      font-size: 14px;
      text-align: center;
    }

    .status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 12px;
      color: #888;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f87171;
    }

    .status.connected .dot {
      background: #22c55e;
    }
  `]
})
export class HomeComponent {
  socketService = inject(SocketService);
  private teamService = inject(TeamService);
  private router = inject(Router);

  mode = signal<'create' | 'join'>('create');
  playerName = '';
  teamName = '';
  teamCode = '';
  error = signal('');

  canCreate(): boolean {
    return this.playerName.trim().length >= 2 && this.teamName.trim().length >= 2;
  }

  canJoin(): boolean {
    return this.playerName.trim().length >= 2 && this.teamCode.trim().length === 6;
  }

  createTeam(): void {
    if (!this.canCreate()) return;

    const teamId = this.generateTeamId();

    // Listen for team state
    this.socketService.on('team-state', (team: Team) => {
      this.teamService.setTeam(team);
      this.router.navigate(['/lobby']);
    });

    this.socketService.on('error', (err: { message: string }) => {
      this.error.set(err.message);
    });

    // Join the team (will create if doesn't exist)
    this.socketService.joinTeam(teamId, {
      name: this.playerName,
      role: 'igl',
      status: 'ready',
      isMuted: false,
      isSpeaking: false,
      isAlive: true
    });
  }

  joinTeam(): void {
    if (!this.canJoin()) return;

    // Use the team code as team ID
    const teamId = this.teamCode.toLowerCase();

    this.socketService.on('team-state', (team: Team) => {
      this.teamService.setTeam(team);
      // Find current player ID from socket
      const socketId = (this.socketService as any).socket?.id;
      if (socketId) {
        this.teamService.setCurrentPlayer(socketId);
      }
      this.router.navigate(['/lobby']);
    });

    this.socketService.on('error', (err: { message: string }) => {
      this.error.set(err.message);
    });

    this.socketService.joinTeam(teamId, {
      name: this.playerName,
      role: 'player',
      status: 'ready',
      isMuted: false,
      isSpeaking: false,
      isAlive: true
    });
  }

  private generateTeamId(): string {
    // Generate a 6-character alphanumeric ID
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
