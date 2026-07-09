import { load } from "jsr:@std/dotenv";
import { WhisperTranscriber } from "./adapters/whisper.ts";
import { OllamaReviewer } from "./adapters/ollama.ts";
import { TmdbCastFetcher } from "./adapters/tmdb.ts";
import { JsonStorage } from "./adapters/storage.ts";
import { ReviewPipeline } from "./pipeline.ts";

await load({ export: true });

const audioPath = Deno.args[0];
if (!audioPath) {
  console.error("Usage: deno task review <path-to-audio-file>");
  Deno.exit(1);
}

const pipeline = new ReviewPipeline(
  new WhisperTranscriber(),
  new OllamaReviewer(),
  new TmdbCastFetcher(),
  new JsonStorage("./reviews"),
);

const review = await pipeline.run(audioPath);

console.log(`\n✅ Done! "${review.title}" — ${review.stars}⭐ — liked: ${review.liked}`);

