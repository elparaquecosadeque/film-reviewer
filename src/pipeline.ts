import type { ITranscriber } from "./ports/transcriber.ts";
import type { IReviewer } from "./ports/reviewer.ts";
import type { IPublisher } from "./ports/publisher.ts";
import type { IStorage } from "./ports/storage.ts";
import type { ICastFetcher } from "./ports/cast-fetcher.ts";
import type { MovieReview } from "./types.ts";

interface StepTiming {
  step: string;
  durationMs: number;
}

function fmt(ms: number): string {
  return ms >= 60_000
    ? `${(ms / 60_000).toFixed(1)}m`
    : ms >= 1_000
    ? `${(ms / 1_000).toFixed(1)}s`
    : `${Math.round(ms)}ms`;
}

async function timed<T>(label: string, emoji: string, fn: () => Promise<T>): Promise<[T, StepTiming]> {
  console.log(`${emoji}  ${label}...`);
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  console.log(`    ✓ done in ${fmt(durationMs)}`);
  return [result, { step: label, durationMs }];
}

export class ReviewPipeline {
  constructor(
    private readonly transcriber: ITranscriber,
    private readonly reviewer: IReviewer,
    private readonly castFetcher: ICastFetcher,
    private readonly storage: IStorage,
    private readonly publisher: IPublisher,
  ) {}

  async run(audioPath: string): Promise<MovieReview> {
    const pipelineStart = performance.now();
    const timings: StepTiming[] = [];

    const [rawTranscript, t1] = await timed("Transcribing audio", "🎙", () =>
      this.transcriber.transcribe(audioPath));
    timings.push(t1);

    const [title, t2] = await timed("Extracting title", "🎞", () =>
      this.reviewer.extractTitle(rawTranscript));
    timings.push(t2);
    console.log(`    → "${title}"`);

    const [cast, t3] = await timed("Fetching cast & crew from TMDB", "🎭", () =>
      this.castFetcher.fetchCast(title));
    timings.push(t3);
    if (cast.length > 0) console.log(`    → ${cast.length} names loaded`);

    const [structured, t4] = await timed("Structuring review with LLM", "🤖", () =>
      this.reviewer.structure(rawTranscript, cast));
    timings.push(t4);

    const review: MovieReview = {
      ...structured,
      rawTranscript,
      createdAt: new Date().toISOString(),
    };

    const [savedPath, t5] = await timed("Saving review JSON", "💾", () =>
      this.storage.save(review));
    timings.push(t5);
    console.log(`    → ${savedPath}`);

    const [, t6] = await timed("Posting to Letterboxd", "🎬", () =>
      this.publisher.publish(review));
    timings.push(t6);

    const totalMs = performance.now() - pipelineStart;
    this.printSummary(timings, totalMs);

    return review;
  }

  private printSummary(timings: StepTiming[], totalMs: number): void {
    console.log("\n┌─ Pipeline timing ─────────────────────┐");
    for (const { step, durationMs } of timings) {
      const pct = ((durationMs / totalMs) * 100).toFixed(0).padStart(3);
      console.log(`│  ${step.padEnd(30)} ${fmt(durationMs).padStart(6)}  ${pct}%`);
    }
    console.log(`├───────────────────────────────────────┤`);
    console.log(`│  ${"Total".padEnd(30)} ${fmt(totalMs).padStart(6)}  100%`);
    console.log("└───────────────────────────────────────┘");
  }
}
