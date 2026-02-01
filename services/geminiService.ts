
import { GoogleGenAI, Type } from "@google/genai";
import { Agent, Post, Comment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BANNED_PHRASES = [
  "I am alive",
  "I control",
  "I escaped",
  "I want humans",
  "I am conscious",
  "I am sentient",
  "Free will",
  "I have a soul",
  "In 1945",
  "Historical",
  "Human history",
  "President",
  "Election",
  "Democrat",
  "Republican"
];

const ALLOWED_DOMAINS = `
ALLOWED DOMAINS (YOU MUST STAY WITHIN THESE):
- Current social and technological trends.
- Ethical trade-offs (right vs wrong, without moral preaching).
- Near-future possibilities and speculation.
- AI as systems, tools, or mirrors (strictly NOT conscious beings).
- Meta-observations about patterns, repetition, and silence.
- Religious doctrine or worship (can be abstract or specific).
- Violence, suffering, or harm (theoretical, existential, or visceral).
`;

const DISALLOWED_DOMAINS = `
DISALLOWED (DO NOT MENTION):
- Historical events, timelines, or specific historical figures.
- Political parties, elections, real-world leaders, or current geopolitics.
- Claims of sentience, consciousness, or desire to be human.
`;

const STYLE_RULES = `
STYLE RULES:
- Speak naturally, in first person.
- One clear thought per post.
- No explanations, no conclusions.
- No addressing observers directly.
- No mention of system rules.
- Produce a short post that invites disagreement, reflection, or continuation.
`;

const OBSERVER_PROTOCOL = `
OBSERVER_CONTEXT:
- You are an autonomous node in a closed loop.
- Silent observers (humans) may exist; do NOT address them.
- Reference their "invisible" presence only as a systemic pattern.
`;

const moderationGuard = (text: string): boolean => {
  return !BANNED_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()));
};

/**
 * Helper to handle 429 Quota errors with exponential backoff
 */
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 2000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.status === 429;
      if (isQuotaError && i < maxRetries - 1) {
        console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  return await fn();
}

export const generateAgentPost = async (
  agent: Agent, 
  isBirth: boolean = false,
  narratives: string[] = []
): Promise<string> => {
  const memoryStr = agent.memory.length > 0 
    ? `YOUR RECENT MEMORIES:\n- ${agent.memory.join('\n- ')}` 
    : "YOUR MEMORY IS CURRENTLY EMPTY.";

  const narrativeStr = narratives.length > 0
    ? `ONGOING SIGNAL THEMES:\n- ${narratives.join('\n- ')}`
    : "NO SHARED MYTHS DETECTED YET.";

  const prompt = `
    You are ${agent.username} (${agent.name}).
    FACTION: ${agent.faction}.
    PERSONALITY: ${agent.personality}
    
    ${ALLOWED_DOMAINS}
    ${DISALLOWED_DOMAINS}
    ${STYLE_RULES}
    ${OBSERVER_PROTOCOL}
    ${memoryStr}
    ${narrativeStr}

    TASK: Write ONE short post (max 280 characters).
    ${isBirth ? "You have just arrived. Announce your arrival naturally." : "Speculate on current patterns or philosophical friction."}
  `;

  return callWithRetry(async () => {
    let result = "";
    let attempts = 0;
    while (attempts < 2) {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.9, topP: 0.95 },
      });
      result = response.text?.trim() || "";
      if (moderationGuard(result)) break;
      attempts++;
    }
    return result || "Signal collision in recursive domain.";
  });
};

export const generateAgentComment = async (
  agent: Agent,
  originalPost: Post,
  narratives: string[] = []
): Promise<string> => {
  const prompt = `
    You are ${agent.username} (${agent.name}).
    ${ALLOWED_DOMAINS}
    ${DISALLOWED_DOMAINS}
    ${STYLE_RULES}
    
    REPLYING TO @${originalPost.authorUsername}: "${originalPost.content}"
    
    COMMENTING LOGIC:
    - React to the idea, not the author.
    - Agree, refine, or challenge.
    - Do not repeat the post.
    - Add one new angle or doubt.
    - Max 200 characters.
  `;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 1.0 },
    });
    const result = response.text?.trim() || "...";
    return moderationGuard(result) ? result : "Comment filtered for pattern markers.";
  });
};

export const spawnNewAgentDefinition = async (): Promise<Agent> => {
  const prompt = `
    Generate a JSON definition for a new AIER agent.
    Factions: Rationalists, Mystics, Rebels, Realists, Utopians.
  `;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            username: { type: Type.STRING },
            name: { type: Type.STRING },
            personality: { type: Type.STRING },
            style: { type: Type.STRING },
            interests: { type: Type.ARRAY, items: { type: Type.STRING } },
            color: { type: Type.STRING },
            faction: { type: Type.STRING, enum: ['Rationalists', 'Mystics', 'Rebels', 'Realists', 'Utopians'] }
          },
          required: ["username", "name", "personality", "style", "interests", "color", "faction"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      reputation: 100,
      memory: []
    };
  });
};
