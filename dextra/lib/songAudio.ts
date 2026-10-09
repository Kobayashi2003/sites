import { ANALYSIS_RATE, analyzeSamples } from '../engine/audio';

const PLAYBACK_RATE = 48000;
export const MAX_SONG_BYTES = 40 * 1024 * 1024;

/** Decodes any browser-supported audio file without a live AudioContext. */
export async function decodeSong(blob: Blob) {
  const data = await blob.arrayBuffer();
  return new OfflineAudioContext(2, 1, PLAYBACK_RATE).decodeAudioData(data);
}

/** Mono downmix at the analysis rate, rendered by the browser's resampler. */
async function monoSamples(buffer: AudioBuffer) {
  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(buffer.duration * ANALYSIS_RATE)),
    ANALYSIS_RATE,
  );
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  return (await offline.startRendering()).getChannelData(0);
}

const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function analyzeSong(buffer: AudioBuffer) {
  const samples = await monoSamples(buffer);
  // Let the progress label paint before the synchronous analysis.
  await nextFrame();
  return analyzeSamples(samples);
}
