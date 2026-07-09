import type { ICastFetcher } from "../ports/cast-fetcher.ts";
import type { Logger } from "../logger.ts";

const BASE = "https://api.themoviedb.org/3";

interface TmdbSearchResult {
  id: number;
  title: string;
}

interface TmdbCredit {
  name: string;
  job?: string;
}

// ponytail: uses TMDB free API — get a key at https://www.themoviedb.org/settings/api
export class TmdbCastFetcher implements ICastFetcher {
  private readonly apiKey: string;

  constructor(private readonly logger: Logger) {
    const key = Deno.env.get("TMDB_API_KEY");
    if (!key) throw new Error("TMDB_API_KEY is not set in .env");
    this.apiKey = key;
  }

  async fetchCast(movieTitle: string): Promise<string[]> {
    const movieId = await this.searchMovie(movieTitle);
    if (!movieId) {
      this.logger.warn(`TMDB: no match found for "${movieTitle}", skipping cast enrichment`);
      return [];
    }
    return await this.fetchCredits(movieId);
  }

  private async searchMovie(title: string): Promise<number | null> {
    const url = `${BASE}/search/movie?query=${encodeURIComponent(title)}&api_key=REDACTED&language=es-MX`;
    const realUrl = url.replace("REDACTED", this.apiKey);

    this.logger.log(`  [TMDB] GET ${url}`);
    const res = await fetch(realUrl);

    if (!res.ok) throw new Error(`TMDB search failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const first = (data.results as TmdbSearchResult[])[0] ?? null;

    this.logger.log(`  [TMDB] search response: ${data.results.length} results — top match: ${first ? `"${first.title}" (id=${first.id})` : "none"}`);
    return first?.id ?? null;
  }

  private async fetchCredits(movieId: number): Promise<string[]> {
    const url = `${BASE}/movie/${movieId}/credits?api_key=REDACTED`;
    const realUrl = url.replace("REDACTED", this.apiKey);

    this.logger.log(`  [TMDB] GET ${url}`);
    const res = await fetch(realUrl);

    if (!res.ok) throw new Error(`TMDB credits failed: ${res.status} ${res.statusText}`);
    const data = await res.json();

    const cast: string[] = (data.cast as TmdbCredit[]).slice(0, 20).map((c) => c.name);
    const crew: string[] = (data.crew as TmdbCredit[])
      .filter((c) => ["Director", "Screenplay", "Writer"].includes(c.job ?? ""))
      .map((c) => c.name);

    const names = [...new Set([...cast, ...crew])];
    this.logger.log(`  [TMDB] credits response: ${cast.length} cast, ${crew.length} crew → ${names.length} unique names`);
    this.logger.log(`  [TMDB] names: ${names.join(", ")}`);

    return names;
  }
}
