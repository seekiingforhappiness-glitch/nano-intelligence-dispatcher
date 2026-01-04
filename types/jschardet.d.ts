declare module 'jschardet' {
  export interface DetectionResult {
    encoding?: string;
    confidence: number;
  }

  export function detect(
    input: Buffer | Uint8Array | string
  ): DetectionResult;
}


