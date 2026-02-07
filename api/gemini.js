import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY on server" });
    }

    const { toolType, userMessage, fileData, options } = req.body || {};

    const ai = new GoogleGenAI({ apiKey });

    // তোমার model mapping (যেটা চাই)
    const model =
      toolType === "ai_image_edit" ? "gemini-2.5-flash-image" : "gemini-3-flash-preview";

    // prompt build
    let prompt = "";
    if (toolType === "ai_pdf_chat") {
      prompt = `Answer user question: "${userMessage}" from this doc.`;
    } else if (toolType === "ai_pdf_summary") {
      prompt = "Summarize this document in 5 key bullet points.";
    } else if (toolType === "ai_translate_pdf") {
      prompt = `Translate core content to ${options?.target_lang || "English"}.`;
    } else if (toolType === "ai_question_generator") {
      prompt = `Generate questions based on this document.`;
    } else if (toolType === "pdf_ocr") {
      prompt =
        userMessage ||
        "Perform high-fidelity OCR. Extract all text exactly as written. Return ONLY text.";
    } else {
      prompt = userMessage || "Process this request.";
    }

    const parts: any[] = [{ text: prompt }];

    // main file data
    if (fileData?.data && fileData?.mimeType) {
      const base64 = String(fileData.data).includes(",")
        ? String(fileData.data).split(",")[1]
        : String(fileData.data);

      parts.push({
        inlineData: { data: base64, mimeType: fileData.mimeType },
      });
    }

    // images array (OCR pages etc)
    if (options?.images && Array.isArray(options.images)) {
      for (const img of options.images) {
        if (!img?.data || !img?.mimeType) continue;
        parts.push({
          inlineData: { data: img.data, mimeType: img.mimeType },
        });
      }
    }

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
    });

    // image edit output handle
    if (toolType === "ai_image_edit") {
      let imageUrl: string | null = null;
      const candParts = response.candidates?.[0]?.content?.parts || [];
      for (const p of candParts) {
        if (p.inlineData?.data && p.inlineData?.mimeType) {
          imageUrl = `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
          break;
        }
      }
      return res.status(200).json({ imageUrl });
    }

    return res.status(200).json({
      text: response.text || "No response.",
      citations: [],
    });
  } catch (e: any) {
    console.error("API /api/gemini error:", e);
    return res.status(500).json({ error: "Gemini API failed" });
  }
}
