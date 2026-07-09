import type { IStorage } from "../ports/storage.ts";
import type { MovieReview } from "../types.ts";
import { join } from "jsr:@std/path";

export class JsonStorage implements IStorage {
  constructor(private readonly outputDir: string = "./reviews") {}

  async save(review: MovieReview): Promise<string> {
    const filename = `${review.title.replace(/\s+/g, "_")}_Review.json`;
    const filePath = join(this.outputDir, filename);
    await Deno.writeTextFile(filePath, JSON.stringify(review, null, 2));
    return filePath;
  }
}
