export interface ICastFetcher {
  fetchCast(movieTitle: string): Promise<string[]>; // returns list of names: actors + directors
}
