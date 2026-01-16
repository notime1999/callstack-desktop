var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, signal } from '@angular/core';
import { io } from 'socket.io-client';
import { environment } from '../../../environments/environment';
let SocketService = class SocketService {
    constructor() {
        this.socket = null;
        this._isConnected = signal(false);
        this.isConnected = this._isConnected.asReadonly();
    }
    getServerUrl() {
        // Use environment config, fallback to auto-detect
        if (environment.serverUrl && environment.serverUrl !== '__SERVER_URL__') {
            return environment.serverUrl;
        }
        // In development, use localhost:3001
        if (window.location.hostname === 'localhost' && window.location.port === '4200') {
            return 'http://localhost:3001';
        }
        // Fallback: connect to same host
        return window.location.origin;
    }
    connect(serverUrl) {
        if (this.socket?.connected)
            return;
        const url = serverUrl || this.getServerUrl();
        this.socket = io(url, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        this.socket.on('connect', () => {
            console.log('[Socket] Connected:', this.socket?.id);
            this._isConnected.set(true);
        });
        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            this._isConnected.set(false);
        });
        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
        });
    }
    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
        this._isConnected.set(false);
    }
    // Emit with any event
    emit(event, ...args) {
        this.socket?.emit(event, ...args);
    }
    // Listen with any event
    on(event, callback) {
        this.socket?.on(event, callback);
    }
    off(event) {
        this.socket?.off(event);
    }
    // Convenience methods
    joinTeam(teamId, player) {
        this.emit('join-team', teamId, player);
    }
    leaveTeam() {
        this.emit('leave-team');
    }
    changeVoiceMode(mode) {
        this.emit('change-voice-mode', mode);
    }
    startMatch(options) {
        this.emit('start-match', options);
    }
    endMatch() {
        this.emit('end-match');
    }
    updatePlayer(update) {
        this.emit('update-player', update);
    }
};
SocketService = __decorate([
    Injectable({ providedIn: 'root' })
], SocketService);
export { SocketService };
