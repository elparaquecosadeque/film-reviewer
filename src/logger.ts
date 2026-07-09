interface LogEntry {
  ts: string;
  message: string;
}

// Writes to console and buffers every line for a final log file.
export class Logger {
  private readonly entries: LogEntry[] = [];

  log(message: string): void {
    const ts = new Date().toISOString();
    this.entries.push({ ts, message });
    console.log(message);
  }

  warn(message: string): void {
    this.log(`⚠  ${message}`);
  }

  // Serialises the buffer to a .log file at the given path.
  async save(filePath: string): Promise<void> {
    const lines = this.entries.map((e) => `[${e.ts}] ${e.message}`).join("\n");
    await Deno.writeTextFile(filePath, lines + "\n");
  }
}
