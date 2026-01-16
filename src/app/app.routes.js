export const routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
    },
    {
        path: 'lobby',
        loadComponent: () => import('./features/lobby/lobby.component').then(m => m.LobbyComponent)
    },
    {
        path: 'pre-match',
        loadComponent: () => import('./features/pre-match/pre-match.component').then(m => m.PreMatchComponent)
    },
    {
        path: 'match',
        loadComponent: () => import('./features/match/match.component').then(m => m.MatchComponent)
    },
    {
        path: 'post-match',
        loadComponent: () => import('./features/post-match/post-match.component').then(m => m.PostMatchComponent)
    },
    {
        path: 'overlay',
        loadComponent: () => import('./features/overlay/overlay.component').then(m => m.OverlayComponent)
    }
];
