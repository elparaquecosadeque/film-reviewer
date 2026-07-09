import type { ITranscriber } from "./ports/transcriber.ts";
import type { IReviewer } from "./ports/reviewer.ts";
import type { IStorage } from "./ports/storage.ts";
import type { ICastFetcher } from "./ports/cast-fetcher.ts";
import type { MovieReview } from "./types.ts";
import { Logger } from "./logger.ts";

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


export class ReviewPipeline {
  private readonly logger: Logger;

  constructor(
    private readonly transcriber: ITranscriber,
    private readonly reviewer: IReviewer,
    private readonly castFetcher: ICastFetcher,
    private readonly storage: IStorage,
    logger?: Logger,
  ) {
    this.logger = logger ?? new Logger();
  }

  async run(audioPath: string): Promise<MovieReview> {
    const pipelineStart = performance.now();
    const timings: StepTiming[] = [];

    const t = async <T>(label: string, emoji: string, fn: () => Promise<T>): Promise<[T, StepTiming]> => {
      this.logger.log(`${emoji}  ${label}...`);
      const start = performance.now();
      const result = await fn();
      const durationMs = performance.now() - start;
      this.logger.log(`    ✓ done in ${fmt(durationMs)}`);
      return [result, { step: label, durationMs }];
    };

    const [rawTranscript, t1] = await t("Transcribing audio", "🎙", () =>
      this.transcriber.transcribe(audioPath));
    timings.push(t1);

    const [title, t2] = await t("Extracting title", "🎞", () =>
      this.reviewer.extractTitle(rawTranscript));
    timings.push(t2);
    this.logger.log(`    → "${title}"`);

    const [cast, t3] = await t("Fetching cast & crew from TMDB", "🎭", () =>
      this.castFetcher.fetchCast(title));
    timings.push(t3);
    if (cast.length > 0) this.logger.log(`    → ${cast.length} names loaded`);

    const [structured, t4] = await t("Structuring review with LLM", "🤖", () =>
      this.reviewer.structure(rawTranscript, cast));
    timings.push(t4);

    const review: MovieReview = {
      ...structured,
      rawTranscript,
      createdAt: new Date().toISOString(),
    };

    const [savedPath, t5] = await t("Saving review JSON", "💾", () =>
      this.storage.save(review));
    timings.push(t5);
    this.logger.log(`    → ${savedPath}`);

    const totalMs = performance.now() - pipelineStart;
    this.printSummary(timings, totalMs);

    // Save log file next to the JSON (same base name, .log extension)
    const logPath = savedPath.replace(/\.json$/, ".log");
    await this.logger.save(logPath);
    console.log(`📋  Log saved → ${logPath}`);

    return review;
  }

  private printSummary(timings: StepTiming[], totalMs: number): void {
    const lines = [
      "\n┌─ Pipeline timing ─────────────────────┐",
      ...timings.map(({ step, durationMs }) => {
        const pct = ((durationMs / totalMs) * 100).toFixed(0).padStart(3);
        return `│  ${step.padEnd(30)} ${fmt(durationMs).padStart(6)}  ${pct}%`;
      }),
      `├───────────────────────────────────────┤`,
      `│  ${"Total".padEnd(30)} ${fmt(totalMs).padStart(6)}  100%`,
      "└───────────────────────────────────────┘",
    ];
    lines.forEach((l) => this.logger.log(l));
  }
}
