import { ProcessingRequest, ProcessingResponse } from "../types.ts";
import { processAIRequest } from "./geminiService.ts";
import { jsPDF } from "jspdf";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";
import { removeBackground } from "@imgly/background-removal";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";

/* =========================
   LOG EXECUTION (GLOBAL)
========================= */
const logExecution = async (payload: {
  request_id: string;
  tool_type: string;
  status: "success" | "error";
}) => {
  try {
    await fetch("/api/log-execution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // logging failure should never block tool execution
  }
};

/* =========================
   MAIN ORCHESTRATOR
========================= */
export const orchestrateTool = async (
  request: ProcessingRequest,
  fileBlobs: File[]
): Promise<ProcessingResponse> => {
  const startTime = Date.now();

  try {
    if (request.input_files.length === 0 && fileBlobs.length === 0) {
      throw {
        code: "NO_FILES",
        message: "No input files provided.",
      };
    }

    /* ========== PDF OCR ========== */
    if (request.tool_type === "pdf_ocr") {
      const file = fileBlobs[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const pageImages: { data: string; mimeType: string }[] = [];

      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        pageImages.push({
          data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1],
          mimeType: "image/jpeg",
        });
      }

      const aiResult = await processAIRequest(
        "pdf_ocr",
        null,
        "Extract all text exactly as written. Return ONLY text.",
        { images: pageImages }
      );

      await logExecution({
        request_id: request.request_id,
        tool_type: request.tool_type,
        status: "success",
      });

      return {
        status: "success",
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          text: aiResult.text,
          filename: `ocr_${Date.now()}.txt`,
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          execution_time_ms: Date.now() - startTime,
          input_count: 1,
          output_count: 1,
        },
      };
    }

    /* ========== AI TOOLS ========== */
    if (
      request.tool_type.startsWith("ai_") &&
      request.tool_type !== "ai_image_edit"
    ) {
      const file = fileBlobs[0];
      const base64 = await fileToBase64(file);

      const aiResult = await processAIRequest(
        request.tool_type,
        { data: base64, mimeType: file.type },
        request.user_message,
        request.options
      );

      await logExecution({
        request_id: request.request_id,
        tool_type: request.tool_type,
        status: "success",
      });

      return {
        status: "success",
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          text: aiResult.text,
          citations: aiResult.citations,
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          execution_time_ms: Date.now() - startTime,
          input_count: 1,
          output_count: 1,
        },
      };
    }

    /* ========== BG REMOVE (FREE WASM) ========== */
    if (request.tool_type === "bg_remove") {
      const resultBlob = await removeBackground(fileBlobs[0]);
      const url = URL.createObjectURL(resultBlob);

      await logExecution({
        request_id: request.request_id,
        tool_type: request.tool_type,
        status: "success",
      });

      return {
        status: "success",
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          filename: `bg_removed_${Date.now()}.png`,
          mime: "image/png",
          download_url: url,
          preview_url: url,
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          execution_time_ms: Date.now() - startTime,
          input_count: 1,
          output_count: 1,
        },
      };
    }

    throw {
      code: "UNKNOWN_TOOL",
      message: `Unknown tool_type: ${request.tool_type}`,
    };
  } catch (err: any) {
    await logExecution({
      request_id: request.request_id,
      tool_type: request.tool_type,
      status: "error",
    });

    return {
      status: "error",
      request_id: request.request_id,
      tool: request.tool_type,
      error: {
        code: err.code || "ENGINE_ERROR",
        message: err.message || "Tool execution failed",
      },
      admin_telemetry: {
        tool_used: request.tool_type,
        execution_time_ms: Date.now() - startTime,
        input_count: fileBlobs.length,
        output_count: 0,
      },
    };
  }
};

/* =========================
   HELPERS
========================= */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
