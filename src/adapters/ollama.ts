import Ollama from "npm:ollama";
import type { IReviewer } from "../ports/reviewer.ts";
import type { MovieReview } from "../types.ts";

const PROMPT = (transcript: string) => `
You are given a spoken movie review transcript. Extract and return ONLY valid JSON with this exact shape:

{
  "title": "<movie title>",
  "liked": <true|false>,
  "stars": <integer 1-5>,
  "review": "<summary of the review in the speaker's own voice, max 500 words>"
}

Rules:
- "liked" is true if the speaker expresses overall positive sentiment.
- "stars" must be the number the speaker mentions, or infer from sentiment if not stated.
- "review" must preserve the speaker's tone and key points, condensed to ≤500 words.
- Return ONLY the JSON object. No markdown, no explanation.

Transcript:
${transcript}
`.trim();

export class OllamaReviewer implements IReviewer {
  // ponytail: defaults to llama3.2 — swap model in deno.json tasks if needed
  constructor(private readonly model: string = "llama3.2") {}

  async structure(transcript: string): Promise<Omit<MovieReview, "rawTranscript" | "createdAt">> {
    const response = await Ollama.chat({
      model: this.model,
      messages: [{ role: "user", content: PROMPT(transcript) }],
      format: "json",
    });

    const parsed = JSON.parse(response.message.content);

    if (!parsed.title || typeof parsed.liked !== "boolean" || !parsed.stars || !parsed.review) {
      throw new Error(`LLM returned unexpected shape: ${response.message.content}`);
    }

    return {
      title: String(parsed.title).trim(),
      liked: Boolean(parsed.liked),
      stars: Math.min(5, Math.max(1, Number(parsed.stars))),
      review: String(parsed.review).trim(),
    };
  }
}
