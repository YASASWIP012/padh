import { speechSpan } from '../core/vad';

export interface Recording {
  blob: Blob;
  speechSeconds: number;
  totalSeconds: number;
}

const MIME = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/**
 * Records from the microphone and reports a live level for the meter. On stop,
 * decodes the audio once to measure reading time (first word to last word).
 */
export class Recorder {
  private stream?: MediaStream;
  private rec?: MediaRecorder;
  private chunks: BlobPart[] = [];
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private started = 0;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    const mimeType = MIME.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
    this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(250);
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    src.connect(this.analyser);
    this.started = performance.now();
  }

  level(): number {
    if (!this.analyser) return 0;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (const v of buf) s += v * v;
    return Math.min(1, Math.sqrt(s / buf.length) * 6);
  }

  elapsed(): number {
    return this.started ? (performance.now() - this.started) / 1000 : 0;
  }

  async stop(): Promise<Recording> {
    const rec = this.rec;
    if (!rec) throw new Error('not recording');
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.stop();
    await done;
    this.stream?.getTracks().forEach((t) => t.stop());
    const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
    const totalSeconds = this.elapsed();
    let speechSeconds = totalSeconds;
    try {
      const decoded = await this.ctx!.decodeAudioData(await blob.arrayBuffer());
      const span = speechSpan(decoded.getChannelData(0), decoded.sampleRate);
      if (span.seconds > 0) speechSeconds = span.seconds;
    } catch {
      // Some browsers cannot decode their own recording format; fall back to wall time.
    }
    await this.ctx?.close();
    this.started = 0;
    return { blob, speechSeconds, totalSeconds };
  }

  cancel() {
    try { this.rec?.stop(); } catch { /* already stopped */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.started = 0;
  }
}
