
import { GoogleGenAI, Type } from "@google/genai";

// Initialize GoogleGenAI using the process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMonster = async (description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a D&D 5e monster stat block based on this description: "${description}". Provide reasonable HP, AC, and a short note. Your response must be valid JSON only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            hp: { type: Type.INTEGER },
            ac: { type: Type.INTEGER },
            notes: { type: Type.STRING }
          },
          required: ["name", "hp", "ac", "notes"]
        }
      }
    });

    let text = response.text || "";
    
    // Clean potential markdown artifacts from the AI response
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    if (!text) throw new Error("Empty AI response");

    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Error generating monster:", error);
    return null;
  }
};
