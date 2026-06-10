import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Get an AI explanation of a Torah text passage
 */
export async function explainText(params: {
  text: string;
  source: string;
  lang: "en" | "he";
  context?: string;
}): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;

  const langInstruction =
    params.lang === "he"
      ? "Respond in Hebrew."
      : "Respond in English.";

  const message = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a Torah scholar assistant. Explain the following passage from ${params.source} in a clear, accessible way. Include relevant Chassidic insights when appropriate. ${langInstruction}

${params.context ? `Context: ${params.context}\n` : ""}
Text:
${params.text}

Provide a concise explanation (2-3 paragraphs).`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type === "text") return block.text;
  return null;
}

/**
 * Search Torah texts using AI-powered semantic understanding
 */
export async function searchTorah(params: {
  query: string;
  category?: string;
  lang: "en" | "he";
}): Promise<{
  answer: string;
  suggestions: string[];
} | null> {
  const ai = getClient();
  if (!ai) return null;

  const categoryFilter = params.category
    ? `Focus on ${params.category} texts.`
    : "";

  const message = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a Torah search assistant with deep knowledge of Chumash, Tehillim, Tanya, and Rambam's Mishneh Torah. ${categoryFilter}

A user is searching for: "${params.query}"

Respond in ${params.lang === "he" ? "Hebrew" : "English"} with:
1. A direct answer to their query (1-2 paragraphs)
2. 3-5 specific text references they should look at (book, chapter, verse/paragraph)

Format your response as JSON:
{
  "answer": "your explanation here",
  "suggestions": ["Tanya Chapter 1", "Bereishit 1:1", ...]
}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") return null;

  try {
    return JSON.parse(block.text);
  } catch {
    return { answer: block.text, suggestions: [] };
  }
}

/**
 * Find cross-references and connections for a specific verse
 */
export async function findConnections(params: {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  lang: "en" | "he";
}): Promise<{
  connections: {
    source: string;
    reference: string;
    description: string;
  }[];
} | null> {
  const ai = getClient();
  if (!ai) return null;

  const message = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a Torah cross-reference assistant. For the following verse, find related passages across Chumash, Tehillim, Tanya, and Rambam.

Source: ${params.book} ${params.chapter}:${params.verse}
Text: ${params.text}

Respond in ${params.lang === "he" ? "Hebrew" : "English"} as JSON:
{
  "connections": [
    {
      "source": "category (chumash/tehillim/tanya/rambam)",
      "reference": "Book Chapter:Verse",
      "description": "Brief explanation of the connection"
    }
  ]
}

Provide 3-7 meaningful connections.`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") return null;

  try {
    return JSON.parse(block.text);
  } catch {
    return { connections: [] };
  }
}

/**
 * Check if AI features are available
 */
export function isAIAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
