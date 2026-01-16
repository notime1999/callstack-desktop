var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TitleBarComponent } from './shared/components/title-bar/title-bar.component';
import { SocketService } from './core/services/socket.service';
import { HotkeyService } from './core/services/hotkey.service';
let AppComponent = class AppComponent {
    constructor() {
        this.socketService = inject(SocketService);
        this.hotkeyService = inject(HotkeyService);
        this.isMatchMode = false;
    }
    ngOnInit() {
        // Connect to server
        this.socketService.connect();
        // Start listening for hotkeys (only in Electron)
        if (window.electronAPI) {
            this.hotkeyService.startListening();
        }
    }
};
AppComponent = __decorate([
    Component({
        selector: 'app-root',
        standalone: true,
        imports: [CommonModule, RouterOutlet, TitleBarComponent],
        template: `
    <div class="app-container">
      <app-title-bar [minimal]="isMatchMode"></app-title-bar>
      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
        styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #1a1a2e;
      color: #eee;
    }

    .app-content {
      flex: 1;
      overflow: auto;
    }
  `]
    })
], AppComponent);
export { AppComponent };
