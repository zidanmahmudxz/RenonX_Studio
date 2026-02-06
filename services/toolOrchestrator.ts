
import { ProcessingRequest, ProcessingResponse } from '../types.ts';
import { processAIRequest, processImageEditingRequest } from './geminiService.ts';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

export const orchestrateTool = async (request: ProcessingRequest, fileBlobs: File[]): Promise<ProcessingResponse> => {
  const startTime = Date.now();
  
  try {
    if (request.input_files.length === 0 && fileBlobs.length === 0) {
      throw { code: 'NO_FILES', message: 'No input files provided.', debug: 'input_files array is empty' };
    }

    if (request.tool_type === 'pdf_ocr') {
      const file = fileBlobs[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = Math.min(pdf.numPages, 10);
      
      const pageImages: { data: string; mimeType: string }[] = [];
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        pageImages.push({ 
          data: canvas.toDataURL('image/jpeg', 0.8).split(',')[1], 
          mimeType: 'image/jpeg' 
        });
      }

      const aiResult = await processAIRequest(
        'pdf_ocr', 
        null, 
        "Perform high-fidelity OCR on these document pages. Extract all text exactly as written, preserving headers and lists. Return ONLY the extracted text.",
        { images: pageImages }
      );

      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          text: aiResult.text,
          filename: `renonx_ocr_${Date.now()}.txt`
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['AI_OCR', 'VISION_EXTRACTION'],
          quality_mode: 'neural_v3_vision',
          input_count: 1,
          output_count: 1,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (request.tool_type.startsWith('ai_') && request.tool_type !== 'ai_image_edit') {
      const file = fileBlobs[0];
      const base64 = await fileToBase64(file);
      const aiResult = await processAIRequest(
        request.tool_type, 
        { data: base64, mimeType: file.type }, 
        request.user_message,
        request.options
      );

      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          text: aiResult.text,
          citations: aiResult.citations
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['AI_GEN'],
          quality_mode: 'high',
          input_count: fileBlobs.length,
          output_count: 1,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (request.tool_type === 'bg_remove') {
      const file = fileBlobs[0];
      const base64 = await fileToBase64(file);
      
      const aiResponse = await processImageEditingRequest(
        { data: base64, mimeType: file.type },
        "Remove the background from this image. Keep only the main person/subject in the foreground. Output the isolated person clearly with high detail. If the output has a solid background, make it pure white."
      );

      if (!aiResponse.imageUrl) {
        throw { code: 'AI_FAILED', message: 'AI engine failed to isolate subject.', debug: 'Empty image part from engine' };
      }

      const processedUrl = await applyTransparencyFilter(aiResponse.imageUrl);

      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          filename: `renonx_isolated_${Date.now()}.png`,
          mime: 'image/png',
          download_url: processedUrl,
          preview_url: processedUrl
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['AI_SEGMENTATION', 'PRO_VISION'],
          quality_mode: 'ultra_hd',
          input_count: 1,
          output_count: 1,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (request.tool_type === 'image_compress') {
      const file = fileBlobs[0];
      const dataUrl = await fileToBase64(file);
      const img = await loadImage(dataUrl);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      
      const compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.6); 
      });
      
      const download_url = URL.createObjectURL(compressedBlob);
      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          filename: `renonx_compressed_${Date.now()}.jpg`,
          mime: 'image/jpeg',
          download_url,
          preview_url: download_url
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['BROWSER_COMPRESSION'],
          quality_mode: 'balanced',
          input_count: 1,
          output_count: 1,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (request.tool_type === 'image_to_pdf') {
      const pdf = new jsPDF();
      for (let i = 0; i < fileBlobs.length; i++) {
        const file = fileBlobs[i];
        const dataUrl = await fileToBase64(file);
        const img = await loadImage(dataUrl);

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;

        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
      }
      
      const pdfBlob = pdf.output('blob');
      const download_url = URL.createObjectURL(pdfBlob);

      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          filename: `renonx_studio_bundle_${Date.now()}.pdf`,
          mime: 'application/pdf',
          download_url
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['PDF_LIB_CLIENT'],
          quality_mode: 'print_quality',
          input_count: fileBlobs.length,
          output_count: 1,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (request.tool_type === 'image_convert') {
      const file = fileBlobs[0];
      const targetFormat = request.options?.target_format || 'image/png';
      const dataUrl = await fileToBase64(file);
      const img = await loadImage(dataUrl);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      
      const convertedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), targetFormat);
      });
      
      const download_url = URL.createObjectURL(convertedBlob);
      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          filename: `renonx_converted_${Date.now()}.${targetFormat.split('/')[1]}`,
          mime: targetFormat,
          download_url,
          preview_url: download_url
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['NATIVE_CANVAS'],
          quality_mode: '1:1_fidelity',
          input_count: 1,
          output_count: 1,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (request.tool_type === 'pdf_to_image') {
      const file = fileBlobs[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const outputItems = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const imageUrl = canvas.toDataURL('image/png');
        
        outputItems.push({
          filename: `renonx_page_${i}.png`,
          mime: 'image/png',
          download_url: imageUrl
        });
      }

      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          items: outputItems
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['PDFJS_CLIENT_RENDER'],
          quality_mode: 'high_res_2x',
          input_count: 1,
          output_count: outputItems.length,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (request.tool_type === 'merge_pdf') {
      const mergedPdf = await PDFDocument.create();
      for (const file of fileBlobs) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const download_url = URL.createObjectURL(pdfBlob);

      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          filename: `renonx_merged_${Date.now()}.pdf`,
          mime: 'application/pdf',
          download_url
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['PDFLIB_CLIENT_MERGE'],
          quality_mode: 'lossless_sequence',
          input_count: fileBlobs.length,
          output_count: 1,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (request.tool_type === 'split_pdf') {
      const file = fileBlobs[0];
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const totalPages = sourcePdf.getPageCount();
      const splitRange = request.options?.split_range || '';
      
      let rangesToExtract: number[][] = [];

      if (!splitRange.trim()) {
        for (let i = 0; i < totalPages; i++) {
          rangesToExtract.push([i]);
        }
      } else {
        const parts = splitRange.split(',').map(p => p.trim());
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n, 10));
            if (!isNaN(start) && !isNaN(end)) {
              const range = [];
              for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                range.push(i - 1);
              }
              if (range.length > 0) rangesToExtract.push(range);
            }
          } else {
            const pageNum = parseInt(part, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
              rangesToExtract.push([pageNum - 1]);
            }
          }
        }
      }

      if (rangesToExtract.length === 0) {
        throw { code: 'INVALID_RANGE', message: 'The provided range resulted in no valid pages.', debug: `Range: ${splitRange}, Total Pages: ${totalPages}` };
      }

      const outputItems = [];
      for (let idx = 0; idx < rangesToExtract.length; idx++) {
        const indices = rangesToExtract[idx];
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach(p => newPdf.addPage(p));
        
        const pdfBytes = await newPdf.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const download_url = URL.createObjectURL(pdfBlob);
        
        outputItems.push({
          filename: `renonx_split_part_${idx + 1}.pdf`,
          mime: 'application/pdf',
          download_url
        });
      }

      return {
        status: 'success',
        request_id: request.request_id,
        tool: request.tool_type,
        output: {
          items: outputItems
        },
        admin_telemetry: {
          tool_used: request.tool_type,
          flags: ['PDFLIB_CLIENT_SPLIT'],
          quality_mode: 'precise_segmentation',
          input_count: 1,
          output_count: outputItems.length,
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    throw { code: 'ROUTE_ERROR', message: 'The engine could not route this tool request.', debug: `Unknown tool_type: ${request.tool_type}` };

  } catch (err: any) {
    return {
      status: 'error',
      request_id: request.request_id,
      tool: request.tool_type,
      error: {
        code: err.code || 'ENGINE_HALT',
        message: err.message || 'Processing failed at the orchestration layer.',
        debug: err.debug || String(err)
      },
      admin_telemetry: {
        tool_used: request.tool_type,
        flags: ['ERROR'],
        quality_mode: 'none',
        input_count: fileBlobs.length,
        output_count: 0,
        execution_time_ms: Date.now() - startTime
      }
    };
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = url;
  });
};

const applyTransparencyFilter = async (dataUrl: string): Promise<string> => {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    if (r > 245 && g > 245 && b > 245) {
      data[i+3] = 0;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};
