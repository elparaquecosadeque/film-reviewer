import type { ICastFetcher } from "../ports/cast-fetcher.ts";

const BASE = "https://api.themoviedb.org/3";

interface TmdbSearchResult {
  id: number;
  title: string;
}

interface TmdbCredit {
  name: string;
}

// ponytail: uses TMDB free API — get a key at https://www.themoviedb.org/settings/api
export class TmdbCastFetcher implements ICastFetcher {
  private readonly apiKey: string;

  constructor() {
    const key = Deno.env.get("TMDB_API_KEY");
    if (!key) throw new Error("TMDB_API_KEY is not set in .env");
    this.apiKey = key;
  }

  async fetchCast(movieTitle: string): Promise<string[]> {
    const movieId = await this.searchMovie(movieTitle);
    if (!movieId) {
      console.warn(`    ⚠ TMDB: no match found for "${movieTitle}", skipping cast enrichment`);
      return [];
    }
    return await this.fetchCredits(movieId);
  }

  private async searchMovie(title: string): Promise<number | null> {
    const url = `${BASE}/search/movie?query=${encodeURIComponent(title)}&api_key=${this.apiKey}&language=es-MX`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB search failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return (data.results as TmdbSearchResult[])[0]?.id ?? null;
  }

  private async fetchCredits(movieId: number): Promise<string[]> {
    const url = `${BASE}/movie/${movieId}/credits?api_key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB credits failed: ${res.status} ${res.statusText}`);
    const data = await res.json();

    const cast: string[] = (data.cast as TmdbCredit[]).slice(0, 20).map((c) => c.name);
    const crew: string[] = (data.crew as TmdbCredit[])
      .filter((c: { job?: string }) => ["Director", "Screenplay", "Writer"].includes(c.job ?? ""))
      .map((c) => c.name);

    return [...new Set([...cast, ...crew])]; // deduplicate
  }
}
