var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject, NgZone } from '@angular/core';
import { TeamService } from './team.service';
import { VoiceService } from './voice.service';
import { SocketService } from './socket.service';
let HotkeyService = class HotkeyService {
    constructor() {
        this.teamService = inject(TeamService);
        this.voiceService = inject(VoiceService);
        this.socketService = inject(SocketService);
        this.ngZone = inject(NgZone);
        this.isListening = false;
    }
    startListening() {
        if (this.isListening || !window.electronAPI)
            return;
        window.electronAPI.onHotkey((action) => {
            // Run inside Angular zone for change detection
            this.ngZone.run(() => {
                this.handleHotkey(action);
            });
        });
        this.isListening = true;
        console.log('[HotkeyService] Started listening');
    }
    stopListening() {
        if (!this.isListening || !window.electronAPI)
            return;
        window.electronAPI.removeHotkeyListener();
        this.isListening = false;
        console.log('[HotkeyService] Stopped listening');
    }
    handleHotkey(action) {
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
    ngOnDestroy() {
        this.stopListening();
    }
};
HotkeyService = __decorate([
    Injectable({ providedIn: 'root' })
], HotkeyService);
export { HotkeyService };
