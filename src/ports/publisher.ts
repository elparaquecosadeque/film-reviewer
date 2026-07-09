import type { MovieReview } from "../types.ts";

export interface IPublisher {
  publish(review: MovieReview): Promise<void>;
}
