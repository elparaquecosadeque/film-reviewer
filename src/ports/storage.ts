import type { MovieReview } from "../types.ts";

export interface IStorage {
  save(review: MovieReview): Promise<string>; // returns saved file path
}
