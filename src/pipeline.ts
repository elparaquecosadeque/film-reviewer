import type { ITranscriber } from "./ports/transcriber.ts";
import type { IReviewer } from "./ports/reviewer.ts";
import type { IPublisher } from "./ports/publisher.ts";
import type { IStorage } from "./ports/storage.ts";
import type { MovieReview } from "./types.ts";

export class ReviewPipeline {
  constructor(
    private readonly transcriber: ITranscriber,
    private readonly reviewer: IReviewer,
    private readonly storage: IStorage,
    private readonly publisher: IPublisher,
  ) {}

  async run(audioPath: string): Promise<MovieReview> {
    console.log("🎙  Transcribing audio...");
    const rawTranscript = await this.transcriber.transcribe(audioPath);

    console.log("🤖  Structuring review with LLM...");
    const structured = await this.reviewer.structure(rawTranscript);

    const review: MovieReview = {
      ...structured,
      rawTranscript,
      createdAt: new Date().toISOString(),
    };

    console.log("💾  Saving review JSON...");
    const savedPath = await this.storage.save(review);
    console.log(`    → ${savedPath}`);

    console.log("🎬  Posting to Letterboxd...");
    await this.publisher.publish(review);

    return review;
  }
}
