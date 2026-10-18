import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  RotateCcw,
  Trash2,
  Download,
  Volume2,
  VolumeX,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  Info
} from 'lucide-react';
import { ChatMode, ServerStatus, ChatMessage } from '../types/chat';

interface ChatHeaderProps {
  mode: ChatMode;
  onModeChange: (newMode: ChatMode) => void;
  onClearAllClick: () => void;
  serverStatus: ServerStatus | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onExport: (format: 'json' | 'markdown' | 'txt') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  messages: ChatMessage[];
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  mode,
  onModeChange,
  onClearAllClick,
  serverStatus,
  soundEnabled,
  onToggleSound,
  onExport,
  searchQuery,
  onSearchChange,
  messages
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="bg-indigo-600 text-white p-4 shadow-md flex flex-col gap-3">
      {/* Top row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
            <Bot className="w-6 h-6 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight">Smart Assistant</h1>
              <span className="flex items-center gap-1 text-[11px] bg-indigo-500/80 px-2 py-0.5 rounded-full border border-indigo-400/40 text-indigo-100">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-indigo-200">
              Two-way chat, file uploads, editable history & AI responses
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="relative inline-block text-left">
            <select
              value={mode}
              onChange={(e) => onModeChange(e.target.value as ChatMode)}
              className="appearance-none bg-indigo-700/90 hover:bg-indigo-700 text-xs text-white font-medium pl-3 pr-7 py-2 rounded-xl border border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer shadow-xs"
              title="Select Chatbot Engine"
            >
              <option value="gemini" className="bg-slate-900 text-white">
                ✨ Gemini 3.8 Flash AI
              </option>
              <option value="auto-responder" className="bg-slate-900 text-white">
                🤖 Built-in Auto-Responder
              </option>
              <option value="echo" className="bg-slate-900 text-white">
                🔁 Echo / Test Mode
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-indigo-300 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Search Toggle */}
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) onSearchChange('');
            }}
            className={`p-2 rounded-xl transition-colors ${
              showSearch ? 'bg-white text-indigo-700' : 'bg-indigo-700/80 text-white hover:bg-indigo-700'
            }`}
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 text-white transition-colors"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-indigo-300" />}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 text-white transition-colors"
              title="Export conversation"
            >
              <Download className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 text-gray-800 text-xs animate-in fade-in zoom-in-95"
                onClick={() => setShowExportMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Export Chat As
                </div>
                <button
                  onClick={() => onExport('json')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between"
                >
                  <span>JSON Database</span>
                  <span className="text-[10px] text-gray-400">.json</span>
                </button>
                <button
                  onClick={() => onExport('markdown')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between"
                >
                  <span>Markdown Transcript</span>
                  <span className="text-[10px] text-gray-400">.md</span>
                </button>
                <button
                  onClick={() => onExport('txt')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between"
                >
                  <span>Plain Text</span>
                  <span className="text-[10px] text-gray-400">.txt</span>
                </button>
              </div>
            )}
          </div>

          {/* Clear All Chat Button */}
          <button
            onClick={onClearAllClick}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 text-xs bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 text-white px-3 py-2 rounded-xl shadow-xs font-semibold transition-colors shrink-0"
            title="Clear all chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar (when opened) */}
      {showSearch && (
        <div className="relative animate-in slide-in-from-top-2 duration-150">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search words, files, or messages in history..."
            className="w-full bg-indigo-700/90 text-white placeholder-indigo-300 text-xs px-3.5 py-2 pl-9 rounded-xl border border-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-white/50"
            autoFocus
          />
          <Search className="w-4 h-4 text-indigo-300 absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-2 text-indigo-200 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Sub-bar: Status details */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-indigo-200 border-t border-indigo-500/40 pt-2 gap-2">
        <div className="flex items-center gap-3">
          <span>
            Engine: <strong className="text-white capitalize">{mode.replace('-', ' ')}</strong>
          </span>
          {mode === 'gemini' && (
            <span className="flex items-center gap-1">
              {serverStatus?.hasGeminiKey ? (
                <span className="text-emerald-300 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Gemini 3.8 Flash Active
                </span>
              ) : (
                <span className="text-amber-200 font-medium flex items-center gap-1" title="API key automatically managed in AI Studio Secrets">
                  <Info className="w-3 h-3" /> Auto-Responder Active (Gemini key pending)
                </span>
              )}
            </span>
          )}
        </div>
        <div>
          <span>{messages.length} messages in database</span>
        </div>
      </div>
    </div>
  );
};
