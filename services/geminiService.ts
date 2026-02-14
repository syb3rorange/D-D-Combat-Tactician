
import { GoogleGenAI, Type } from "@google/genai";

export const generateMonster = async (description: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key is missing from the environment.");
    return null;
  }

  // Create instance inside the function to ensure it uses the latest key and avoids module-level initialization errors.
  const ai = new GoogleGenAI({ apiKey });

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
    
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    if (!text) throw new Error("Empty AI response");

    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating monster:", error);
    return null;
  }
};
