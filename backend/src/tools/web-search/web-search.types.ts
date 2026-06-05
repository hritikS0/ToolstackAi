export interface WebSearchResult {
    title: string;
    url: string;
    description?: string;
}

export interface WebSearchOptions {
    query: string;
    count?: number;
}

export interface WebSearchResponse {
    results: WebSearchResult[];
}