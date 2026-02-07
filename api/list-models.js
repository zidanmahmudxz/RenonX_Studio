import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const ai = new GoogleGenAI({ apiKey });

    // list models available for this key
    const out = await ai.models.list();

    // clean response (name + supported methods if present)
    const models = (out?.models || out || []).map((m) => ({
      name: m.name,
      description: m.description,
      // fields vary by SDK version—so we keep common ones
      supportedGenerationMethods: m.supportedGenerationMethods,
      inputTokenLimit: m.inputTokenLimit,
      outputTokenLimit: m.outputTokenLimit,
    }));

    return res.status(200).json({ count: models.length, models });
  } catch (err) {
    console.error("ListModels error:", err);
    return res.status(500).json({
      error: err?.message || String(err),
      details: err?.response?.data || err?.response || null,
    });
  }
}
