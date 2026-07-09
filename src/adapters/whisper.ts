import type { ITranscriber } from "../ports/transcriber.ts";

// Calls the whisper CLI installed on the system.
// Install: pip install openai-whisper
// On Windows, pip puts whisper.exe in %APPDATA%\Python\PythonXXX\Scripts\ — set WHISPER_PATH in .env if not on PATH.
//
// Precision knobs (all via .env):
//   WHISPER_MODEL    — model size: tiny | base | small | medium | large-v3 (default)
//                      large-v3 is the most accurate; needs ~10GB VRAM or runs slowly on CPU
//                      use "medium" if large-v3 is too slow on your machine
//   WHISPER_LANGUAGE — ISO 639-1 code e.g. "en", "es" — skips auto-detection, improves accuracy
//   WHISPER_PATH     — full path to whisper.exe if not on PATH
export class WhisperTranscriber implements ITranscriber {
  private readonly execPath: string;
  private readonly tmpDir: string;
  private readonly model: string;
  private readonly language: string | undefined;

  constructor() {
    // ponytail: WHISPER_PATH lets users point to the full exe path when pip Scripts dir isn't on PATH
    this.execPath = Deno.env.get("WHISPER_PATH") || "whisper";
    this.tmpDir = Deno.env.get("TEMP") || Deno.env.get("TMP") || "/tmp";
    this.model = Deno.env.get("WHISPER_MODEL") || "large-v3";
    this.language = Deno.env.get("WHISPER_LANGUAGE"); // undefined = auto-detect
  }

  async transcribe(audioPath: string): Promise<string> {
    const args = [
      audioPath,
      "--model", this.model,
      "--output_format", "txt",
      "--output_dir", this.tmpDir,
      "--beam_size", "5",         // default beam size — good accuracy/speed balance
      "--best_of", "5",           // candidates per beam step
      "--condition_on_previous_text", "False", // avoids hallucination loops on long audio
    ];

    if (this.language) args.push("--language", this.language);

    const cmd = new Deno.Command(this.execPath, {
      args,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await cmd.output();

    if (code !== 0) {
      const errText = new TextDecoder().decode(stderr);
      throw new Error(
        `Whisper failed (exit ${code}): ${errText}\n\nIs whisper installed? Run: pip install openai-whisper\nIf installed but not on PATH, set WHISPER_PATH in .env to the full executable path.`,
      );
    }

    // Whisper writes <audioFilename>.txt to the output dir — read it back
    const base = audioPath.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, "");
    const outPath = `${this.tmpDir}\\${base}.txt`;
    return await Deno.readTextFile(outPath);
  }
}
