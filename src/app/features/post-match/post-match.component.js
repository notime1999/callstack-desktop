var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
let PostMatchComponent = class PostMatchComponent {
    constructor() {
        this.router = inject(Router);
        this.matchDuration = 42 * 60 + 18;
        this.hasRecording = true;
        this.isPlaying = false;
        this.currentTime = 0;
        this.playbackProgress = 0;
        this.notes = '';
        this.timelineEvents = [
            { timestamp: 180, type: 'mode-change', label: 'Clutch Mode', icon: '🔴' },
            { timestamp: 420, type: 'marker', label: 'Teamfight', icon: '⚔️' },
            { timestamp: 890, type: 'mode-change', label: 'Prep Mode', icon: '🧠' },
            { timestamp: 1200, type: 'marker', label: 'Timeout', icon: '⏸️' },
            { timestamp: 1800, type: 'mode-change', label: 'Clutch Mode', icon: '🔴' },
            { timestamp: 2100, type: 'marker', label: '1v3 Clutch', icon: '🏆' }
        ];
    }
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    formatTime(seconds) {
        return this.formatDuration(seconds);
    }
    getMarkerPosition(timestamp) {
        return (timestamp / this.matchDuration) * 100;
    }
    seekTo(timestamp) {
        this.currentTime = timestamp;
        this.playbackProgress = this.getMarkerPosition(timestamp);
    }
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
    }
    exportAudio() {
        console.log('Export audio');
    }
    shareReview() {
        console.log('Share review');
    }
    backToLobby() {
        this.router.navigate(['/lobby']);
    }
};
PostMatchComponent = __decorate([
    Component({
        selector: 'app-post-match',
        standalone: true,
        imports: [CommonModule, FormsModule],
        template: `
    <div class="post-match-container">
      <header>
        <h1>MATCH SUMMARY</h1>
        <p class="duration">Duration: {{ formatDuration(matchDuration) }}</p>
      </header>

      <!-- Timeline -->
      <section class="timeline-section">
        <h2>TIMELINE</h2>
        <div class="timeline">
          <div class="timeline-bar">
            @for (event of timelineEvents; track event.timestamp) {
              <div 
                class="timeline-marker"
                [class]="event.type"
                [style.left.%]="getMarkerPosition(event.timestamp)"
                [title]="event.label">
                <span class="marker-icon">{{ event.icon }}</span>
              </div>
            }
          </div>
          <div class="timeline-labels">
            <span>0:00</span>
            <span>{{ formatDuration(matchDuration) }}</span>
          </div>
        </div>
      </section>

      <!-- Events List -->
      <section class="events-section">
        <h2>KEY MOMENTS</h2>
        <div class="events-list">
          @for (event of timelineEvents; track event.timestamp) {
            <div class="event-item" (click)="seekTo(event.timestamp)">
              <span class="event-time">{{ formatTime(event.timestamp) }}</span>
              <span class="event-icon">{{ event.icon }}</span>
              <span class="event-label">{{ event.label }}</span>
            </div>
          } @empty {
            <p class="no-events">No events recorded</p>
          }
        </div>
      </section>

      <!-- Playback (if recording enabled) -->
      @if (hasRecording) {
        <section class="playback-section">
          <h2>VOICE PLAYBACK</h2>
          <div class="playback-controls">
            <button class="btn-icon" (click)="togglePlayback()">
              {{ isPlaying ? '⏸️' : '▶️' }}
            </button>
            <div class="playback-progress">
              <div 
                class="progress-bar" 
                [style.width.%]="playbackProgress">
              </div>
            </div>
            <span class="playback-time">
              {{ formatTime(currentTime) }} / {{ formatDuration(matchDuration) }}
            </span>
          </div>
        </section>
      }

      <!-- Notes -->
      <section class="notes-section">
        <h2>NOTES</h2>
        <textarea 
          class="notes-input"
          placeholder="Add notes about this match..."
          [(ngModel)]="notes">
        </textarea>
      </section>

      <!-- Actions -->
      <footer class="actions">
        <button class="btn-secondary" (click)="exportAudio()">
          📥 Export Audio
        </button>
        <button class="btn-secondary" (click)="shareReview()">
          🔗 Share Review
        </button>
        <button class="btn-primary" (click)="backToLobby()">
          Back to Lobby
        </button>
      </footer>
    </div>
  `,
        styles: [`
    .post-match-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 32px;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
    }

    header h1 { margin: 0; font-size: 24px; }
    .duration { color: #888; margin: 4px 0 0; }

    section {
      background: #252542;
      padding: 20px;
      border-radius: 12px;
    }

    section h2 {
      margin: 0 0 16px;
      font-size: 12px;
      color: #888;
      letter-spacing: 1px;
    }

    .timeline {
      padding: 20px 0;
    }

    .timeline-bar {
      position: relative;
      height: 8px;
      background: #333;
      border-radius: 4px;
    }

    .timeline-marker {
      position: absolute;
      top: -8px;
      transform: translateX(-50%);
      cursor: pointer;
    }

    .marker-icon {
      font-size: 16px;
    }

    .timeline-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: #888;
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
    }

    .event-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #1a1a2e;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .event-item:hover { background: #2a2a4e; }

    .event-time {
      font-family: monospace;
      color: #888;
      min-width: 60px;
    }

    .no-events { color: #666; text-align: center; }

    .playback-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-icon {
      width: 48px;
      height: 48px;
      background: #333;
      border: none;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
    }

    .playback-progress {
      flex: 1;
      height: 8px;
      background: #333;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: #6366f1;
      transition: width 0.1s;
    }

    .playback-time {
      font-family: monospace;
      color: #888;
      min-width: 100px;
    }

    .notes-input {
      width: 100%;
      min-height: 100px;
      padding: 12px;
      background: #1a1a2e;
      border: 1px solid #333;
      border-radius: 8px;
      color: #eee;
      font-family: inherit;
      resize: vertical;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: auto;
    }

    .btn-primary {
      margin-left: auto;
      padding: 12px 24px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-secondary {
      padding: 12px 24px;
      background: transparent;
      color: #888;
      border: 1px solid #444;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-secondary:hover { color: #fff; border-color: #666; }
  `]
    })
], PostMatchComponent);
export { PostMatchComponent };
