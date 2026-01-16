var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, signal, computed } from '@angular/core';
import { VOICE_RULES } from '../../shared/types';
let TeamService = class TeamService {
    constructor() {
        // State signals
        this._team = signal(null);
        this._currentPlayerId = signal(null);
        this._voiceMode = signal('default');
        // Computed values
        this.team = this._team.asReadonly();
        this.voiceMode = this._voiceMode.asReadonly();
        this.currentPlayer = computed(() => {
            const team = this._team();
            const id = this._currentPlayerId();
            return team?.players.find((p) => p.id === id) ?? null;
        });
        this.isIGL = computed(() => this.currentPlayer()?.role === 'igl');
        this.canSpeak = computed(() => {
            const player = this.currentPlayer();
            const mode = this._voiceMode();
            if (!player)
                return false;
            return VOICE_RULES[mode].canSpeak[player.role];
        });
        this.players = computed(() => this._team()?.players ?? []);
    }
    // Actions
    setTeam(team) {
        this._team.set(team);
    }
    setCurrentPlayer(playerId) {
        this._currentPlayerId.set(playerId);
    }
    updatePlayer(playerId, update) {
        this._team.update(team => {
            if (!team)
                return team;
            return {
                ...team,
                players: team.players.map((p) => p.id === playerId ? { ...p, ...update } : p)
            };
        });
    }
    changeRole(playerId, role) {
        if (!this.isIGL())
            return;
        this.updatePlayer(playerId, { role });
    }
    setVoiceMode(mode) {
        if (!this.isIGL())
            return;
        this._voiceMode.set(mode);
    }
    setGame(game) {
        this._team.update(team => team ? { ...team, game } : team);
    }
    markDead(playerId) {
        this.updatePlayer(playerId, { isAlive: false, isMuted: true });
    }
    markAlive(playerId) {
        this.updatePlayer(playerId, { isAlive: true });
    }
};
TeamService = __decorate([
    Injectable({ providedIn: 'root' })
], TeamService);
export { TeamService };
