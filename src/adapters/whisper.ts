import type { ITranscriber } from "../ports/transcriber.ts";

// Calls the whisper CLI installed on the system.
// Install: pip install openai-whisper  (or brew install whisper)
export class WhisperTranscriber implements ITranscriber {
  constructor(private readonly model: string = "small") {}

  async transcribe(audioPath: string): Promise<string> {
    const cmd = new Deno.Command("whisper", {
      args: [audioPath, "--model", this.model, "--output_format", "txt", "--output_dir", "/tmp"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await cmd.output();

    if (code !== 0) {
      throw new Error(`Whisper failed: ${new TextDecoder().decode(stderr)}`);
    }

    // Whisper writes <audioFilename>.txt — read it back
    const base = audioPath.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, "");
    const outPath = `/tmp/${base}.txt`;
    return await Deno.readTextFile(outPath);
  }
}
