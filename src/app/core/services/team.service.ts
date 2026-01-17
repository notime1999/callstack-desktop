import { Injectable, signal, computed } from '@angular/core';
import { Team, Player, PlayerRole, VoiceMode, GameType, VOICE_RULES } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class TeamService {
  // State signals
  private _team = signal<Team | null>(null);
  private _currentPlayerId = signal<string | null>(null);
  private _voiceMode = signal<VoiceMode>('default');

  // Computed values
  readonly team = this._team.asReadonly();
  readonly voiceMode = this._voiceMode.asReadonly();

  readonly currentPlayer = computed(() => {
    const team = this._team();
    const id = this._currentPlayerId();
    return team?.players.find((p: Player) => p.id === id) ?? null;
  });

  readonly isIGL = computed(() =>
    this.currentPlayer()?.role === 'igl'
  );

  readonly canSpeak = computed(() => {
    const player = this.currentPlayer();
    const mode = this._voiceMode();
    if (!player) return false;
    return VOICE_RULES[mode].canSpeak[player.role];
  });

  readonly hasPriority = computed(() => {
    const player = this.currentPlayer();
    const mode = this._voiceMode();
    if (!player) return false;
    return VOICE_RULES[mode].hasPriority.includes(player.role);
  });

  readonly isDuckingEnabled = computed(() => {
    const mode = this._voiceMode();
    return VOICE_RULES[mode].duckingEnabled;
  });

  readonly players = computed(() =>
    this._team()?.players ?? []
  );

  // Actions
  setTeam(team: Team) {
    this._team.set(team);
  }

  setCurrentPlayer(playerId: string) {
    this._currentPlayerId.set(playerId);
  }

  updatePlayer(playerId: string, update: Partial<Player>) {
    this._team.update(team => {
      if (!team) return team;
      return {
        ...team,
        players: team.players.map((p: Player) =>
          p.id === playerId ? { ...p, ...update } : p
        )
      };
    });
  }

  changeRole(playerId: string, role: PlayerRole) {
    if (!this.isIGL()) return;
    this.updatePlayer(playerId, { role });
  }

  setVoiceMode(mode: VoiceMode) {
    if (!this.isIGL()) return;
    this._voiceMode.set(mode);
  }

  setGame(game: GameType) {
    this._team.update(team => team ? { ...team, game } : team);
  }

  markDead(playerId: string) {
    this.updatePlayer(playerId, { isAlive: false, isMuted: true });
  }

  markAlive(playerId: string) {
    this.updatePlayer(playerId, { isAlive: true });
  }
}
