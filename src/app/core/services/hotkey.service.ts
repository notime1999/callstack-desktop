import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { TeamService } from './team.service';
import { VoiceService } from './voice.service';
import { SocketService } from './socket.service';
import type { HotkeyAction } from '../../shared/types/electron.d';

@Injectable({ providedIn: 'root' })
export class HotkeyService implements OnDestroy {
  private teamService = inject(TeamService);
  private voiceService = inject(VoiceService);
  private socketService = inject(SocketService);
  private ngZone = inject(NgZone);

  private isListening = false;

  startListening(): void {
    if (this.isListening || !window.electronAPI) return;

    window.electronAPI.onHotkey((action: HotkeyAction) => {
      // Run inside Angular zone for change detection
      this.ngZone.run(() => {
        this.handleHotkey(action);
      });
    });

    this.isListening = true;
    console.log('[HotkeyService] Started listening');
  }

  stopListening(): void {
    if (!this.isListening || !window.electronAPI) return;

    window.electronAPI.removeHotkeyListener();
    this.isListening = false;
    console.log('[HotkeyService] Stopped listening');
  }

  private handleHotkey(action: HotkeyAction): void {
    const isIGL = this.teamService.isIGL();

    switch (action) {
      case 'default-mode':
        if (isIGL) {
          this.teamService.setVoiceMode('default');
          this.socketService.changeVoiceMode('default');
          this.voiceService.applyVoiceMode('default');
        }
        break;

      case 'clutch-mode':
        if (isIGL) {
          this.teamService.setVoiceMode('clutch');
          this.socketService.changeVoiceMode('clutch');
          this.voiceService.applyVoiceMode('clutch');
        }
        break;

      case 'prep-mode':
        if (isIGL) {
          this.teamService.setVoiceMode('prep');
          this.socketService.changeVoiceMode('prep');
          this.voiceService.applyVoiceMode('prep');
        }
        break;

      case 'ptt-start':
        if (this.teamService.canSpeak()) {
          this.voiceService.startTalking();
        }
        break;

      case 'ptt-stop':
        this.voiceService.stopTalking();
        break;

      case 'toggle-mute':
        this.voiceService.toggleMute();
        break;

      case 'mark-dead':
        const currentPlayer = this.teamService.currentPlayer();
        if (currentPlayer) {
          this.teamService.markDead(currentPlayer.id);
          this.socketService.updatePlayer({ isAlive: false, isMuted: true });
        }
        break;
    }
  }

  ngOnDestroy(): void {
    this.stopListening();
  }
}
