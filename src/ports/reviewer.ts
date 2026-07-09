import type { MovieReview } from "../types.ts";

export interface IReviewer {
  extractTitle(transcript: string): Promise<string>;
  structure(transcript: string, cast: string[]): Promise<Omit<MovieReview, "rawTranscript" | "createdAt">>;
}
