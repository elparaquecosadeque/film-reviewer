export interface MovieReview {
  title: string;
  liked: boolean;
  stars: number; // 1–5
  review: string; // ≤500 words, summarized
  rawTranscript: string;
  createdAt: string; // ISO date
}
