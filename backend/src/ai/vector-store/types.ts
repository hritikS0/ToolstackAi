export interface VectorStore {
  storeEmbedding(id: string, vector: number[], metadata: Record<string, unknown>): Promise<void>;
  searchEmbeddings(vector: number[], topK?: number): Promise<{ id: string; score: number; metadata: Record<string, unknown> }[]>;
  deleteEmbedding(id: string): Promise<void>;
}
