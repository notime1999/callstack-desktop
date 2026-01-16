import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Player,
  VoiceMode
} from '../../shared/types';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private _isConnected = signal(false);

  readonly isConnected = this._isConnected.asReadonly();

  private getServerUrl(): string {
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

  connect(serverUrl?: string): void {
    if (this.socket?.connected) return;

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

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._isConnected.set(false);
  }

  // Emit with any event
  emit(event: string, ...args: unknown[]): void {
    (this.socket as any)?.emit(event, ...args);
  }

  // Listen with any event
  on(event: string, callback: (...args: any[]) => void): void {
    (this.socket as any)?.on(event, callback);
  }

  off(event: string): void {
    (this.socket as any)?.off(event);
  }

  // Convenience methods
  joinTeam(teamId: string, player: Omit<Player, 'id'>): void {
    this.emit('join-team', teamId, player);
  }

  leaveTeam(): void {
    this.emit('leave-team');
  }

  changeVoiceMode(mode: VoiceMode): void {
    this.emit('change-voice-mode', mode);
  }

  startMatch(options: { recording: boolean; overlay: boolean }): void {
    this.emit('start-match', options);
  }

  endMatch(): void {
    this.emit('end-match');
  }

  updatePlayer(update: Partial<Player>): void {
    this.emit('update-player', update);
  }
}
