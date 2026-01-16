import { TestBed } from '@angular/core/testing';
import { VoiceService } from './voice.service';
import { TeamService } from './team.service';
import { SocketService } from './socket.service';
import { signal } from '@angular/core';
describe('VoiceService', () => {
    let service;
    let teamService;
    let socketService;
    beforeEach(() => {
        const socketSpy = {
            on: jest.fn(),
            emit: jest.fn(),
            off: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: signal(true)
        };
        TestBed.configureTestingModule({
            providers: [
                VoiceService,
                TeamService,
                { provide: SocketService, useValue: socketSpy }
            ]
        });
        service = TestBed.inject(VoiceService);
        teamService = TestBed.inject(TeamService);
        socketService = TestBed.inject(SocketService);
        // Setup team with IGL so canSpeak() returns true
        teamService.setTeam({
            id: 'team-1',
            name: 'Test Team',
            game: 'cs2',
            status: 'idle',
            leaderId: 'player-1',
            players: [{
                    id: 'player-1',
                    name: 'TestPlayer',
                    role: 'igl',
                    status: 'ready',
                    isMuted: false,
                    isSpeaking: false,
                    isAlive: true
                }],
            maxPlayers: 5
        });
        teamService.setCurrentPlayer('player-1');
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
    describe('initialize', () => {
        it('should request microphone access', async () => {
            await service.initialize();
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
                audio: expect.objectContaining({
                    echoCancellation: true,
                    noiseSuppression: true
                })
            });
        });
        it('should set isInitialized to true', async () => {
            await service.initialize();
            expect(service.isInitialized()).toBe(true);
        });
    });
    describe('mute/unmute', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should toggle mute state', () => {
            expect(service.isMuted()).toBe(false);
            service.mute();
            expect(service.isMuted()).toBe(true);
            // canSpeak() is true because we're IGL
            service.unmute();
            expect(service.isMuted()).toBe(false);
        });
        it('should call toggleMute', () => {
            service.mute();
            expect(service.isMuted()).toBe(true);
            service.toggleMute();
            expect(service.isMuted()).toBe(false);
        });
    });
    describe('destroy', () => {
        it('should cleanup resources', async () => {
            await service.initialize();
            service.destroy();
            expect(service.isInitialized()).toBe(false);
        });
    });
});
