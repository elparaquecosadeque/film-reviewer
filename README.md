# letterbox-reviews

Record a spoken movie review → transcribe → enrich with cast names → structure with AI → save as JSON.

## How it works

```
🎙 You record audio
      ↓
🎞  Whisper transcribes speech to text
      ↓
🤖  Ollama (local LLM) extracts the movie title
      ↓
🎭  TMDB API fetches the real cast & crew names
      ↓
🤖  Ollama structures your review (title, liked, stars, ≤500-word summary)
      ↓
💾  Saved as reviews/<Movie_Title>_Review.json
📋  Saved as reviews/<Movie_Title>_Review.log  (timings + TMDB requests)
```

Your audio should mention: the movie title, whether you liked it, how many stars you give it, and your thoughts. Speak naturally — the LLM handles the rest.

---

## First-time setup

### 1. Install Deno
```bash
winget install DenoLand.Deno
```

### 2. Install Whisper
Whisper is the speech-to-text engine. It runs locally on your machine.
```bash
pip install openai-whisper
```
> On Windows, pip may not add whisper to your PATH. If you get a "whisper not found" error, find the full path to `whisper.exe` and set `WHISPER_PATH` in your `.env` (see below).

### 3. Install and start Ollama
Ollama runs the AI model locally — no cloud, no cost.

1. Download from [ollama.com](https://ollama.com) and install it
2. Pull the model:
```bash
ollama pull llama3.2
```
3. Make sure Ollama is running before using this project (it starts automatically on most installs)

### 4. Get a free TMDB API key
TMDB provides cast and crew data to improve name accuracy in your reviews.

1. Create a free account at [themoviedb.org](https://www.themoviedb.org)
2. Go to [Settings → API](https://www.themoviedb.org/settings/api) and request an API key (personal use)

### 5. Configure your environment
```bash
cp .env.example .env
```
Then open `.env` and fill in your TMDB API key:
```env
TMDB_API_KEY=your_key_here
```

---

## Usage

Record your audio (any format Whisper supports: `.m4a`, `.mp3`, `.wav`, `.ogg`), then run:

```bash
deno task review path/to/your_audio.m4a
```

### Optional: compile to a single executable

Run once to produce `review.exe` (Windows) or `review` (Mac/Linux):

```bash
deno task compile
```

Then use it directly from anywhere — no `deno` command needed:

```bash
# from the project folder (where .env lives)
.\review.exe my_audio.m4a

# or add the folder to PATH and run from anywhere
review my_audio.m4a
```

> `.env` must stay in the same directory you run the executable from. It's a one-time setup — you never touch it again.

### What you'll see
```
🎙  Transcribing audio...
    ✓ done in 1.8m
🎞  Extracting title...
    ✓ done in 3.2s
    → "Reservoir Dogs"
🎭  Fetching cast & crew from TMDB...
    ✓ done in 0.4s
    → 22 names loaded
🤖  Structuring review with LLM...
    ✓ done in 11.5s
💾  Saving review JSON...
    ✓ done in 12ms
    → reviews/Reservoir_Dogs_Review.json
📋  Log saved → reviews/Reservoir_Dogs_Review.log

┌─ Pipeline timing ─────────────────────┐
│  Transcribing audio                    1.8m   87%
│  Extracting title                      3.2s    2%
│  Fetching cast & crew from TMDB        0.4s    0%
│  Structuring review with LLM          11.5s    6%
│  Saving review JSON                    12ms    0%
├───────────────────────────────────────┤
│  Total                                 2.1m  100%
└───────────────────────────────────────┘

✅ Done! "Reservoir Dogs" — 5⭐ — liked: true
```

---

## Output files

**`reviews/Reservoir_Dogs_Review.json`**
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

**`reviews/Reservoir_Dogs_Review.log`** — timestamped log of every step including TMDB requests/responses and the timing summary.

---

## Configuration (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TMDB_API_KEY` | ✅ | — | Free TMDB API key |
| `WHISPER_MODEL` | No | `large-v3` | Model size: `tiny` `base` `small` `medium` `large-v3` |
| `WHISPER_LANGUAGE` | No | `es` | Spoken language (ISO 639-1). Improves accuracy |
| `WHISPER_PATH` | No | `whisper` | Full path to `whisper.exe` if not on PATH |
| `OLLAMA_MODEL` | No | `llama3.2` | Ollama model to use |

**Choosing a Whisper model:**

| Model | RAM needed | Speed (CPU) | Best for |
|-------|-----------|-------------|----------|
| `small` | ~2 GB | Fast | Quick tests |
| `medium` | ~5 GB | Moderate | Good balance |
| `large-v3` | ~10 GB | Slow on CPU | Best accuracy ✓ |

---

## Project structure

```
src/
  logger.ts             # Logs to console + buffers for .log file
  types.ts              # MovieReview — single source of truth
  ports/
    transcriber.ts      # ITranscriber interface
    reviewer.ts         # IReviewer interface
    cast-fetcher.ts     # ICastFetcher interface
    storage.ts          # IStorage interface
  adapters/
    whisper.ts          # Calls whisper CLI for transcription
    ollama.ts           # Calls local Ollama LLM for structuring
    tmdb.ts             # Fetches cast & crew from TMDB API
    storage.ts          # Writes JSON + log files to reviews/
  pipeline.ts           # Orchestrates all steps with timing
  main.ts               # CLI entry point
deno.json               # Tasks and config
.env.example            # Environment variable template
reviews/                # Output directory (gitignored)
```

## Swapping components

Each stage depends on an interface. To swap Whisper for another transcriber: implement `ITranscriber` and pass it to `ReviewPipeline` in `main.ts`. Same applies to the LLM, cast fetcher, or storage.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `whisper not found` | `whisper --version` to check. If missing: `pip install openai-whisper`. If installed but not on PATH: set `WHISPER_PATH` in `.env` |
| `TMDB_API_KEY is not set` | Copy `.env.example` to `.env` and fill in your key |
| `Ollama model missing` | Run `ollama pull llama3.2` |
| `Ollama connection refused` | Make sure Ollama is running (`ollama serve`) |
| LLM returns wrong title | Speak the title clearly at the start of your recording |
