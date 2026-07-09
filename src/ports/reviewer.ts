import type { MovieReview } from "../types.ts";

export interface IReviewer {
  structure(transcript: string): Promise<Omit<MovieReview, "rawTranscript" | "createdAt">>;
}
