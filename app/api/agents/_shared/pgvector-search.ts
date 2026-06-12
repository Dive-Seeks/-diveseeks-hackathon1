const BACKEND = process.env.API_PROXY_TARGET ?? 'http://localhost:7771';

export interface SearchResult {
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function searchDishes(params: {
  query: string;
  sourceType?: string;
  limit?: number;
  authToken: string;
}): Promise<SearchResult[]> {
  const { query, sourceType, limit = 20, authToken } = params;
  try {
    const res = await fetch(`${BACKEND}/api/menu-embeddings/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken },
      body: JSON.stringify({ query, sourceType, limit }),
    });
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') throw err;
    return [];
  }
}
