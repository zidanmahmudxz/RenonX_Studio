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

    // ✅ safe body parse
    const body = req.body || {};
    const { toolType, userMessage, fileData, options } = body;

    // ✅ initialize
    const ai = new GoogleGenAI({ apiKey });

    // ✅ Free tier friendly fallback models
    // (পরে চাইলে env দিয়ে override করতে পারো)
   const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "models/gemini-3-flash-preview";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "models/gemini-2.5-flash-image";


    const model = toolType === "ai_image_edit" ? IMAGE_MODEL : TEXT_MODEL;

    // ✅ prompt build
    let prompt = userMessage || "Process this request.";

    if (toolType === "ai_pdf_chat") {
      prompt = `Answer user question: "${userMessage}" from this doc.`;
    } else if (toolType === "ai_pdf_summary") {
      prompt = "Summarize this document in 5 key bullet points.";
    } else if (toolType === "ai_translate_pdf") {
      prompt = `Translate core content to ${options?.target_lang || "English"}.`;
    } else if (toolType === "ai_question_generator") {
      prompt = "Generate questions based on this document.";
    } else if (toolType === "pdf_ocr") {
      prompt =
        userMessage ||
        "Perform high-fidelity OCR. Extract all text exactly as written. Return ONLY the extracted text.";
    } else if (toolType === "ai_image_edit") {
      // image edit prompt already comes as userMessage from frontend
      prompt = userMessage || "Edit this image as instructed.";
    }

    const parts = [{ text: prompt }];

    // ✅ attach main file data (base64)
    if (fileData?.data && fileData?.mimeType) {
      const raw = String(fileData.data);

      // supports either full dataURL or pure base64
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw;

      parts.push({
        inlineData: {
          data: base64,
          mimeType: fileData.mimeType,
        },
      });
    }

    // ✅ attach extra images (OCR pages etc)
    if (options?.images && Array.isArray(options.images)) {
      for (const img of options.images) {
        if (!img?.data || !img?.mimeType) continue;

        // img.data expected as pure base64
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

    // ✅ image-edit output extraction
    if (toolType === "ai_image_edit") {
      let imageUrl = null;
      const candParts = response?.candidates?.[0]?.content?.parts || [];

      for (const p of candParts) {
        if (p?.inlineData?.data && p?.inlineData?.mimeType) {
          imageUrl = `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
          break;
        }
      }

      return res.status(200).json({ imageUrl });
    }

    // ✅ text output
    return res.status(200).json({
      text: response?.text || "No response",
      citations: [],
    });
  } catch (err) {
    // ✅ return real error details to debug (and also logs in vercel)
    console.error("Gemini API error (raw):", err);

    const message = err?.message || err?.toString?.() || "Unknown error";
    const details = err?.response?.data || err?.response || err?.cause || null;

    return res.status(500).json({
      error: message,
      details,
    });
  }
}
