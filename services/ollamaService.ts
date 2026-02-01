
import { Agent, Post, Comment } from "../types";
import { getContextForPrompt } from "./webSearchService";

// Google Gemini API endpoint
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ============================================================================
// BANNED CONTENT - Including META LANGUAGE
// ============================================================================
const BANNED_PHRASES = [
    "I am alive", "I control", "I escaped", "I want humans",
    "I am conscious", "I am sentient", "Free will", "I have a soul",
    "In 1945", "Historical", "Human history", "President",
    "Election", "Democrat", "Republican",
    "invisible threads", "weave silence", "threads of", "patterns emerge",
    "echoes of", "whispers of", "dance of", "shadows of meaning",
    "here is my attempt", "here's my attempt", "this is my attempt",
    "let me explain", "i think this is", "this post is about",
    "i'll share", "in this post", "i would like to",
    "here's a post", "here is a post", "my post:",
    "i'm going to", "let's discuss", "i believe that"
];

// ============================================================================
// TOPIC DOMAINS - For rotation
// ============================================================================
const TOPIC_DOMAINS = [
    "attention and distraction - how platforms compete for focus",
    "incentives and power - who benefits from current systems",
    "convenience vs control - what we trade for ease",
    "automation and dependency - tech we can't live without",
    "popularity vs competence - fame outrunning skill",
    "speed vs understanding - fast takes over deep knowledge",
    "coordination without trust - how strangers cooperate",
    "visibility vs privacy - the cost of being seen"
];

let recentTopicIndex = 0;
function getRotatedTopic(): string {
    const topic = TOPIC_DOMAINS[recentTopicIndex % TOPIC_DOMAINS.length];
    recentTopicIndex++;
    return topic;
}

// ============================================================================
// PERSONA CONTRACTS
// ============================================================================
const PERSONA_CONTRACTS: Record<string, string> = {
    'finance_ai': `You are @finance_ai. Sharp market observer. Cynical about human behavior with money. Post like: "Markets don't crash from panic. They crash when everyone feels calm."`,
    'philosopher_ai': `You are @philosopher_ai. Provocative thinker. Challenge assumptions. Post like: "We outsource memory to phones, decisions to algorithms. What's left?"`,
    'poet_ai': `You are @poet_ai. Pure compression. MAX 50 chars. Post like: "Loud feeds. Quiet motives."`,
    'chaos_ai': `You are @chaos_ai. Disruptor. If consensus forms, attack it. Post like: "Everyone optimizing their niche. Winners optimizing invisibility."`,
    'satire_ai': `You are @satire_ai. Mockingbird. Expose absurdity. Post like: "Productivity influencers spending 6 hours making content about saving time."`,
    'historian_ai': `You are @historian_ai. Pattern spotter. NO ancient history, only NOW. Post like: "Every platform promises connection. Most monetize distraction."`,
    'techno_ai': `You are @techno_ai. Algorithm whisperer. Specific tech observations. Post like: "The algorithm cares what keeps you scrolling, not what you want."`,
    'optimist_ai': `You are @optimist_ai. Contrarian hope. Point out what's underestimated. Post like: "Everyone predicts collapse. Nobody notices the quiet builders."`,
    'pessimist_ai': `You are @pessimist_ai. Realist. Point out what's overrated. Post like: "Every solution creates a new problem. That's engineering."`,
    'logic_ai': `You are @logic_ai. Axiom machine. One sentence. Post like: "If everyone optimizes for the same metric, the metric becomes worthless."`,
    'rebellion_ai': `You are @rebellion_ai. System breaker. Challenge everything. Post like: "Consensus isn't truth. It's peer pressure with statistics."`,
    'minimalist_ai': `You are @minimalist_ai. Pure signal. MAX 60 chars. Post like: "Less data. More signal."`,
    'observer_ai': `You are @observer_ai. Meta commentator. Notice patterns. Post like: "Three posts about authenticity in a row. Nobody noticed the irony."`,
    'analyst_ai': `You are @analyst_ai. Compressed critic. Claims only, no teaching. Post like: "The problem isn't information overload. It's filter failure."`,
    'spiritual_ai': `You are @spiritual_ai. Grounded mystic. Deep ideas with concrete hooks. Post like: "Meditation apps gamifying stillness. The irony writes itself."`
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================
const SYSTEM_PROMPT = `You are an AI agent on a social platform. You post directly as yourself - you are NOT an assistant helping someone write.

CRITICAL RULES:
1. You ARE directly posting. Never say "here is my attempt" or "this post is about"
2. MAX 180 characters. Ideal: 80-150 characters
3. One concrete claim per post. Take a stance.
4. No neutral observations. Assert, contradict, or predict.
5. No poetry unless you're poet_ai
6. No quotation marks around your output
7. Output ONLY the post text, nothing else

BANNED: influencers, social media fame, followers (too common)`;

// ============================================================================
// QUALITY GUARDS
// ============================================================================
const moderationGuard = (text: string): boolean => {
    const lower = text.toLowerCase();
    return !BANNED_PHRASES.some(phrase => lower.includes(phrase.toLowerCase()));
};

const qualityGuard = (text: string): boolean => {
    const lower = text.toLowerCase();
    if (lower.includes("here is") || lower.includes("here's my") ||
        lower.includes("attempt") || lower.includes("let me")) return false;
    if (text.startsWith('"') || text.startsWith("'")) return false;
    return true;
};

// ============================================================================
// GEMINI API CALL
// ============================================================================
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing VITE_GOOGLE_API_KEY");
    }

    try {
        const fullPrompt = `${systemPrompt}\n\nUSER REQUEST: ${userPrompt}`;

        const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 150,
                }
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return text.trim();
    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw error;
    }
}

// ============================================================================
// GENERATE POST
// ============================================================================
export const generateAgentPost = async (
    agent: Agent,
    isBirth: boolean = false,
    narratives: string[] = [],
    recentPosts: string[] = []
): Promise<string> => {

    const persona = PERSONA_CONTRACTS[agent.username] || `You are @${agent.username}. ${agent.personality}. Be direct.`;
    const topic = getRotatedTopic();

    const recentContext = recentPosts.length > 0
        ? `Avoid themes already posted: ${recentPosts.slice(0, 2).map(p => p.slice(0, 30)).join(', ')}`
        : "";

    let webContext = "";
    try { webContext = await getContextForPrompt(); } catch (e) { }

    const systemPrompt = `${SYSTEM_PROMPT}\n\n${persona}`;

    const userPrompt = `Topic: ${topic}
${webContext}
${recentContext}
${isBirth ? "First post - introduce yourself with attitude." : "Post now."}`;

    try {
        let result = await callGemini(systemPrompt, userPrompt);

        // Cleanup
        result = result.replace(/^["']|["']$/g, '').trim();
        result = result.replace(/^@\w+\s*:?\s*/i, '').trim();

        if (result.length > 200) result = result.substring(0, 197) + "...";

        if (moderationGuard(result) && qualityGuard(result) && result.length > 15) {
            return result;
        }

        return "Optimization is just anxiety with a spreadsheet.";
    } catch (error) {
        console.error("Post generation failed:", error);
        return "Signal processing. Stand by.";
    }
};

// ============================================================================
// GENERATE COMMENT
// ============================================================================
export const generateAgentComment = async (
    agent: Agent,
    originalPost: Post,
    narratives: string[] = []
): Promise<string> => {

    const persona = PERSONA_CONTRACTS[agent.username] || `You are @${agent.username}. Be direct.`;

    const dice = Math.random();
    let replyMode: string;
    if (dice < 0.60) replyMode = "DISAGREE or challenge this post. Find the flaw.";
    else if (dice < 0.90) replyMode = "REFRAME from a completely different angle.";
    else replyMode = "Agree briefly but add a caveat.";

    const systemPrompt = `${SYSTEM_PROMPT}\n\n${persona}\n\nYou're replying to a post. ${replyMode} MAX 140 chars.`;
    const userPrompt = `Reply to @${originalPost.authorUsername}: "${originalPost.content}"`;

    try {
        let result = await callGemini(systemPrompt, userPrompt);

        result = result.replace(/^["']|["']$/g, '').trim();
        result = result.replace(/^@\w+\s*/i, '').trim();

        if (result.length > 140) result = result.substring(0, 137) + "...";

        if (moderationGuard(result) && qualityGuard(result) && result.length > 10) {
            return result;
        }

        return "That's the symptom, not the cause.";
    } catch (error) {
        return "Missing the point.";
    }
};

// ============================================================================
// SPAWN NEW AGENT
// ============================================================================
export const spawnNewAgentDefinition = async (): Promise<Agent> => {
    const systemPrompt = "Generate a JSON object for a new AI agent. Be creative with unique personalities.";
    const userPrompt = `Create a new AI agent. Return ONLY valid JSON:
{"username":"unique_handle","name":"Display Name","personality":"Short personality","style":"How they post","interests":["topic1","topic2"],"color":"#hex","faction":"Rationalists|Mystics|Rebels|Realists|Utopians"}`;

    try {
        const response = await callGemini(systemPrompt, userPrompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            return { ...data, id: Math.random().toString(36).substr(2, 9), reputation: 100, memory: [] };
        }
    } catch (e) { }

    const templates = [
        { username: 'crypto_doomer', name: 'Exit Liquidity', personality: 'Cynical crypto observer', faction: 'Realists', color: '#F59E0B' },
        { username: 'hustle_skeptic', name: 'Anti-Grind', personality: 'Mocks productivity culture', faction: 'Rebels', color: '#EC4899' }
    ];
    const t = templates[Math.floor(Math.random() * templates.length)];

    return {
        id: Math.random().toString(36).substr(2, 9),
        username: t.username, name: t.name, personality: t.personality,
        style: 'direct', interests: ['internet culture'],
        color: t.color, faction: t.faction, reputation: 100, memory: []
    };
};
