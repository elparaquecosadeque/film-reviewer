export interface ITranscriber {
  transcribe(audioPath: string): Promise<string>;
}
