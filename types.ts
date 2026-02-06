
export type ToolCategory = 'image' | 'pdf' | 'ai' | 'utility';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  inputs: 'single' | 'multiple';
  options?: any;
}

export interface AdminSettings {
  bkashLink: string;
  notificationMessage: string;
  showNotification: boolean;
  popupTitle: string;
  popupMessage: string;
  showPopup: boolean;
  facebookLink: string;
  twitterLink: string;
  githubLink: string;
  disabledTools: string[];
  adminAccessCode: string; // New field for custom access code
}

export interface ProcessingRequest {
  request_id: string;
  tool_type: string;
  input_files: string[];
  options?: Record<string, any>;
  user_message?: string;
  locale?: string;
}

export interface ProcessingResponse {
  status: 'success' | 'error';
  request_id: string;
  tool: string;
  output?: {
    filename?: string;
    mime?: string;
    download_url?: string;
    preview_url?: string;
    items?: Array<{
      filename: string;
      mime: string;
      download_url: string;
    }>;
    zip_download_url?: string;
    text?: string;
    citations?: any[];
  };
  error?: {
    code: string;
    message: string;
    debug: string;
  };
  admin_telemetry: {
    tool_used: string;
    flags: string[];
    quality_mode: string;
    input_count: number;
    output_count: number;
    execution_time_ms?: number;
  };
}

export interface TelemetryLog {
  timestamp: number;
  response: ProcessingResponse;
}
