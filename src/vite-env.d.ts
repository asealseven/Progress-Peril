// The files in public/assets, listed at build time by the asset-files plugin in vite.config.ts.
declare module 'virtual:asset-files' {
  const files: readonly string[];
  export default files;
}

// ZzFX ships as plain JavaScript (GDD 15.10). Only the parts the game uses are typed here.
declare module 'zzfx' {
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    buildSamples(...parameters: Array<number | undefined>): number[];
    playSamples(channels: number[][], volumeScale?: number, rate?: number, pan?: number, loop?: boolean): AudioBufferSourceNode;
  };
}
