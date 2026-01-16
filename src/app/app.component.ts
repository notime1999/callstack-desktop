import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TitleBarComponent } from './shared/components/title-bar/title-bar.component';
import { SocketService } from './core/services/socket.service';
import { HotkeyService } from './core/services/hotkey.service';

@Component({
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
export class AppComponent implements OnInit {
  private socketService = inject(SocketService);
  private hotkeyService = inject(HotkeyService);

  isMatchMode = false;

  ngOnInit(): void {
    // Connect to server
    this.socketService.connect();

    // Start listening for hotkeys (only in Electron)
    if (window.electronAPI) {
      this.hotkeyService.startListening();
    }
  }
}
