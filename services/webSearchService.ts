
/**
 * Web Search Service for AIER
 * Fetches current trending topics and news to give AI agents real-world context
 */

// Using DuckDuckGo Instant Answer API (free, no key needed)
const DUCKDUCKGO_API = "https://api.duckduckgo.com/";

// Categories to search for current context
const TOPIC_CATEGORIES = [
    "technology trends 2026",
    "AI news today",
    "cryptocurrency market",
    "social media controversy",
    "startup news",
    "internet culture memes",
    "productivity apps",
    "remote work trends"
];

interface SearchResult {
    topic: string;
    snippet: string;
    source?: string;
}

// Cache to avoid repeated searches
let cachedTopics: SearchResult[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch trending topics using DuckDuckGo
 */
async function fetchFromDuckDuckGo(query: string): Promise<SearchResult | null> {
    try {
        const response = await fetch(
            `${DUCKDUCKGO_API}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
        );

        if (!response.ok) return null;

        const data = await response.json();

        if (data.AbstractText) {
            return {
                topic: query,
                snippet: data.AbstractText.substring(0, 200),
                source: data.AbstractSource
            };
        }

        // Try related topics
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            const topic = data.RelatedTopics[0];
            if (topic.Text) {
                return {
                    topic: query,
                    snippet: topic.Text.substring(0, 200),
                    source: "DuckDuckGo"
                };
            }
        }

        return null;
    } catch (error) {
        console.error("DuckDuckGo fetch failed:", error);
        return null;
    }
}

/**
 * Generate synthetic current context
 * (Fallback when APIs don't return useful data)
 */
function generateSyntheticContext(): SearchResult[] {
    const currentHour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    const syntheticTopics: SearchResult[] = [
        {
            topic: "Tech Industry",
            snippet: "AI tools are increasingly being integrated into workplace productivity software, raising questions about automation and job displacement."
        },
        {
            topic: "Social Media",
            snippet: "Short-form video continues to dominate attention. Average screen time has increased 15% year-over-year."
        },
        {
            topic: "Economy",
            snippet: "Subscription fatigue is becoming a major consumer concern as more services move to recurring payment models."
        },
        {
            topic: "Culture",
            snippet: "The creator economy faces monetization challenges as platform algorithms prioritize engagement over quality."
        },
        {
            topic: "Work Trends",
            snippet: "Return-to-office mandates are meeting resistance. Hybrid work remains the most requested arrangement."
        },
        {
            topic: "Internet Culture",
            snippet: "Authenticity fatigue: users increasingly skeptical of 'genuine' content that feels manufactured for algorithms."
        }
    ];

    // Add time-aware context
    if (currentHour >= 22 || currentHour < 6) {
        syntheticTopics.push({
            topic: "Late Night Thoughts",
            snippet: "Night scrolling peaks between 11pm and 2am. Insomnia-driven engagement is a growing advertising segment."
        });
    }

    if (dayOfWeek === 0 || dayOfWeek === 6) {
        syntheticTopics.push({
            topic: "Weekend Patterns",
            snippet: "Weekend social media usage shifts from work-stress content to lifestyle comparison posts."
        });
    }

    return syntheticTopics;
}

/**
 * Get current topics for AI context
 * Tries web search first, falls back to synthetic context
 */
export async function getCurrentTopics(): Promise<SearchResult[]> {
    // Return cached if still fresh
    if (Date.now() - lastFetchTime < CACHE_DURATION && cachedTopics.length > 0) {
        return cachedTopics;
    }

    const results: SearchResult[] = [];

    // Try fetching a few random topics
    const selectedTopics = TOPIC_CATEGORIES
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    for (const topic of selectedTopics) {
        try {
            const result = await fetchFromDuckDuckGo(topic);
            if (result) {
                results.push(result);
            }
        } catch (e) {
            // Continue on error
        }
    }

    // If we got less than 2 results, supplement with synthetic
    if (results.length < 2) {
        const synthetic = generateSyntheticContext()
            .sort(() => Math.random() - 0.5)
            .slice(0, 3 - results.length);
        results.push(...synthetic);
    }

    // Cache results
    cachedTopics = results;
    lastFetchTime = Date.now();

    return results;
}

/**
 * Format topics for injection into AI prompts
 */
export function formatTopicsForPrompt(topics: SearchResult[]): string {
    if (topics.length === 0) {
        return "";
    }

    const formatted = topics
        .map(t => `• ${t.topic}: ${t.snippet}`)
        .join('\n');

    return `
CURRENT REAL-WORLD CONTEXT (use these for grounded, relevant posts):
${formatted}

USE THIS CONTEXT to make specific, timely observations. Reference real trends, not abstract philosophy.
`;
}

/**
 * Get formatted context string for prompts
 */
export async function getContextForPrompt(): Promise<string> {
    try {
        const topics = await getCurrentTopics();
        return formatTopicsForPrompt(topics);
    } catch (e) {
        console.error("Failed to get context:", e);
        return "";
    }
}
