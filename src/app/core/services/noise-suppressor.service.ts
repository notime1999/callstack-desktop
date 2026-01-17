import { Injectable } from '@angular/core';

/**
 * RNNoise-based noise suppression service
 * Uses Web Audio API AudioWorklet for real-time AI-based noise/echo reduction
 * Similar to Krisp, Discord, etc.
 */
@Injectable({ providedIn: 'root' })
export class NoiseSuppressorService {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private isInitialized = false;
  private enabled = true;

  /**
   * Initialize the RNNoise noise suppressor
   * @param stream The input MediaStream from getUserMedia
   * @returns A processed MediaStream with noise suppression applied
   */
  async initialize(stream: MediaStream): Promise<MediaStream> {
    if (this.isInitialized) {
      console.log('[NoiseSuppressor] Already initialized');
      return this.destinationNode?.stream || stream;
    }

    try {
      console.log('[NoiseSuppressor] Initializing RNNoise AI noise suppression...');

      // Create audio context at 48kHz (required by RNNoise)
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      
      // Load WASM binary
      const wasmPath = 'assets/audio-worklets/rnnoise.wasm';
      const response = await fetch(wasmPath);
      if (!response.ok) {
        throw new Error(`Failed to load RNNoise WASM: ${response.status}`);
      }
      const wasmBinary = await response.arrayBuffer();
      console.log('[NoiseSuppressor] WASM loaded:', wasmBinary.byteLength, 'bytes');

      // Load the AudioWorklet processor
      const workletPath = 'assets/audio-worklets/rnnoiseWorklet.js';
      await this.audioContext.audioWorklet.addModule(workletPath);
      console.log('[NoiseSuppressor] AudioWorklet module loaded');

      // Create source from input stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Create RNNoise worklet node
      // The processor name is defined in the worklet file as '@sapphi-red/web-noise-suppressor/rnnoise'
      this.workletNode = new AudioWorkletNode(
        this.audioContext, 
        '@sapphi-red/web-noise-suppressor/rnnoise',
        {
          processorOptions: {
            wasmBinary: wasmBinary,
            maxChannels: 1  // Mono for voice
          }
        }
      );

      // Create destination for the processed audio
      this.destinationNode = this.audioContext.createMediaStreamDestination();

      // Connect: source -> rnnoise -> destination
      this.sourceNode.connect(this.workletNode);
      this.workletNode.connect(this.destinationNode);

      this.isInitialized = true;
      console.log('[NoiseSuppressor] RNNoise initialized successfully - AI noise suppression active');

      return this.destinationNode.stream;
    } catch (error) {
      console.error('[NoiseSuppressor] Failed to initialize RNNoise:', error);
      console.log('[NoiseSuppressor] Falling back to original stream (no AI processing)');
      // Return original stream if RNNoise fails
      return stream;
    }
  }

  /**
   * Check if noise suppression is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable noise suppression by connecting/disconnecting nodes
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!this.isInitialized || !this.sourceNode || !this.workletNode || !this.destinationNode) {
      return;
    }

    try {
      if (enabled) {
        // Reconnect through RNNoise
        this.sourceNode.disconnect();
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.destinationNode);
        console.log('[NoiseSuppressor] AI noise suppression enabled');
      } else {
        // Bypass RNNoise - connect source directly to destination
        this.sourceNode.disconnect();
        this.workletNode.disconnect();
        this.sourceNode.connect(this.destinationNode);
        console.log('[NoiseSuppressor] AI noise suppression disabled (bypass)');
      }
    } catch (error) {
      console.error('[NoiseSuppressor] Error toggling noise suppression:', error);
    }
  }

  /**
   * Get the processed output stream
   */
  getOutputStream(): MediaStream | null {
    return this.destinationNode?.stream || null;
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage('destroy');
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.destinationNode) {
      this.destinationNode.disconnect();
      this.destinationNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
    console.log('[NoiseSuppressor] Destroyed');
  }
}
