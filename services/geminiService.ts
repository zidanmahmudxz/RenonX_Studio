type FileData = { data: string; mimeType: string } | null;

export const processAIRequest = async (
  toolType: string,
  fileData: FileData,
  userMessage?: string,
  options?: any
) => {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolType, fileData, userMessage, options }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini request failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return {
    text: data.text || "No response.",
    citations: data.citations || [],
  };
};

export const processImageEditingRequest = async (
  fileData: { data: string; mimeType: string },
  prompt: string
) => {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toolType: "ai_image_edit",
      fileData,
      userMessage: prompt,
      options: {},
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Image edit failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return { imageUrl: data.imageUrl || null };
};
