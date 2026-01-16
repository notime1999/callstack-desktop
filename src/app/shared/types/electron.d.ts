// Type declarations for Electron API (matches electron/preload.ts)

export type HotkeyAction =
  | 'default-mode'
  | 'clutch-mode'
  | 'prep-mode'
  | 'ptt-start'
  | 'ptt-stop'
  | 'toggle-mute'
  | 'mark-dead';

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      toggleOverlay: (show: boolean) => Promise<void>;
      updateOverlay: (data: unknown) => Promise<void>;
      onHotkey: (callback: (action: HotkeyAction) => void) => void;
      removeHotkeyListener: () => void;
      onOverlayData: (callback: (data: unknown) => void) => void;
    };
  }
}

export { };
