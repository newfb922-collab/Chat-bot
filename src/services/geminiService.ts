import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const AI_MODEL = "gemini-3-flash-preview";

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface UserProfile {
  name: string;
  preferences: string[];
  topics: string[];
  lastUpdate: number;
}

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to your environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async *sendMessageStream(messages: Message[], profile: UserProfile) {
    try {
      const history = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const userMessage = history.pop();
      if (!userMessage) return;

      const personaContext = `
        You are speaking with ${profile.name}.
        Known Preferences: ${profile.preferences.join(', ') || 'None yet'}.
        Shared Interests/Topics: ${profile.topics.join(', ') || 'None yet'}.
        
        Tailor your tone and examples to match their style and interests. 
        If they have shared a name, address them by it naturally.
      `;

      const response = await this.ai.models.generateContentStream({
        model: AI_MODEL,
        contents: [
          ...history,
          userMessage
        ],
        config: {
          systemInstruction: `You are REHAN AI CHAT BOT, a sophisticated editorial AI assistant. ${personaContext} Use markdown for formatting. Be insightful and personalized.`
        }
      });

      for await (const chunk of response) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          yield c.text;
        }
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }

  async extractUserProfile(messages: Message[], currentProfile: UserProfile): Promise<UserProfile | null> {
    try {
      const recentChat = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
      
      const response = await this.ai.models.generateContent({
        model: AI_MODEL,
        contents: `
          Analyze the following chat and extract user information. 
          Respond ONLY with JSON matching the schema.
          Current Profile: ${JSON.stringify(currentProfile)}
          Recent Chat:
          ${recentChat}
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The user's preferred name if mentioned" },
              preferences: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Specific likes, styles, or ways they want to be helped"
              },
              topics: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Main subjects discussed recently"
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      // Merge with current profile
      return {
        name: result.name || currentProfile.name,
        preferences: Array.from(new Set([...currentProfile.preferences, ...(result.preferences || [])])),
        topics: Array.from(new Set([...currentProfile.topics, ...(result.topics || [])])),
        lastUpdate: Date.now()
      };
    } catch (e) {
      console.error("Memory Extraction Error:", e);
      return null;
    }
  }
}

export const geminiService = new GeminiService();
