
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Activity, 
  ChevronRight, 
  Github, 
  Twitter, 
  Facebook,
  Heart, 
  AlertCircle, 
  X, 
  FileText,
  Bot,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  Scissors,
  Copy,
  Lock,
  Settings as SettingsIcon,
  LayoutDashboard,
  BarChart3,
  Bell,
  Save,
  LogOut,
  Coffee,
  Megaphone,
  ToggleRight,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Menu
} from 'lucide-react';
import { BRAND, TOOLS, getIcon, DEFAULT_ADMIN_SETTINGS } from './constants.tsx';
import { Tool, ProcessingResponse, TelemetryLog, ProcessingRequest, AdminSettings } from './types.ts';
import { orchestrateTool } from './services/toolOrchestrator.ts';

const App: React.FC = () => {
  // Navigation & UI States
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<ProcessingResponse | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryLog[]>([]);
  const [stats, setStats] = useState<{ total: number; last24h: number } | null>(null);
  const [userMessage, setUserMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ✅ DB-based execution stats (shared across all browsers)
const [dbStats, setDbStats] = useState<{ total: number; last24h: number }>({
  total: 0,
  last24h: 0,
});

  
  // Admin States
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginPass, setLoginPass] = useState('');
  const [showCode, setShowCode] = useState(false);
const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
  const saved = localStorage.getItem('renonx_admin_settings');
  const parsed = saved ? JSON.parse(saved) : DEFAULT_ADMIN_SETTINGS;
  return { ...DEFAULT_ADMIN_SETTINGS, ...parsed };
});
  const [settingsLoaded, setSettingsLoaded] = useState(false);


  const [adminTab, setAdminTab] = useState<'dashboard' | 'settings' | 'social' | 'tools'>('dashboard');

  // Popup Management
  const [popupDismissed, setPopupDismissed] = useState(false);

  // Tool specific states
  const [targetFormat, setTargetFormat] = useState<string>('image/png');
  const [splitRange, setSplitRange] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Persistence for admin settings
// 1) Load settings from DB on first load
useEffect(() => {
  (async () => {
    try {
      const r = await fetch("/api/settings");
      const j = await r.json();
      if (j?.ok && j?.data) {
        setAdminSettings({ ...DEFAULT_ADMIN_SETTINGS, ...j.data });
      }
    } catch (e) {
      console.warn("Failed to load settings from DB, using defaults", e);
    } finally {
      setSettingsLoaded(true);
    }
  })();
}, []);

  useEffect(() => {
  if (!isAdminMode) return;

  fetch("/api/stats")
    .then((r) => r.json())
    .then((d) => setStats(d))
    .catch(() => setStats({ total: 0, last24h: 0 }));
}, [isAdminMode]);


// 2) Save settings to DB whenever adminSettings changes (after first load)
useEffect(() => {
  if (!settingsLoaded) return;
  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminSettings),
  }).catch(() => {});
}, [adminSettings, settingsLoaded]);

  // 3) Also save settings locally (so refresh keeps latest immediately)
useEffect(() => {
  try {
    localStorage.setItem("renonx_admin_settings", JSON.stringify(adminSettings));
  } catch (e) {}
}, [adminSettings]);


  // Telemetry Aggregation
  const getToolStats = () => {
    const stats: Record<string, number> = {};
    telemetry.forEach(log => {
      const tool = log.response.tool;
      stats[tool] = (stats[tool] || 0) + 1;
    });
    return stats;
  };

  const filteredTools = TOOLS.filter(tool => 
    activeCategory === 'all' || tool.category === activeCategory
  );

  const isToolDisabled = (id: string) => adminSettings.disabledTools.includes(id);

  const toggleToolStatus = (id: string) => {
    const newList = isToolDisabled(id) 
      ? adminSettings.disabledTools.filter(tid => tid !== id)
      : [...adminSettings.disabledTools, id];
    setAdminSettings({ ...adminSettings, disabledTools: newList });
  };

  const handleProcess = async () => {
    if (!selectedTool || files.length === 0) return;
    if (isToolDisabled(selectedTool.id)) return;

    setIsProcessing(true);
    // Track tool usage (DB)
fetch("/api/track", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    toolId: selectedTool.id,
    meta: {
      name: selectedTool.name,
      category: selectedTool.category,
      time: Date.now(),
      from: "web_app"
    }
  })
}).catch(() => {});

    setLastResponse(null);

    const request: ProcessingRequest = {
      request_id: `req_${Math.random().toString(36).substr(2, 9)}`,
      tool_type: selectedTool.id,
      input_files: files.map(f => f.name),
      options: { 
        ...selectedTool.options,
        target_format: selectedTool.id === 'image_convert' ? targetFormat : undefined,
        split_range: selectedTool.id === 'split_pdf' ? splitRange : undefined
      },
      user_message: userMessage,
      locale: navigator.language
    };

    try {
      const response = await orchestrateTool(request, files);
      setLastResponse(response);
      setTelemetry(prev => [{ timestamp: Date.now(), response }, ...prev]);
    } catch (err) {
      console.error("Processing failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPass === adminSettings.adminAccessCode) {
      setIsAdminMode(true);
      setShowLogin(false);
      setLoginPass('');
    } else {
      alert("Invalid Access Code");
    }
  };

  const reset = () => {
    setFiles([]);
    setLastResponse(null);
    setIsProcessing(false);
    setUserMessage('');
    setSplitRange('');
    setCopied(false);
  };

  // Views
  if (isAdminMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <header className="glass border-b border-white/5 px-4 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Lock size={20} className="text-white" />
             </div>
             <div>
                <h2 className="font-black text-sm md:text-lg tracking-tight">Admin Terminal</h2>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none">Management v2.4</p>
             </div>
          </div>
          <button 
            onClick={() => setIsAdminMode(false)}
            className="flex items-center gap-2 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 px-3 md:px-5 py-2.5 rounded-xl border border-white/5 transition-all text-[10px] md:text-xs font-bold uppercase tracking-widest"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Exit Terminal</span>
          </button>
        </header>

        <div className="flex-1 flex flex-col md:flex-row">
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-6 space-y-2 overflow-x-auto md:overflow-x-visible flex md:flex-col gap-2 md:gap-0">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
              { id: 'settings', label: 'General', icon: 'SettingsIcon' },
              { id: 'tools', label: 'Tool Control', icon: 'ToggleRight' },
              { id: 'social', label: 'Social Connect', icon: 'Share2' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as any)}
                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${
                  adminTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {getIcon(tab.icon, 18)}
                {tab.label}
              </button>
            ))}
          </aside>

          <main className="flex-1 p-4 md:p-12 overflow-y-auto">
            {adminTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="glass p-6 md:p-8 rounded-[32px] border border-indigo-500/20 bg-indigo-500/5">
                    <BarChart3 className="text-indigo-400 mb-4" size={32} />
                    259 | <div className="text-2xl md:text-3xl font-black mb-1">{stats?.total ?? 0}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Executions</div>
                    <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">
  Last 24h: {stats?.last24h ?? 0}
</div>

                  </div>
                  <div className="glass p-6 md:p-8 rounded-[32px] border border-emerald-500/20 bg-emerald-500/5">
                    <CheckCircle2 className="text-emerald-400 mb-4" size={32} />
                    <div className="text-2xl md:text-3xl font-black mb-1">100%</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Uptime Score</div>
                  </div>
                  <div className="glass p-6 md:p-8 rounded-[32px] border border-pink-500/20 bg-pink-500/5">
                    <Heart className="text-pink-400 mb-4" size={32} />
                    <div className="text-2xl md:text-3xl font-black mb-1">{adminSettings.bkashLink ? 'Linked' : 'None'}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Donation Status</div>
                  </div>
                </div>

                <div className="glass rounded-[32px] md:rounded-[40px] border border-white/5 overflow-hidden">
                   <div className="px-6 md:px-8 py-6 border-b border-white/5 bg-white/5">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tool Usage Distribution</h3>
                   </div>
                   <div className="p-4 md:p-8">
                      {Object.keys(getToolStats()).length === 0 ? (
                        <div className="py-12 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px]">No usage data available yet.</div>
                      ) : (
                        <div className="space-y-3">
                           {Object.entries(getToolStats()).map(([tool, count]) => (
                             <div key={tool} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                      {getIcon(TOOLS.find(t => t.id === tool)?.icon || 'FileText', 16)}
                                   </div>
                                   <span className="text-xs font-bold text-slate-300">{TOOLS.find(t => t.id === tool)?.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full">{count} hits</span>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )}

            {adminTab === 'tools' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 mb-8">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-2">Master Tool Registry</h3>
                    <p className="text-xs text-slate-500 font-medium">Globally toggle tools on or off. Disabled tools will be greyed out for all users.</p>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {TOOLS.map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between p-5 glass rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isToolDisabled(tool.id) ? 'bg-slate-800 text-slate-600' : 'bg-indigo-600/10 text-indigo-400'}`}>
                              {getIcon(tool.icon, 20)}
                           </div>
                           <div>
                              <div className={`text-sm font-bold ${isToolDisabled(tool.id) ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{tool.name}</div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{tool.category}</div>
                           </div>
                        </div>
                        <button 
                          onClick={() => toggleToolStatus(tool.id)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isToolDisabled(tool.id) ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}
                        >
                          {isToolDisabled(tool.id) ? 'Disabled' : 'Enabled'}
                        </button>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {adminTab === 'settings' && (
              <div className="max-w-2xl space-y-10 animate-in fade-in slide-in-from-bottom-4">
                 <div className="space-y-6 bg-indigo-600/5 p-6 md:p-8 rounded-[32px] border border-indigo-500/10">
                    <div className="flex items-center gap-3 mb-2">
                       <ShieldCheck className="text-indigo-400" size={18} />
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security & Access</label>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 block">Terminal Access Code</label>
                       <div className="relative">
                          <input 
                            type={showCode ? "text" : "password"} 
                            value={adminSettings.adminAccessCode}
                            onChange={(e) => setAdminSettings({...adminSettings, adminAccessCode: e.target.value})}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          />
                          <button 
                            onClick={() => setShowCode(!showCode)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                          >
                             {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">bKash Donation Link</label>
                    <input 
                      type="text" 
                      value={adminSettings.bkashLink}
                      onChange={(e) => setAdminSettings({...adminSettings, bkashLink: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
                    />
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Top Banner Message</label>
                       <button 
                        onClick={() => setAdminSettings({...adminSettings, showNotification: !adminSettings.showNotification})}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${adminSettings.showNotification ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                       >
                         {adminSettings.showNotification ? 'Visible' : 'Hidden'}
                       </button>
                    </div>
                    <textarea 
                      value={adminSettings.notificationMessage}
                      onChange={(e) => setAdminSettings({...adminSettings, notificationMessage: e.target.value})}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                    />
                 </div>

                 <div className="space-y-6 bg-white/5 p-6 md:p-8 rounded-[32px] border border-white/5">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-3">
                          <Megaphone className="text-indigo-400" size={18} />
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Popup Notification</label>
                       </div>
                       <button 
                        onClick={() => setAdminSettings({...adminSettings, showPopup: !adminSettings.showPopup})}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${adminSettings.showPopup ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                       >
                         {adminSettings.showPopup ? 'Enabled' : 'Disabled'}
                       </button>
                    </div>
                    
                    <div className="space-y-4">
                       <input 
                         type="text" 
                         value={adminSettings.popupTitle}
                         onChange={(e) => setAdminSettings({...adminSettings, popupTitle: e.target.value})}
                         placeholder="Popup Title"
                         className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                       />
                       <textarea 
                         value={adminSettings.popupMessage}
                         onChange={(e) => setAdminSettings({...adminSettings, popupMessage: e.target.value})}
                         placeholder="Popup Message Content"
                         rows={4}
                         className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                       />
                    </div>
                 </div>

                 <button className="w-full md:w-auto flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs px-10 py-5 rounded-2xl transition-all shadow-xl shadow-indigo-600/30">
                    <Save size={18} /> Deploy All Settings
                 </button>
              </div>
            )}

            {adminTab === 'social' && (
              <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Facebook</label>
                       <div className="relative">
                          <Facebook className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            type="text" 
                            value={adminSettings.facebookLink}
                            onChange={(e) => setAdminSettings({...adminSettings, facebookLink: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                          />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Twitter / X</label>
                       <div className="relative">
                          <Twitter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            type="text" 
                            value={adminSettings.twitterLink}
                            onChange={(e) => setAdminSettings({...adminSettings, twitterLink: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-blue-400/50 outline-none transition-all"
                          />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">GitHub Repository</label>
                    <div className="relative">
                       <Github className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                       <input 
                         type="text" 
                         value={adminSettings.githubLink}
                         onChange={(e) => setAdminSettings({...adminSettings, githubLink: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-slate-400/50 outline-none transition-all"
                       />
                    </div>
                 </div>
                 <button className="w-full md:w-auto flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs px-10 py-5 rounded-2xl transition-all border border-white/10">
                    <Save size={18} /> Update Social Profiles
                 </button>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-500/30">
      {/* Global Top Banner Notification */}
      {adminSettings.showNotification && (
        <div className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.25em] py-3 px-6 flex items-center justify-center gap-4 text-center">
           <Bell size={14} className="animate-bounce" />
           {adminSettings.notificationMessage}
        </div>
      )}

      {/* Main Popup Notification Overlay */}
      {!isAdminMode && adminSettings.showPopup && !popupDismissed && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="glass max-w-lg w-full p-8 md:p-14 rounded-[32px] md:rounded-[40px] border border-indigo-500/20 shadow-[0_0_50px_rgba(79,70,229,0.15)] relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 delay-150">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              
              <button 
                onClick={() => setPopupDismissed(true)} 
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X size={20} />
              </button>

              <div className="text-center">
                 <div className="w-16 h-16 bg-indigo-600/10 rounded-[24px] flex items-center justify-center text-indigo-400 mx-auto mb-6 border border-indigo-500/20 shadow-inner">
                    <Megaphone size={32} className="animate-pulse" />
                 </div>
                 <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-4 text-white">{adminSettings.popupTitle}</h3>
                 <div className="w-12 h-1 bg-indigo-500/30 mx-auto mb-6 rounded-full"></div>
                 <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed mb-8 px-2 md:px-4">
                    {adminSettings.popupMessage}
                 </p>
                <a
  href={adminSettings.facebookLink}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all mb-6"
  title="Message on Facebook"
>
  <Facebook size={18} />
</a>

                 <button 
                  onClick={() => setPopupDismissed(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] py-5 rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 active:scale-[0.98]"
                 >
                    Accept & Proceed <ChevronRight size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Mobile Tools Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[130] bg-slate-950/95 md:hidden p-6 overflow-y-auto animate-in fade-in slide-in-from-right duration-300">
           <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-widest text-blue-400">Toolkit</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 hover:text-white p-2">
                 <X size={24} />
              </button>
           </div>
           <div className="space-y-2">
              {TOOLS.map((tool) => {
                const disabled = isToolDisabled(tool.id);
                return (
                  <button
                    key={tool.id}
                    disabled={disabled}
                    onClick={() => { setSelectedTool(tool); reset(); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-xl text-sm font-bold transition-all ${
                      selectedTool?.id === tool.id 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : disabled ? 'opacity-40 grayscale pointer-events-none' : 'bg-white/5 text-slate-400 border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                       {getIcon(tool.icon, 18)}
                       {tool.name}
                    </div>
                    {disabled && <ShieldAlert size={14} />}
                  </button>
                );
              })}
           </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5 px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => { setSelectedTool(null); reset(); }}>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-xl tracking-tight leading-tight">{BRAND.name}</h1>
            <p className="text-[8px] md:text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none hidden sm:block">by {BRAND.company}</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {['all', 'image', 'pdf', 'ai'].map((cat) => (
            <button 
              key={cat}
              onClick={() => { setActiveCategory(cat); setSelectedTool(null); }}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          <a 
            href={adminSettings.bkashLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-pink-500/10 hover:bg-pink-500 text-pink-500 hover:text-white px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-pink-500/20 transition-all text-[8px] md:text-[10px] font-black uppercase tracking-widest group shadow-lg"
          >
            <Coffee size={14} className="group-hover:animate-spin" /> <span className="hidden sm:inline">Donate</span>
          </a>
          <button 
            onClick={() => setShowLogin(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all border border-white/5"
          >
            PRO
          </button>
        </div>
      </header>

      {/* Login Overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-[140] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="glass max-w-sm w-full p-8 md:p-10 rounded-[32px] md:rounded-[40px] border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowLogin(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
              <div className="text-center mb-8">
                 <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto mb-6 border border-white/10">
                    <Lock size={24} />
                 </div>
                 <h3 className="text-xl font-black tracking-tight mb-2">Admin Access</h3>
                 <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">Enter secure code to proceed</p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                 <input 
                   type="password" 
                   value={loginPass}
                   onChange={(e) => setLoginPass(e.target.value)}
                   placeholder="Access Code"
                   autoFocus
                   className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-lg tracking-[0.5em] focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:tracking-normal"
                 />
                 <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] py-5 rounded-2xl transition-all shadow-xl shadow-indigo-600/30">
                    Open Terminal
                 </button>
              </form>
           </div>
        </div>
      )}

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar - Desktop Only */}
        <aside className="w-full md:w-72 lg:w-80 border-r border-white/5 bg-slate-950/50 overflow-y-auto hidden md:block">
          <div className="p-6">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Toolkit Explorer</h2>
            <div className="space-y-1">
              {TOOLS.map((tool) => {
                const disabled = isToolDisabled(tool.id);
                return (
                  <button
                    key={tool.id}
                    disabled={disabled}
                    onClick={() => { setSelectedTool(tool); reset(); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                      selectedTool?.id === tool.id 
                        ? 'bg-blue-600/10 text-blue-400 ring-1 ring-blue-500/30' 
                        : disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       <span className={`${selectedTool?.id === tool.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {getIcon(tool.icon, 18)}
                      </span>
                      {tool.name}
                    </div>
                    {disabled && <ShieldAlert size={14} className="text-slate-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 tool-grid-gradient">
          {!selectedTool ? (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="mb-12 md:mb-16">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight leading-tight">
                  RenonX AI Studio <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-400">Intelligent Orchestrator.</span>
                </h2>
                <p className="text-slate-400 text-base md:text-lg max-w-xl">
                  Production-grade processing engine for digital assets. Leveraging high-precision neural vision for pixel-perfect segmentation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {filteredTools.map((tool) => {
                  const disabled = isToolDisabled(tool.id);
                  return (
                    <button
                      key={tool.id}
                      disabled={disabled}
                      onClick={() => { setSelectedTool(tool); reset(); }}
                      className={`group relative p-6 md:p-8 rounded-[24px] md:rounded-[32px] bg-slate-900/40 border transition-all text-left ${
                        disabled ? 'opacity-50 grayscale border-white/5 cursor-not-allowed' : 'border-white/5 hover:border-blue-500'
                      }`}
                    >
                      <div className="relative z-10">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center mb-5 md:mb-6 transition-all ${
                          disabled ? 'bg-slate-800 text-slate-600' : 'bg-slate-800/50 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'
                        }`}>
                          {getIcon(tool.icon, 24)}
                        </div>
                        <div className="flex items-center justify-between mb-2">
                           <h3 className={`text-lg md:text-xl font-bold ${disabled ? 'text-slate-600' : 'text-white'}`}>{tool.name}</h3>
                           {disabled && <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">OFFLINE</span>}
                        </div>
                        <p className={`text-xs md:text-sm mb-6 ${disabled ? 'text-slate-700' : 'text-slate-400'}`}>{tool.description}</p>
                        {!disabled && (
                          <div className="flex items-center text-[10px] font-black text-blue-500 uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            Launch engine <ChevronRight size={14} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto animate-in fade-in">
              <div className="flex items-center gap-2 text-slate-500 mb-6 md:mb-8 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                <button onClick={() => setSelectedTool(null)} className="hover:text-white">Workspace</button>
                <ChevronRight size={14} />
                <span className="text-blue-400 truncate">{selectedTool.name}</span>
              </div>

              {isToolDisabled(selectedTool.id) ? (
                 <div className="glass rounded-[32px] md:rounded-[40px] p-12 md:p-20 text-center flex flex-col items-center border border-red-500/10">
                    <ShieldAlert size={64} className="text-red-500 mb-8 opacity-20" />
                    <h2 className="text-xl md:text-2xl font-black mb-4">Tool Temporarily Offline</h2>
                    <p className="text-slate-500 text-sm max-w-sm mb-10">The admin has temporarily disabled this engine for maintenance. Please check back later or try another tool.</p>
                    <button onClick={() => setSelectedTool(null)} className="bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl border border-white/5 transition-all">Back to Home</button>
                 </div>
              ) : (
                <div className="glass rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl border border-white/10">
                  <div className="p-6 md:p-14">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 md:mb-12">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-14 h-14 md:w-20 md:h-20 rounded-[20px] md:rounded-3xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                          {getIcon(selectedTool.icon, 32)}
                        </div>
                        <div>
                          <h2 className="text-xl md:text-3xl font-black mb-2 tracking-tight">{selectedTool.name}</h2>
                          <p className="text-slate-400 text-xs md:text-sm max-w-sm">{selectedTool.description}</p>
                        </div>
                      </div>
                      
                      {files.length > 0 && !isProcessing && !lastResponse && (
                        <button 
                          onClick={handleProcess}
                          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] px-10 py-5 rounded-2xl transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95"
                        >
                          Execute Process <ChevronRight size={18} />
                        </button>
                      )}
                    </div>

                    {!lastResponse && (
                      <div className="space-y-8 md:space-y-10">
                        {selectedTool.id === 'image_convert' && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Select Output Format</label>
                            <div className="flex flex-wrap gap-2 md:gap-3">
                              {['image/png', 'image/jpeg', 'image/webp'].map((val) => (
                                <button
                                  key={val}
                                  onClick={() => setTargetFormat(val)}
                                  className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border transition-all text-[10px] font-bold uppercase tracking-widest ${
                                    targetFormat === val ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {targetFormat === val && <CheckCircle2 size={12} />}
                                  {val.split('/')[1].toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedTool.id === 'split_pdf' && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Split Configuration</label>
                            <div className="relative">
                               <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
                                  <Scissors size={18} />
                               </div>
                               <input 
                                 type="text" 
                                 value={splitRange}
                                 onChange={(e) => setSplitRange(e.target.value)}
                                 placeholder="e.g. 1, 3-5, 8"
                                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                               />
                            </div>
                          </div>
                        )}

                        <div className="relative group">
                          <input 
                            type="file" 
                            multiple={selectedTool.inputs === 'multiple'} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))}
                          />
                          <div className="border-2 border-dashed border-white/10 rounded-[24px] md:rounded-[32px] p-10 md:p-16 transition-all text-center flex flex-col items-center group-hover:border-blue-500/40 group-hover:bg-blue-500/5">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 text-slate-400 group-hover:scale-110 transition-all">
                              <Plus size={28} />
                            </div>
                            <h4 className="text-lg md:text-xl font-bold mb-2">{files.length > 0 ? 'Add more files' : 'Drop source files'}</h4>
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                              {selectedTool.inputs === 'multiple' ? 'Batch Mode' : 'Single Target'}
                            </p>
                          </div>
                        </div>

                        {files.length > 0 && (
                          <div className="space-y-2 md:space-y-3">
                            {files.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 md:p-5 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400">
                                    {file.type.includes('image') ? <ImageIcon size={18} /> : <FileText size={18} />}
                                  </div>
                                  <div className="overflow-hidden">
                                    <div className="text-xs md:text-sm font-bold text-slate-200 truncate max-w-[140px] md:max-w-[200px]">{file.name}</div>
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                  </div>
                                </div>
                                <button onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {isProcessing && (
                      <div className="py-20 md:py-24 flex flex-col items-center text-center space-y-8">
                         <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin"></div>
                         <h4 className="text-lg md:text-xl font-black uppercase tracking-widest animate-pulse">Orchestrating Process...</h4>
                      </div>
                    )}

                    {lastResponse && (
                      <div className="animate-in fade-in slide-in-from-bottom-8 space-y-8">
                        {lastResponse.status === 'success' ? (
                          <div className="space-y-8 text-center">
                             {lastResponse.output?.text ? (
                               <div className="space-y-6">
                                 <div className="flex items-center justify-between">
                                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resulting Analysis</h5>
                                    <button onClick={() => {navigator.clipboard.writeText(lastResponse.output?.text || ''); setCopied(true);}} className="text-blue-400 text-[10px] font-black uppercase">{copied ? 'Copied' : 'Copy Result'}</button>
                                 </div>
                                 <div className="glass p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-white/10 bg-slate-900/50 max-h-[400px] overflow-y-auto text-left">
                                    <pre className="text-xs md:text-sm font-medium text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{lastResponse.output.text}</pre>
                                 </div>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center gap-6 p-10 md:p-12 glass rounded-[32px] md:rounded-[40px] border border-emerald-500/20">
                                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                                     <Download size={28} />
                                  </div>
                                  <div>
                                     <h4 className="text-xl md:text-2xl font-black mb-1">Process Succeeded</h4>
                                     <p className="text-slate-500 text-xs md:text-sm">Final output generated successfully.</p>
                                  </div>
                                  <a 
                                    href={lastResponse.output?.download_url} 
                                    download={lastResponse.output?.filename}
                                    className="w-full md:w-auto bg-white text-slate-950 px-10 md:px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all shadow-xl active:scale-95"
                                  >
                                    Download File
                                  </a>
                               </div>
                             )}
                             <button onClick={reset} className="flex items-center gap-2 mx-auto text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                               <RotateCcw size={16} /> New Session
                             </button>
                          </div>
                        ) : (
                          <div className="bg-red-500/10 border border-red-500/20 p-8 md:p-12 rounded-[32px] md:rounded-[40px] text-center space-y-6">
                            <AlertCircle size={40} className="text-red-500 mx-auto" />
                            <h4 className="text-xl md:text-2xl font-black text-red-400">Execution Error</h4>
                            <p className="text-slate-300 font-medium text-sm">{lastResponse.error?.message}</p>
                            <button onClick={() => setLastResponse(null)} className="w-full md:w-auto bg-red-500 hover:bg-red-400 text-white font-black uppercase tracking-widest text-[10px] px-10 py-5 rounded-2xl transition-all">Try Again</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="glass border-t border-white/5 px-6 md:px-8 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:gap-10">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest font-black text-center md:text-left">&copy; 2024 {BRAND.company} • V{BRAND.version}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Core developed by <span className="text-indigo-400">{BRAND.developer}</span></div>
          </div>
          
          <div className="flex items-center gap-6">
             <a href={adminSettings.facebookLink} className="text-slate-500 hover:text-blue-500 transition-colors"><Facebook size={20} /></a>
             <a href={adminSettings.twitterLink} className="text-slate-500 hover:text-blue-400 transition-colors"><Twitter size={20} /></a>
             <a href={adminSettings.githubLink} className="text-slate-500 hover:text-white transition-colors"><Github size={20} /></a>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-black uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
            Core Systems Active
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
