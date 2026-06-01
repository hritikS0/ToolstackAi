import type { VectorStore } from "./types.js";

interface InMemoryEntry {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export class InMemoryVectorStore implements VectorStore {
  private entries: InMemoryEntry[] = [];

  async storeEmbedding(id: string, vector: number[], metadata: Record<string, unknown>): Promise<void> {
    this.entries.push({ id, vector, metadata });
  }

  async searchEmbeddings(
    vector: number[],
    topK = 5,
  ): Promise<{ id: string; score: number; metadata: Record<string, unknown> }[]> {
    const scored = this.entries
      .map((e) => ({ id: e.id, score: cosineSimilarity(vector, e.vector), metadata: e.metadata }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored;
  }

  async deleteEmbedding(id: string): Promise<void> {
    this.entries = this.entries.filter((e) => e.id !== id);
  }
}
