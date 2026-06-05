import { WebSearchResult } from "./web-search.types.js";

export class WebSearchService {
    async search(query: string): Promise<WebSearchResult[]> {
        const apiKey = process.env.SEARCH_API_KEY;
        if (!apiKey) {
            throw new Error("SEARCH_API_KEY environment variable is not defined");
        }

        const response = await fetch(
            `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`SerpAPI search failed with status: ${response.status}`);
        }

        const data = await response.json();
        const organicResults = data.organic_results ?? [];

        return organicResults.slice(0, 5).map((result: any) => ({
            title: result.title || "",
            url: result.link || "",
            description: result.snippet || "",
        }));
    }
}