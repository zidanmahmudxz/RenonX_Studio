import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const out = await ai.models.list();

    // ---- Normalize different possible return shapes ----
    let list = null;

    // case 1: { models: [...] }
    if (out && Array.isArray(out.models)) {
      list = out.models;
    }

    // case 2: out is already an array
    if (!list && Array.isArray(out)) {
      list = out;
    }

    // case 3: out.data.models (some SDK styles)
    if (!list && out?.data && Array.isArray(out.data.models)) {
      list = out.data.models;
    }

    // case 4: async iterable (rare)
    if (!list && out && typeof out[Symbol.asyncIterator] === "function") {
      list = [];
      for await (const m of out) list.push(m);
    }

    if (!list) {
      // Return raw output shape for debugging
      return res.status(200).json({
        count: 0,
        note: "Could not normalize list() output. Showing raw output keys.",
        rawType: typeof out,
        rawKeys: out ? Object.keys(out) : null,
        raw: out,
      });
    }

    const models = list.map((m) => ({
      name: m?.name || m?.id || null,
      displayName: m?.displayName || null,
      description: m?.description || null,
      supportedGenerationMethods: m?.supportedGenerationMethods || null,
      inputTokenLimit: m?.inputTokenLimit || null,
      outputTokenLimit: m?.outputTokenLimit || null,
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
