import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-title-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="title-bar" [class.match-mode]="minimal">
      <!-- Drag Region -->
      <div class="drag-region">
        @if (!minimal) {
          <div class="app-info">
            <img src="assets/icon.svg" alt="Logo" class="app-logo">
            <span class="app-name">Clutch</span>
          </div>
        }
        
        @if (title) {
          <span class="title">{{ title }}</span>
        }
      </div>

      <!-- Window Controls -->
      <div class="window-controls">
        <button class="control-btn minimize" (click)="minimize()" title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="5.5" width="8" height="1" fill="currentColor"/>
          </svg>
        </button>
        
        @if (!minimal) {
          <button class="control-btn maximize" (click)="maximize()" title="Maximize">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
            </svg>
          </button>
        }
        
        <button class="control-btn close" (click)="close()" title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .title-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 36px;
      background: #0f0f1a;
      border-bottom: 1px solid #252542;
      -webkit-app-region: drag;
      user-select: none;
    }

    .title-bar.match-mode {
      height: 28px;
      background: transparent;
      border-bottom: none;
    }

    .drag-region {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      padding-left: 12px;
    }

    .app-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .app-logo {
      width: 18px;
      height: 18px;
    }

    .app-name {
      font-size: 12px;
      font-weight: 600;
      color: #888;
    }

    .title {
      font-size: 12px;
      color: #666;
    }

    .window-controls {
      display: flex;
      -webkit-app-region: no-drag;
    }

    .control-btn {
      width: 46px;
      height: 36px;
      border: none;
      background: transparent;
      color: #888;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .match-mode .control-btn {
      width: 32px;
      height: 28px;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .control-btn.close:hover {
      background: #e81123;
      color: #fff;
    }
  `]
})
export class TitleBarComponent {
  @Input() title = '';
  @Input() minimal = false;

  minimize(): void {
    window.electronAPI?.minimize();
  }

  maximize(): void {
    window.electronAPI?.maximize();
  }

  close(): void {
    window.electronAPI?.close();
  }
}
