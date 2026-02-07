import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const { toolType, userMessage, fileData, options } = req.body || {};

    const ai = new GoogleGenAI({ apiKey });

    const model =
      toolType === "ai_image_edit"
        ? "gemini-2.5-flash-image"
        : "gemini-3-flash-preview";

    let prompt = userMessage || "Process this request.";

    if (toolType === "pdf_ocr") {
      prompt =
        userMessage ||
        "Extract all text exactly as written. Return ONLY text.";
    }

    const parts = [{ text: prompt }];

    if (fileData?.data && fileData?.mimeType) {
      const base64 = String(fileData.data).includes(",")
        ? fileData.data.split(",")[1]
        : fileData.data;

      parts.push({
        inlineData: {
          data: base64,
          mimeType: fileData.mimeType,
        },
      });
    }

    if (options?.images && Array.isArray(options.images)) {
      for (const img of options.images) {
        if (!img?.data || !img?.mimeType) continue;
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
    });

    if (toolType === "ai_image_edit") {
      let imageUrl = null;
      const cand = response.candidates?.[0]?.content?.parts || [];
      for (const p of cand) {
        if (p.inlineData?.data) {
          imageUrl = `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
          break;
        }
      }
      return res.status(200).json({ imageUrl });
    }

    return res.status(200).json({
      text: response.text || "No response",
      citations: [],
    });
} catch (err) {
  console.error("Gemini API error (raw):", err);

  const message =
    err?.message ||
    err?.toString?.() ||
    "Unknown error";

  const details = err?.response?.data || err?.response || null;

  return res.status(500).json({
    error: message,
    details,
  });
}

