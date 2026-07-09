# letterbox-reviews

Record a spoken movie review → transcribe → structure → post to Letterboxd. Fully automated.

## Prerequisites

| Tool | Install |
|------|---------|
| [Deno](https://deno.com) | `winget install DenoLand.Deno` |
| [Whisper](https://github.com/openai/whisper) | `pip install openai-whisper` |
| [Ollama](https://ollama.com) | Download from ollama.com, then `ollama pull llama3.2` |
| Playwright browsers | `deno run --allow-run npm:playwright install chromium` |

## Setup

```bash
cp .env.example .env
# fill in your Letterboxd username and password in .env
```

## Usage

```bash
deno task review path/to/your_audio.m4a
```

That's it. The pipeline will:
1. Transcribe your audio with Whisper
2. Extract title, rating, liked status, and a ≤500-word review summary via Ollama (llama3.2)
3. Save `reviews/<Movie_Title>_Review.json`
4. Open a headless browser, log in to Letterboxd, and post the review

## Output JSON shape

```json
{
  "title": "Reservoir Dogs",
  "liked": true,
  "stars": 5,
  "review": "...",
  "rawTranscript": "...",
  "createdAt": "2026-07-08T16:00:00.000Z"
}
```

## Project structure

```
src/
  types.ts              # MovieReview — single source of truth
  ports/
    transcriber.ts      # ITranscriber interface
    reviewer.ts         # IReviewer interface
    publisher.ts        # IPublisher interface
    storage.ts          # IStorage interface
  adapters/
    whisper.ts          # WhisperTranscriber  — calls whisper CLI
    ollama.ts           # OllamaReviewer      — calls local Ollama LLM
    storage.ts          # JsonStorage         — writes reviews/ JSON files
    letterboxd.ts       # LetterboxdPublisher — Playwright browser automation
  pipeline.ts           # Wires all adapters together
  main.ts               # CLI entry point
deno.json               # Tasks, imports, compiler options
```

## Swapping components

Each stage depends on an interface, not a concrete class.  
To swap Whisper for another transcriber: implement `ITranscriber` and pass it to `ReviewPipeline` in `main.ts`.  
Same for the LLM, storage, or publisher.

## Troubleshooting

- **Letterboxd selectors break**: The `SELECTORS` object in `src/adapters/letterboxd.ts` is the single place to fix DOM changes.
- **Whisper not found**: Make sure `whisper` is on your PATH (`whisper --version`).
- **Ollama model missing**: Run `ollama pull llama3.2` first.
