import { TestBed } from '@angular/core/testing';
import { TeamService } from './team.service';
describe('TeamService', () => {
    let service;
    const mockPlayer = {
        id: 'player-1',
        name: 'TestPlayer',
        role: 'igl',
        status: 'ready',
        isMuted: false,
        isSpeaking: false,
        isAlive: true
    };
    const mockTeam = {
        id: 'team-1',
        name: 'Test Team',
        game: 'cs2',
        status: 'idle',
        leaderId: 'player-1',
        players: [mockPlayer],
        maxPlayers: 5
    };
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TeamService]
        });
        service = TestBed.inject(TeamService);
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
    describe('setTeam', () => {
        it('should set the team', () => {
            service.setTeam(mockTeam);
            expect(service.team()).toEqual(mockTeam);
        });
    });
    describe('currentPlayer', () => {
        it('should return current player', () => {
            service.setTeam(mockTeam);
            service.setCurrentPlayer('player-1');
            expect(service.currentPlayer()).toEqual(mockPlayer);
        });
        it('should return null if player not found', () => {
            service.setTeam(mockTeam);
            service.setCurrentPlayer('unknown');
            expect(service.currentPlayer()).toBeNull();
        });
    });
    describe('isIGL', () => {
        it('should return true if current player is IGL', () => {
            service.setTeam(mockTeam);
            service.setCurrentPlayer('player-1');
            expect(service.isIGL()).toBe(true);
        });
        it('should return false if current player is not IGL', () => {
            const team = {
                ...mockTeam,
                players: [{ ...mockPlayer, role: 'player' }]
            };
            service.setTeam(team);
            service.setCurrentPlayer('player-1');
            expect(service.isIGL()).toBe(false);
        });
    });
    describe('canSpeak', () => {
        beforeEach(() => {
            service.setTeam(mockTeam);
            service.setCurrentPlayer('player-1');
        });
        it('should allow IGL to speak in default mode', () => {
            expect(service.canSpeak()).toBe(true);
        });
        it('should allow IGL to speak in clutch mode', () => {
            service.setVoiceMode('clutch');
            expect(service.canSpeak()).toBe(true);
        });
        it('should not allow player to speak in clutch mode', () => {
            // Create a new team with a player role (not IGL)
            const playerOnlyTeam = {
                ...mockTeam,
                leaderId: 'other-leader',
                players: [{ ...mockPlayer, role: 'player' }]
            };
            service.setTeam(playerOnlyTeam);
            service.setCurrentPlayer('player-1');
            // Manually set voice mode (bypass IGL check for test)
            // We need to test canSpeak, not setVoiceMode
            service._voiceMode.set('clutch');
            expect(service.canSpeak()).toBe(false);
        });
    });
    describe('setVoiceMode', () => {
        it('should only allow IGL to change mode', () => {
            service.setTeam(mockTeam);
            service.setCurrentPlayer('player-1');
            service.setVoiceMode('clutch');
            expect(service.voiceMode()).toBe('clutch');
        });
        it('should not change mode if not IGL', () => {
            const team = {
                ...mockTeam,
                leaderId: 'other-leader',
                players: [{ ...mockPlayer, role: 'player' }]
            };
            service.setTeam(team);
            service.setCurrentPlayer('player-1');
            service.setVoiceMode('clutch');
            expect(service.voiceMode()).toBe('default');
        });
    });
    describe('markDead', () => {
        it('should mark player as dead and muted', () => {
            service.setTeam(mockTeam);
            service.markDead('player-1');
            const player = service.players().find(p => p.id === 'player-1');
            expect(player?.isAlive).toBe(false);
            expect(player?.isMuted).toBe(true);
        });
    });
});
