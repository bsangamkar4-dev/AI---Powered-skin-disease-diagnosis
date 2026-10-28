import AI_CONFIG from "../config/aiConfig.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

class AIService {
  constructor() {
    this.client = null;
    this.model = null;
    this.unavailableReason = null;
    this.initializationAttempted = false;
  }

  async initialize() {
    if (this.client || this.initializationAttempted) return;
    this.initializationAttempted = true;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      this.unavailableReason = "The Q&A assistant is not configured yet. Add GEMINI_API_KEY to server/src/.env and restart the server.";
      console.warn("[Q&A] Gemini key missing. Add GEMINI_API_KEY to server/src/.env.");
      return;
    }

    try {
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: { timeout: 30000 },
      });
      this.model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
      console.log("[Q&A] Gemini client initialized.");
    } catch (error) {
      this.unavailableReason = "The Q&A assistant could not initialize. Check the server's Google AI configuration.";
      console.error("[Q&A] Gemini initialization failed:", error.message);
    }
  }

  async generateResponse(question) {
    await this.initialize();

    if (!this.client || !this.model) {
      return this._fallbackResponse(question, this.unavailableReason);
    }

    try {
      let result;
      let respondingModel = this.model;
      const models = [...new Set([
        this.model,
        process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash",
      ])];

      modelLoop: for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
        const model = models[modelIndex];
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            result = await this.client.models.generateContent({
              model,
              contents: question,
              config: {
                systemInstruction: AI_CONFIG.SYSTEM_PROMPT,
                maxOutputTokens: AI_CONFIG.GENERATION_CONFIG.maxOutputTokens,
              },
            });
            respondingModel = model;
            break modelLoop;
          } catch (error) {
            const temporaryProviderError =
              [429, 500, 502, 503, 504].includes(error.status) ||
              ["ECONNABORTED", "ETIMEDOUT"].includes(error.code) ||
              /"code"\s*:\s*(429|500|502|503|504)/.test(error.message || "");

            if (!temporaryProviderError) throw error;
            if (attempt === 0) {
              console.warn(`[Q&A] ${model} is temporarily busy; retrying once.`);
              await new Promise((resolve) => setTimeout(resolve, 800));
              continue;
            }
            if (modelIndex < models.length - 1) {
              console.warn(`[Q&A] ${model} remains unavailable; trying the backup model.`);
              break;
            }
            throw error;
          }
        }
      }
      if (!result) throw new Error("Gemini models are temporarily unavailable.");
      const answer = result.text?.trim();

      if (!answer) {
        return this._fallbackResponse(
          question,
          "The AI service returned an empty answer. Please try again."
        );
      }

      return {
        answer,
        confidence: 90,
        sources: ["Gemini AI - Medical Knowledge Base"],
        model: respondingModel,
      };
    } catch (error) {
      console.error("[Q&A] Gemini request failed:", error.message);
      return this._fallbackResponse(
        question,
        "The AI service could not answer right now. Check the server logs and try again."
      );
    }
  }

  _fallbackResponse(question, reason = null) {
    return {
      answer: reason || "The AI service is temporarily unavailable. Please try again later or consult a dermatologist for medical advice.",
      confidence: reason ? 0 : 40,
      sources: ["System"],
      model: "Fallback",
    };
  }
}

export default new AIService();
