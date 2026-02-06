
import React from 'react';
import { 
  Image as ImageIcon, 
  FileText, 
  Bot, 
  Wand2, 
  Scissors, 
  Combine, 
  FileSearch, 
  Languages, 
  MessageSquare, 
  BrainCircuit, 
  Maximize2, 
  Minimize2, 
  Type, 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  Share2, 
  BarChart3, 
  Bell, 
  Megaphone,
  ToggleRight,
  ShieldCheck,
  Menu
} from 'lucide-react';
import { Tool, AdminSettings } from './types.ts';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  bkashLink: "https://renon-x-studio.vercel.app/#",
  notificationMessage: "Welcome to RenonX Studio v2.4. New OCR engine is now active!",
  showNotification: true,
  popupTitle: "System Announcement",
  popupMessage: `RenonX AI Studio-তে স্বাগতম! 🎉
এখানে সকল AI টুল সম্পূর্ণ ফ্রি ব্যবহার করতে পারবেন।  
সিস্টেম ম্যানেজমেন্ট ও উন্নয়নের জন্য চাইলে আমাদেরকে ডোনেট করে সহযোগিতা করতে পারেন।  
আপনার সহায়তাই আমাদের এগিয়ে যেতে সাহায্য করবে। 💙

যেকোনো আপডেট, সমস্যা বা পরামর্শের জন্য  
ইমেইল: zidan.mahmud.x@gmail.com

📘 Facebook (Message): 
https://www.facebook.com/share/1Ab2SRsFqE/?mibextid=wwXIfr
`,
  showPopup: true,
  facebookLink: "https://www.facebook.com/share/1Ab2SRsFqE/?mibextid=wwXIfr",
  twitterLink: "https://renon-x-studio.vercel.app/",
  githubLink: "https://github.com/zidanmahmud",
  disabledTools: [],
  adminAccessCode: "ZidanX@?12#",
};


export const TOOLS: Tool[] = [
  // Image Tools
  {
    id: 'bg_remove',
    name: 'Background Remover',
    description: 'Ultra-precision AI background removal for products and portraits.',
    icon: 'Wand2',
    category: 'image',
    inputs: 'single',
    options: { mode: 'ultra' }
  },
  {
    id: 'image_compress',
    name: 'Image Compressor',
    description: 'Reduce file size without losing visual fidelity.',
    icon: 'Minimize2',
    category: 'image',
    inputs: 'single'
  },
  {
    id: 'image_convert',
    name: 'Image Converter',
    description: 'Convert between PNG, WebP, JPEG, and AVIF.',
    icon: 'Maximize2',
    category: 'image',
    inputs: 'single'
  },
  // PDF Tools
  {
    id: 'image_to_pdf',
    name: 'Images to PDF',
    description: 'Convert batch images into a professional PDF document.',
    icon: 'FileText',
    category: 'pdf',
    inputs: 'multiple'
  },
  {
    id: 'pdf_to_image',
    name: 'PDF to Image',
    description: 'Extract pages from PDF as high-quality images.',
    icon: 'ImageIcon',
    category: 'pdf',
    inputs: 'single'
  },
  {
    id: 'merge_pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into one.',
    icon: 'Combine',
    category: 'pdf',
    inputs: 'multiple'
  },
  {
    id: 'split_pdf',
    name: 'Split PDF',
    description: 'Extract specific pages or split by range.',
    icon: 'Scissors',
    category: 'pdf',
    inputs: 'single'
  },
  {
    id: 'pdf_ocr',
    name: 'PDF OCR',
    description: 'Turn scanned documents into searchable, editable text.',
    icon: 'Type',
    category: 'pdf',
    inputs: 'single'
  },
  // AI Tools
  {
    id: 'ai_pdf_chat',
    name: 'AI Document Chat',
    description: 'Ask questions and get answers directly from your documents.',
    icon: 'MessageSquare',
    category: 'ai',
    inputs: 'single'
  },
  {
    id: 'ai_pdf_summary',
    name: 'Smart Summary',
    description: 'Generate concise executive summaries of long PDFs.',
    icon: 'BrainCircuit',
    category: 'ai',
    inputs: 'single'
  },
  {
    id: 'ai_translate_pdf',
    name: 'AI PDF Translate',
    description: 'Translate documents while preserving original formatting.',
    icon: 'Languages',
    category: 'ai',
    inputs: 'single'
  },
  {
    id: 'ai_question_generator',
    name: 'Quiz Generator',
    description: 'Automatically generate questions from any study material.',
    icon: 'FileSearch',
    category: 'ai',
    inputs: 'single'
  }
];

export const getIcon = (name: string, size = 24) => {
  const icons: Record<string, any> = {
    ImageIcon, FileText, Bot, Wand2, Scissors, Combine, FileSearch, Languages, MessageSquare, BrainCircuit, Maximize2, Minimize2, Type, LayoutDashboard, SettingsIcon, Share2, BarChart3, Bell, Megaphone, ToggleRight, ShieldCheck, Menu
  };
  const IconComp = icons[name] || FileText;
  return <IconComp size={size} />;
};
