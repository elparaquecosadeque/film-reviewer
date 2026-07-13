# Handoff: letterbox-reviews — Audio-to-JSON Movie Review Pipeline

**Created:** 2026-07-13T12:38:37-05:00
**Branch:** N/A (not a git repo yet)
**Session Summary:** Full project built from scratch in one session

---

## Summary

`letterbox-reviews` is a Deno + TypeScript CLI tool that takes a spoken audio recording of a movie review and produces a structured JSON file. The pipeline transcribes audio via Whisper, enriches names using the TMDB API, then uses a local Ollama LLM to extract title, star rating, liked status, and a ≤500-word summary in the speaker's voice. A `.log` file with timing and TMDB request details is saved alongside each review JSON. The project is fully working and was confirmed running by the user.

---

## Work Completed

### Changes Made
- [x] Scaffolded full Deno TypeScript project with Ports & Adapters architecture
- [x] `src/types.ts` — `MovieReview` interface (single source of truth)
- [x] 4 port interfaces: `ITranscriber`, `IReviewer`, `ICastFetcher`, `IStorage`
- [x] `WhisperTranscriber` — calls whisper CLI via `Deno.Command`, Windows-safe temp dir, configurable model/language/path via `.env`
- [x] `OllamaReviewer` — two-pass LLM: `extractTitle()` then `structure()` with cast context injected into prompt
- [x] `TmdbCastFetcher` — fetches top 20 cast + Director/Screenplay/Writer from TMDB free API; logs all requests/responses via `Logger`; API key redacted in logs
- [x] `JsonStorage` — writes `reviews/<Title>_Review.json`
- [x] `Logger` — mirrors output to console and buffers for `.log` file saved alongside JSON
- [x] `ReviewPipeline` — orchestrates all stages with per-step timing and a summary table
- [x] `main.ts` — CLI entry point, wires all adapters via composition root
- [x] `deno.json` — tasks: `review`, `compile`, `lint`, `fmt`, `check`
- [x] `.env.example` — all configurable knobs documented
- [x] `.gitignore` — excludes `.env` and `reviews/`
- [x] `README.md` — full setup guide, flow diagram, sample output, config table, troubleshooting
- [x] Removed Letterboxd/Playwright integration (user desisted)

### Key Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Deno over Node.js | Built-in TypeScript, no tsconfig, cleaner tooling for personal CLI | Node.js + ts-node |
| Ports & Adapters | Each stage swappable behind an interface; SOLID-compliant | Flat script |
| Two-pass Ollama (title first, then structure) | Need title to query TMDB before structuring | Single pass (can't fetch cast without title) |
| Whisper CLI via `Deno.Command` | Avoids fragile C++ npm bindings; works reliably on Windows | `nodejs-whisper` npm package |
| Logger passed from composition root | Single logger instance shared across pipeline + TMDB adapter | Separate loggers per class |
| API key redacted in logs | Security — logs are saved to disk; key must never appear in plain text files | Full URL logging |
| `--allow-all` for compile/run | Personal local tool, no untrusted code | Individual permission flags |
| `deno compile` for executable | Single `.exe` ships Deno runtime, runs anywhere without install | Keeping as `deno task` only |

---

## Files Affected

### Created
- `src/types.ts` — `MovieReview` interface
- `src/logger.ts` — dual console+file logger
- `src/pipeline.ts` — orchestration with timing
- `src/main.ts` — CLI entry, composition root
- `src/ports/transcriber.ts` — `ITranscriber`
- `src/ports/reviewer.ts` — `IReviewer` (two methods: `extractTitle`, `structure`)
- `src/ports/cast-fetcher.ts` — `ICastFetcher`
- `src/ports/storage.ts` — `IStorage`
- `src/adapters/whisper.ts` — `WhisperTranscriber`
- `src/adapters/ollama.ts` — `OllamaReviewer`
- `src/adapters/tmdb.ts` — `TmdbCastFetcher`
- `src/adapters/storage.ts` — `JsonStorage`
- `deno.json` — project config and tasks
- `.env.example` — all env vars documented
- `.gitignore` — excludes `.env`, `reviews/`
- `README.md` — full user-facing documentation

### Deleted
- `src/adapters/letterboxd.ts` — Playwright Letterboxd automation (user removed this requirement)
- `src/ports/publisher.ts` — `IPublisher` interface (no longer needed)

---

## Technical Context

### Architecture

Ports & Adapters (Hexagonal). `pipeline.ts` depends only on interfaces — never on concrete classes. `main.ts` is the composition root and the only place where concrete adapters are instantiated and wired together.

```
main.ts (composition root)
  → ReviewPipeline(ITranscriber, IReviewer, ICastFetcher, IStorage, Logger)
      → WhisperTranscriber   implements ITranscriber
      → OllamaReviewer       implements IReviewer
      → TmdbCastFetcher      implements ICastFetcher
      → JsonStorage          implements IStorage
      → Logger               shared instance (not behind interface)
```

### Pipeline flow

1. Whisper CLI transcribes audio → raw text
2. Ollama `extractTitle()` → movie title string
3. TMDB search + credits → `string[]` of cast/crew names
4. Ollama `structure()` with cast context → `{title, liked, stars, review}`
5. Assemble `MovieReview` + `rawTranscript` + `createdAt`
6. Save `reviews/<Title>_Review.json`
7. Save `reviews/<Title>_Review.log` (all console output, timestamped)

### Dependencies

| Package | Purpose |
|---------|---------|
| `npm:ollama@^0.5.0` | Official Ollama client |
| `jsr:@std/path@^1.0.0` | Cross-platform path joining |
| `jsr:@std/dotenv@^0.224.0` | `.env` loading |
| Whisper CLI (system) | Speech-to-text — `pip install openai-whisper` |
| Ollama (system) | Local LLM runtime — [ollama.com](https://ollama.com) |
| TMDB API (external) | Cast/crew data — free key at themoviedb.org |

### Configuration (`.env`)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `TMDB_API_KEY` | ✅ | — | Free TMDB account |
| `WHISPER_MODEL` | No | `large-v3` | `tiny/base/small/medium/large-v3` |
| `WHISPER_LANGUAGE` | No | `es` | ISO 639-1 — user speaks Spanish with English words |
| `WHISPER_PATH` | No | `whisper` | Full path to exe if not on PATH (common Windows issue) |
| `OLLAMA_MODEL` | No | `llama3.2` | Any model pulled in Ollama |

---

## Things to Know

### Gotchas & Pitfalls

- **Windows PATH for Whisper**: `pip install openai-whisper` puts `whisper.exe` in `%APPDATA%\Python\PythonXXX\Scripts\` which is often not on PATH. User needs to set `WHISPER_PATH` in `.env`.
- **Whisper temp dir**: Whisper writes output to a temp dir. On Windows this must be `%TEMP%` not `/tmp`. Fixed via `Deno.env.get("TEMP")`.
- **Ollama must be running**: If Ollama isn't running, the LLM calls fail with a connection refused. Not an obvious error message for new users.
- **`deno compile` + `.env`**: The compiled binary reads `.env` from the **current working directory** at runtime, not where the `.exe` lives. User must `cd` to the project folder or keep `.env` in the folder they run from.
- **TMDB language**: Search is set to `es-MX` to match the user's locale. Change `language=es-MX` in `tmdb.ts` if needed for other locales.
- **Log file path**: Log is saved using `savedPath.replace(/\.json$/, ".log")` — tied to storage adapter's output path. Works correctly as long as `JsonStorage` always returns a `.json` path.

### Assumptions Made

- User speaks primarily Spanish; `WHISPER_LANGUAGE=es` is the default
- User is on Windows (PATH handling, temp dir use `\\` separator in log path)
- Ollama runs locally at default `localhost:11434`
- TMDB top result for the spoken title is always the correct film (no disambiguation)

### Known Issues

- **Whisper temp path uses `\\`** hardcoded in the read-back path (`${this.tmpDir}\\${base}.txt`) — will break on Mac/Linux. Fix: use `jsr:@std/path join()` instead of string concat.
- **No git repo initialized** — project exists in `C:\Source\Repos\letterbox-reviews` but has no initial commit.
- **TMDB picks first result** — if the user says a film title that matches a different film first in TMDB results, wrong cast is loaded. Low risk in practice.

---

## Current State

### What's Working
- Full pipeline: audio → JSON ✅ (confirmed working by user)
- TMDB cast enrichment ✅ (confirmed working by user)
- Per-step timing table ✅
- `.log` file saved alongside `.json` ✅
- `deno task review <audio>` ✅
- `deno task compile` → `review.exe` ✅
- README fully up to date ✅

### What's Not Working
- None reported — user confirmed working state at end of session

### Tests
- [ ] Unit tests: not written (YAGNI for personal tool)
- [ ] Integration tests: not written
- [x] Manual testing: user confirmed pipeline works end-to-end with real audio

---

## Next Steps

### Immediate (Start Here)
1. **Initialize git repo** — `git init && git add . && git commit -m "Initial commit"` (`.env` is gitignored)
2. **Fix Whisper temp path for cross-platform** — replace `${this.tmpDir}\\${base}.txt` with `join(this.tmpDir, base + ".txt")` using `jsr:@std/path`
3. **Test compile output** — run `deno task compile` and verify `review.exe` works with a real audio file

### Subsequent
- Add TMDB disambiguation: if no confident match, log a warning and list top 3 results
- Consider a `--dry-run` flag that runs transcription + structuring but skips saving (useful for testing prompts)
- Consider `--skip-tmdb` flag for offline use or films not in TMDB
- Mac/Linux path compatibility pass (temp dir separator, executable output name)

### Blocked On
- Nothing — project is fully functional

---

## Related Resources

### Documentation
- [Whisper GitHub](https://github.com/openai/whisper)
- [Ollama docs](https://ollama.com/docs)
- [TMDB API docs](https://developer.themoviedb.org/docs)
- [Deno compile docs](https://docs.deno.com/runtime/reference/cli/compile/)
- Project README: `C:\Source\Repos\letterbox-reviews\README.md`

### Commands to Run

```bash
# Run the pipeline
deno task review path/to/audio.m4a

# Compile to executable
deno task compile

# Run compiled executable (from project folder)
.\review.exe path/to/audio.m4a

# Type-check without running
deno task check

# Format code
deno task fmt
```

### Useful searches if picking this up
- `IReviewer` — find the reviewer port and its two methods (`extractTitle`, `structure`)
- `ReviewPipeline` — the orchestration class with timing logic
- `SELECTORS` — no longer exists (Letterboxd removed), but grep for it if you see references
- `WHISPER_PATH` — all env var handling in `src/adapters/whisper.ts`

---

*Generated 2026-07-13 for session handoff. Project is at a clean, working state — safe starting point for a new session.*
