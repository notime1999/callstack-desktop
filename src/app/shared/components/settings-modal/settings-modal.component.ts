import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioSettingsComponent } from '../audio-settings/audio-settings.component';
import { VoiceService } from '../../../core/services/voice.service';
import { DEFAULT_HOTKEYS, HotkeyConfig } from '../../types';

type SettingsTab = 'audio' | 'hotkeys' | 'overlay' | 'account';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AudioSettingsComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-container">
        <!-- Header -->
        <header class="modal-header">
          <h2>⚙️ Settings</h2>
          <button class="close-btn" (click)="close.emit()">✕</button>
        </header>

        <!-- Tabs -->
        <nav class="tabs">
          @for (tab of tabs; track tab.id) {
            <button 
              class="tab" 
              [class.active]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)">
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
            </button>
          }
        </nav>

        <!-- Content -->
        <div class="modal-content">
          @switch (activeTab()) {
            @case ('audio') {
              <app-audio-settings 
                (settingsChange)="onAudioSettingsChange($event)">
              </app-audio-settings>
            }

            @case ('hotkeys') {
              <div class="hotkeys-settings">
                <h3>Keyboard Shortcuts</h3>
                <p class="hint">Click on a key to change it</p>

                <div class="hotkey-list">
                  @for (hotkey of hotkeyList; track hotkey.key) {
                    <div class="hotkey-item">
                      <span class="hotkey-label">{{ hotkey.label }}</span>
                      <button 
                        class="hotkey-key"
                        [class.recording]="recordingHotkey === hotkey.key"
                        (click)="startRecordingHotkey(hotkey.key)">
                        {{ recordingHotkey === hotkey.key ? 'Press key...' : hotkeys[hotkey.key] }}
                      </button>
                      <button 
                        class="reset-btn" 
                        (click)="resetHotkey(hotkey.key)"
                        title="Reset to default">
                        ↺
                      </button>
                    </div>
                  }
                </div>

                <div class="hotkey-actions">
                  <button class="btn-secondary" (click)="resetAllHotkeys()">
                    Reset All to Defaults
                  </button>
                </div>
              </div>
            }

            @case ('overlay') {
              <div class="overlay-settings">
                <h3>Overlay Settings</h3>

                <div class="setting-group">
                  <label class="toggle-setting">
                    <input type="checkbox" [(ngModel)]="overlaySettings.enabled">
                    <span>Enable Overlay</span>
                  </label>
                </div>

                <div class="setting-group">
                  <label class="setting-label">Position</label>
                  <div class="position-grid">
                    @for (pos of positions; track pos.value) {
                      <button 
                        class="position-btn"
                        [class.selected]="overlaySettings.position === pos.value"
                        (click)="overlaySettings.position = pos.value">
                        {{ pos.label }}
                      </button>
                    }
                  </div>
                </div>

                <div class="setting-group">
                  <label class="setting-label">Size</label>
                  <select [(ngModel)]="overlaySettings.size" class="setting-select">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div class="setting-group">
                  <label class="setting-label">Opacity</label>
                  <input 
                    type="range" 
                    min="30" 
                    max="100" 
                    [(ngModel)]="overlaySettings.opacity"
                    class="slider">
                  <span class="value">{{ overlaySettings.opacity }}%</span>
                </div>

                <div class="setting-group">
                  <label class="toggle-setting">
                    <input type="checkbox" [(ngModel)]="overlaySettings.showRoles">
                    <span>Show Role Icons</span>
                  </label>
                </div>

                <div class="setting-group">
                  <label class="toggle-setting">
                    <input type="checkbox" [(ngModel)]="overlaySettings.showMode">
                    <span>Show Current Mode</span>
                  </label>
                </div>

                <div class="obs-hint">
                  <h4>OBS Browser Source</h4>
                  <p>Add this URL as a Browser Source in OBS:</p>
                  <code>http://localhost:4200/overlay</code>
                  <button class="copy-btn" (click)="copyOverlayUrl()">📋 Copy</button>
                </div>
              </div>
            }

            @case ('account') {
              <div class="account-settings">
                <h3>Account</h3>

                <div class="profile-section">
                  <div class="avatar">
                    {{ getInitials(username) }}
                  </div>
                  <div class="profile-info">
                    <input 
                      type="text" 
                      [(ngModel)]="username" 
                      class="username-input"
                      placeholder="Your name">
                    <span class="plan-badge" [class]="currentPlan">
                      {{ currentPlan | uppercase }}
                    </span>
                  </div>
                </div>

                @if (currentPlan === 'free') {
                  <div class="upgrade-card">
                    <h4>🚀 Upgrade to Pro</h4>
                    <ul>
                      <li>✅ All voice modes</li>
                      <li>✅ Recording & timeline</li>
                      <li>✅ Custom overlay</li>
                      <li>✅ Priority support</li>
                    </ul>
                    <button class="btn-primary">Upgrade - €15/month</button>
                  </div>
                }

                <div class="danger-zone">
                  <h4>Danger Zone</h4>
                  <button class="btn-danger" (click)="logout()">
                    Log Out
                  </button>
                </div>

                <!-- Updates Section -->
                <div class="updates-section">
                  <h4>🔄 Updates</h4>
                  <button 
                    class="btn-secondary" 
                    (click)="checkForUpdates()" 
                    [disabled]="isCheckingUpdates">
                    {{ isCheckingUpdates ? 'Checking...' : 'Check for Updates' }}
                  </button>
                  @if (updateMessage) {
                    <p class="update-result" [class.has-update]="hasUpdate">
                      {{ updateMessage }}
                    </p>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- Footer -->
        <footer class="modal-footer">
          <button class="btn-secondary" (click)="close.emit()">Cancel</button>
          <button class="btn-primary" (click)="saveSettings()">Save Changes</button>
        </footer>
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
      width: 700px;
      max-height: 85vh;
      background: #1a1a2e;
      border-radius: 16px;
      border: 1px solid #333;
      display: flex;
      flex-direction: column;
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
      font-size: 20px;
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

    .tabs {
      display: flex;
      padding: 0 24px;
      border-bottom: 1px solid #333;
      background: #151525;
    }

    .tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px;
      background: transparent;
      border: none;
      color: #888;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover { color: #ccc; }

    .tab.active {
      color: #fff;
      border-bottom-color: #6366f1;
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #333;
    }

    /* Hotkeys */
    .hotkeys-settings h3 { margin: 0 0 8px; }
    .hint { color: #888; font-size: 13px; margin-bottom: 20px; }

    .hotkey-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .hotkey-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #252542;
      border-radius: 8px;
    }

    .hotkey-label {
      flex: 1;
      font-size: 14px;
    }

    .hotkey-key {
      min-width: 100px;
      padding: 8px 16px;
      background: #333;
      border: 1px solid #444;
      border-radius: 6px;
      color: #fff;
      font-family: monospace;
      cursor: pointer;
    }

    .hotkey-key.recording {
      background: #6366f120;
      border-color: #6366f1;
      animation: pulse 1s infinite;
    }

    .reset-btn {
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 16px;
    }

    .reset-btn:hover { color: #fff; }

    .hotkey-actions {
      margin-top: 20px;
    }

    /* Overlay */
    .overlay-settings h3 { margin: 0 0 20px; }

    .setting-group {
      margin-bottom: 20px;
    }

    .setting-label {
      display: block;
      font-size: 12px;
      color: #888;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .toggle-setting {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }

    .toggle-setting input {
      width: 20px;
      height: 20px;
      accent-color: #6366f1;
    }

    .position-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .position-btn {
      padding: 12px;
      background: #252542;
      border: 2px solid #333;
      border-radius: 6px;
      color: #aaa;
      cursor: pointer;
      font-size: 12px;
    }

    .position-btn.selected {
      border-color: #6366f1;
      color: #fff;
    }

    .setting-select {
      width: 100%;
      padding: 10px;
      background: #252542;
      border: 1px solid #333;
      border-radius: 6px;
      color: #fff;
    }

    .slider {
      width: calc(100% - 50px);
      accent-color: #6366f1;
    }

    .value {
      margin-left: 12px;
      color: #888;
    }

    .obs-hint {
      margin-top: 24px;
      padding: 16px;
      background: #252542;
      border-radius: 8px;
    }

    .obs-hint h4 { margin: 0 0 8px; font-size: 14px; }
    .obs-hint p { color: #888; font-size: 13px; margin-bottom: 8px; }

    .obs-hint code {
      display: block;
      padding: 8px 12px;
      background: #1a1a2e;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .copy-btn {
      padding: 6px 12px;
      background: #333;
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font-size: 12px;
    }

    /* Account */
    .profile-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .avatar {
      width: 64px;
      height: 64px;
      background: #6366f1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 600;
    }

    .profile-info {
      flex: 1;
    }

    .username-input {
      width: 100%;
      padding: 10px;
      background: #252542;
      border: 1px solid #333;
      border-radius: 6px;
      color: #fff;
      font-size: 16px;
      margin-bottom: 8px;
    }

    .plan-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .plan-badge.free { background: #333; color: #888; }
    .plan-badge.pro { background: #6366f120; color: #6366f1; }

    .upgrade-card {
      padding: 20px;
      background: linear-gradient(135deg, #6366f120, #8b5cf620);
      border: 1px solid #6366f150;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .upgrade-card h4 { margin: 0 0 12px; }
    .upgrade-card ul { margin: 0 0 16px; padding-left: 0; list-style: none; }
    .upgrade-card li { padding: 4px 0; color: #ccc; }

    .danger-zone {
      padding: 16px;
      background: #2a1a1e;
      border: 1px solid #ef444450;
      border-radius: 8px;
    }

    .danger-zone h4 { margin: 0 0 12px; color: #ef4444; }

    .btn-primary {
      padding: 10px 20px;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-secondary {
      padding: 10px 20px;
      background: #333;
      color: #ccc;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-danger {
      padding: 10px 20px;
      background: #ef4444;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .updates-section {
      padding: 16px;
      background: #252542;
      border-radius: 8px;
      margin-top: 16px;
    }

    .updates-section h4 {
      margin: 0 0 12px;
      color: #fff;
    }

    .update-result {
      margin-top: 12px;
      padding: 10px;
      background: #1a1a2e;
      border-radius: 6px;
      font-size: 13px;
      color: #888;
    }

    .update-result.has-update {
      background: #22c55e20;
      color: #22c55e;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `]
})
export class SettingsModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() settingsSaved = new EventEmitter<any>();

  activeTab = signal<SettingsTab>('audio');

  tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'audio', label: 'Audio', icon: '🎧' },
    { id: 'hotkeys', label: 'Hotkeys', icon: '⌨️' },
    { id: 'overlay', label: 'Overlay', icon: '🖼️' },
    { id: 'account', label: 'Account', icon: '👤' }
  ];

  // Hotkeys
  hotkeys: HotkeyConfig = { ...DEFAULT_HOTKEYS };
  recordingHotkey: keyof HotkeyConfig | null = null;

  hotkeyList: { key: keyof HotkeyConfig; label: string }[] = [
    { key: 'defaultMode', label: 'Default Mode' },
    { key: 'clutchMode', label: 'Clutch Mode' },
    { key: 'prepMode', label: 'Prep Mode' },
    { key: 'pushToTalk', label: 'Push to Talk' },
    { key: 'toggleMute', label: 'Toggle Mute' },
    { key: 'markDead', label: 'Mark as Dead' }
  ];

  // Overlay
  overlaySettings = {
    enabled: true,
    position: 'top-right',
    size: 'medium',
    opacity: 85,
    showRoles: true,
    showMode: true
  };

  positions = [
    { value: 'top-left', label: '↖ Top Left' },
    { value: 'top-center', label: '↑ Top' },
    { value: 'top-right', label: '↗ Top Right' },
    { value: 'bottom-left', label: '↙ Bottom Left' },
    { value: 'bottom-center', label: '↓ Bottom' },
    { value: 'bottom-right', label: '↘ Bottom Right' }
  ];

  // Account
  username = 'Player';
  currentPlan: 'free' | 'pro' = 'free';

  // Updates
  isCheckingUpdates = false;
  updateMessage = '';
  hasUpdate = false;

  private voiceService = inject(VoiceService);

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onAudioSettingsChange(settings: any) {
    console.log('Audio settings changed:', settings);
    // Reload voice service settings to apply PTT/VAD changes immediately
    this.voiceService.reloadAudioSettings();
  }

  startRecordingHotkey(key: keyof HotkeyConfig) {
    this.recordingHotkey = key;

    const handler = (event: KeyboardEvent) => {
      event.preventDefault();
      this.hotkeys[key] = event.key === ' ' ? 'Space' : event.key;
      this.recordingHotkey = null;
      window.removeEventListener('keydown', handler);
    };

    window.addEventListener('keydown', handler);
  }

  resetHotkey(key: keyof HotkeyConfig) {
    this.hotkeys[key] = DEFAULT_HOTKEYS[key];
  }

  resetAllHotkeys() {
    this.hotkeys = { ...DEFAULT_HOTKEYS };
  }

  copyOverlayUrl() {
    navigator.clipboard.writeText('http://localhost:4200/overlay');
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  logout() {
    console.log('Logout');
  }

  async checkForUpdates(): Promise<void> {
    this.isCheckingUpdates = true;
    this.updateMessage = '';
    
    try {
      const result = await window.electronAPI?.checkForUpdates();
      if (result?.error) {
        this.updateMessage = `Error: ${result.error}`;
        this.hasUpdate = false;
      } else if (result?.available) {
        this.updateMessage = `Update available: v${result.version} (current: v${result.currentVersion})`;
        this.hasUpdate = true;
      } else {
        this.updateMessage = `You're on the latest version (v${result?.currentVersion})`;
        this.hasUpdate = false;
      }
    } catch (err) {
      this.updateMessage = 'Failed to check for updates';
      this.hasUpdate = false;
    }
    
    this.isCheckingUpdates = false;
  }

  saveSettings() {
    this.settingsSaved.emit({
      hotkeys: this.hotkeys,
      overlay: this.overlaySettings,
      username: this.username
    });
    this.close.emit();
  }
}
