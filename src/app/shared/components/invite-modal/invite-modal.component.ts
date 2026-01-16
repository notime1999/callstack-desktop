import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invite-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-container">
        <header class="modal-header">
          <h2>🔗 Invite Players</h2>
          <button class="close-btn" (click)="close.emit()">✕</button>
        </header>

        <div class="modal-content">
          <!-- Invite Link -->
          <section class="invite-section">
            <h3>Share Invite Link</h3>
            <div class="link-box">
              <input 
                type="text" 
                [value]="inviteLink" 
                readonly 
                class="link-input"
                #linkInput>
              <button class="copy-btn" (click)="copyLink(linkInput)">
                {{ copied() ? '✓ Copied!' : '📋 Copy' }}
              </button>
            </div>
            <p class="hint">Link expires in 24 hours</p>
          </section>

          <!-- QR Code -->
          <section class="qr-section">
            <h3>Scan QR Code</h3>
            <div class="qr-container">
              <div class="qr-code">
                <!-- Simple QR representation -->
                <svg viewBox="0 0 100 100" class="qr-svg">
                  <!-- QR Pattern (simplified) -->
                  <rect x="10" y="10" width="20" height="20" fill="currentColor"/>
                  <rect x="70" y="10" width="20" height="20" fill="currentColor"/>
                  <rect x="10" y="70" width="20" height="20" fill="currentColor"/>
                  <rect x="35" y="10" width="5" height="5" fill="currentColor"/>
                  <rect x="45" y="10" width="5" height="5" fill="currentColor"/>
                  <rect x="55" y="15" width="5" height="5" fill="currentColor"/>
                  <rect x="35" y="25" width="5" height="5" fill="currentColor"/>
                  <rect x="50" y="30" width="5" height="5" fill="currentColor"/>
                  <rect x="40" y="40" width="20" height="20" fill="currentColor"/>
                  <rect x="10" y="40" width="5" height="5" fill="currentColor"/>
                  <rect x="20" y="45" width="5" height="5" fill="currentColor"/>
                  <rect x="85" y="40" width="5" height="5" fill="currentColor"/>
                  <rect x="75" y="50" width="5" height="5" fill="currentColor"/>
                  <rect x="35" y="70" width="5" height="5" fill="currentColor"/>
                  <rect x="50" y="75" width="5" height="5" fill="currentColor"/>
                  <rect x="70" y="70" width="5" height="5" fill="currentColor"/>
                  <rect x="80" y="80" width="5" height="5" fill="currentColor"/>
                  <rect x="45" y="85" width="5" height="5" fill="currentColor"/>
                </svg>
              </div>
            </div>
            <p class="hint">Scan with mobile to join</p>
          </section>

          <!-- Direct Invite -->
          <section class="direct-section">
            <h3>Send Invite</h3>
            <div class="share-buttons">
              <button class="share-btn discord" (click)="shareVia('discord')">
                <span class="icon">💬</span>
                Discord
              </button>
              <button class="share-btn steam" (click)="shareVia('steam')">
                <span class="icon">🎮</span>
                Steam
              </button>
              <button class="share-btn email" (click)="shareVia('email')">
                <span class="icon">📧</span>
                Email
              </button>
            </div>
          </section>

          <!-- Team Code -->
          <section class="code-section">
            <h3>Team Code</h3>
            <div class="team-code">
              <span class="code">{{ teamCode }}</span>
              <button class="copy-btn small" (click)="copyCode()">📋</button>
            </div>
            <p class="hint">Share this code for quick join</p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-container {
      width: 480px;
      background: #1a1a2e;
      border-radius: 16px;
      border: 1px solid #333;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #333;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 18px;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      color: #888;
      font-size: 18px;
      cursor: pointer;
      border-radius: 6px;
    }

    .close-btn:hover {
      background: #333;
      color: #fff;
    }

    .modal-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    section h3 {
      margin: 0 0 12px;
      font-size: 13px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .link-box {
      display: flex;
      gap: 8px;
    }

    .link-input {
      flex: 1;
      padding: 12px;
      background: #252542;
      border: 1px solid #333;
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
    }

    .copy-btn {
      padding: 12px 20px;
      background: #6366f1;
      border: none;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-weight: 500;
      white-space: nowrap;
    }

    .copy-btn:hover {
      background: #5558e3;
    }

    .copy-btn.small {
      padding: 8px 12px;
    }

    .hint {
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }

    .qr-container {
      display: flex;
      justify-content: center;
      padding: 20px;
      background: #fff;
      border-radius: 12px;
    }

    .qr-code {
      width: 150px;
      height: 150px;
    }

    .qr-svg {
      width: 100%;
      height: 100%;
      color: #000;
    }

    .share-buttons {
      display: flex;
      gap: 12px;
    }

    .share-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: #252542;
      border: 1px solid #333;
      border-radius: 8px;
      color: #ccc;
      cursor: pointer;
      transition: all 0.2s;
    }

    .share-btn:hover {
      border-color: #555;
      color: #fff;
    }

    .share-btn .icon {
      font-size: 24px;
    }

    .share-btn.discord:hover { border-color: #5865f2; }
    .share-btn.steam:hover { border-color: #1b2838; }
    .share-btn.email:hover { border-color: #ea4335; }

    .team-code {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      background: #252542;
      border-radius: 8px;
    }

    .code {
      font-size: 28px;
      font-weight: 700;
      font-family: monospace;
      letter-spacing: 4px;
      color: #fff;
    }
  `]
})
export class InviteModalComponent implements OnInit {
  @Input() teamId = '';
  @Output() close = new EventEmitter<void>();

  inviteLink = '';
  teamCode = '';
  copied = signal(false);

  ngOnInit() {
    // Use the actual team ID as the code (it's already 6 chars)
    this.teamCode = this.teamId.toUpperCase();
    this.inviteLink = `Team Code: ${this.teamCode}`;
  }

  private generateTeamCode(): string {
    // Generate 6 character code from team ID
    return this.teamId.slice(0, 6).toUpperCase() || 'ABC123';
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  copyLink(input: HTMLInputElement) {
    navigator.clipboard.writeText(input.value);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  copyCode() {
    navigator.clipboard.writeText(this.teamCode);
  }

  shareVia(platform: string) {
    const message = `Join my team on Tactical Voice: ${this.inviteLink}`;

    switch (platform) {
      case 'discord':
        // Discord doesn't have a direct share URL, copy to clipboard
        navigator.clipboard.writeText(message);
        break;
      case 'steam':
        window.open(`steam://friends/message?text=${encodeURIComponent(message)}`);
        break;
      case 'email':
        window.open(`mailto:?subject=Join my team&body=${encodeURIComponent(message)}`);
        break;
    }
  }
}
