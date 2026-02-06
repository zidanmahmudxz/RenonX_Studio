
import { GoogleGenAI, Type } from "@google/genai";

export const processAIRequest = async (
  toolType: string,
  fileData: { data: string; mimeType: string } | null,
  userMessage?: string,
  options?: any
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  let prompt = "";
  if (toolType === 'ai_pdf_chat') {
    prompt = `Answer user question: "${userMessage}" from this doc.`;
  } else if (toolType === 'ai_pdf_summary') {
    prompt = "Summarize this document in 5 key bullet points.";
  } else if (toolType === 'ai_translate_pdf') {
    prompt = `Translate core content to ${options?.target_lang || 'English'}.`;
  } else if (toolType === 'ai_question_generator') {
    prompt = `Generate questions based on this document.`;
  } else if (toolType === 'pdf_ocr') {
    prompt = userMessage || "Extract all text from these images.";
  }

  const parts: any[] = [{ text: prompt }];
  
  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data.split(',')[1],
        mimeType: fileData.mimeType
      }
    });
  }

  if (options?.images && Array.isArray(options.images)) {
    for (const img of options.images) {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
    });

    return {
      text: response.text || "No response.",
      citations: []
    };
  } catch (error) {
    console.error("RenonX Engine Error:", error);
    throw error;
  }
};

export const processImageEditingRequest = async (
  fileData: { data: string; mimeType: string },
  prompt: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: fileData.data.split(',')[1],
              mimeType: fileData.mimeType
            }
          },
          { text: prompt }
        ]
      },
    });

    let imageUrl = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    return { imageUrl };
  } catch (error) {
    console.error("RenonX Vision Error:", error);
    throw error;
  }
};
