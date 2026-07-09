import { load } from "jsr:@std/dotenv";
import { WhisperTranscriber } from "./adapters/whisper.ts";
import { OllamaReviewer } from "./adapters/ollama.ts";
import { JsonStorage } from "./adapters/storage.ts";
import { LetterboxdPublisher } from "./adapters/letterboxd.ts";
import { ReviewPipeline } from "./pipeline.ts";

const env = await load();

const audioPath = Deno.args[0];
if (!audioPath) {
  console.error("Usage: deno task review <path-to-audio-file>");
  Deno.exit(1);
}

const username = env["LETTERBOXD_USER"];
const password = env["LETTERBOXD_PASS"];

if (!username || !password) {
  console.error("Missing LETTERBOXD_USER or LETTERBOXD_PASS in .env");
  Deno.exit(1);
}

const pipeline = new ReviewPipeline(
  new WhisperTranscriber(),
  new OllamaReviewer(),
  new JsonStorage("./reviews"),
  new LetterboxdPublisher(username, password),
);

const review = await pipeline.run(audioPath);

console.log(`\n✅ Done! "${review.title}" — ${review.stars}⭐ — liked: ${review.liked}`);
