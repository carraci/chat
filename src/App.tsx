import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  AlertCircle,
  FileUp,
  MessageSquare,
  HelpCircle,
  Code2,
  Lightbulb,
  FileText
} from 'lucide-react';
import { ChatHeader } from './components/ChatHeader';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { ImageModal } from './components/ImageModal';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { ChatMessage, ChatMode, ServerStatus } from './types/chat';
import { playSendChime, playReceiveChime } from './utils/audio';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('chat_sound') !== 'false';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeImage, setActiveImage] = useState<{ url: string; name?: string | null } | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load server status & messages on initial mount
  useEffect(() => {
    fetchStatus();
    loadMessages();
  }, []);

  // Auto-scroll when messages change or loading state changes
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isLoading]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch server status:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setMessages(data);
      } else {
        setApiError('Unable to load chat history from database.');
      }
    } catch (err: any) {
      setApiError('Failed to connect to backend server. Make sure it is running.');
    }
  };

  const handleSendMessage = async (text: string, file?: File | null) => {
    if (!text && !file) return;

    setApiError(null);
    playSendChime(!soundEnabled);

    // Optimistic user message preview
    const tempUserId = Date.now();
    const tempUserMessage: ChatMessage = {
      id: tempUserId,
      sender: 'user',
      text,
      file_name: file ? file.name : null,
      file_url: file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      file_type: file ? file.type : null,
      file_size: file ? file.size : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      edited: false,
      mode
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('mode', mode);
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();

      // Refresh chat list with server-authoritative data
      if (data.user_message && data.bot_message) {
        setMessages((prev) => {
          // Replace optimistic message with actual DB persisted messages
          const filtered = prev.filter((m) => m.id !== tempUserId);
          return [...filtered, data.user_message, data.bot_message];
        });
      } else {
        await loadMessages();
      }

      playReceiveChime(!soundEnabled);
    } catch (err: any) {
      console.error('Chat error:', err);
      setApiError(err.message || 'Failed to send message.');
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
    } finally {
      setIsLoading(false);
      fetchStatus();
    }
  };

  const handleEditMessage = async (id: number, newText: string, regenerate?: boolean) => {
    try {
      setApiError(null);
      if (regenerate) setIsLoading(true);

      const res = await fetch(`/api/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText, regenerate })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update message');
      }

      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === id) return data.message;
          if (data.regeneratedBotMessage && m.id === data.regeneratedBotMessage.id) {
            return data.regeneratedBotMessage;
          }
          return m;
        })
      );

      // If a new bot message was created instead of updating an existing one:
      if (data.regeneratedBotMessage && !messages.some((m) => m.id === data.regeneratedBotMessage.id)) {
        setMessages((prev) => [...prev, data.regeneratedBotMessage]);
      }

      if (regenerate) playReceiveChime(!soundEnabled);
    } catch (err: any) {
      setApiError(err.message || 'Error updating message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      setApiError(null);
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete message');

      setMessages((prev) => prev.filter((m) => m.id !== id));
      fetchStatus();
    } catch (err: any) {
      setApiError(err.message || 'Error deleting message');
    }
  };

  const handleClearAll = async () => {
    try {
      setIsClearing(true);
      const res = await fetch('/api/messages/clear', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear chat history');

      setMessages([]);
      setShowClearModal(false);
      fetchStatus();
    } catch (err: any) {
      setApiError(err.message || 'Error clearing chat');
    } finally {
      setIsClearing(false);
    }
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('chat_sound', String(next));
      return next;
    });
  };

  const handleExport = (format: 'json' | 'markdown' | 'txt') => {
    let content = '';
    let mimeType = 'text/plain';
    let fileExtension = format;

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2);
      mimeType = 'application/json';
    } else if (format === 'markdown') {
      content = `# Chat Transcript - Smart Assistant\nExported: ${new Date().toLocaleString()}\n\n---\n\n` +
        messages
          .map((m) => {
            const sender = m.sender === 'user' ? '### 👤 User' : '### 🤖 Smart Assistant';
            const fileInfo = m.file_name ? `\n*📎 Attached File: ${m.file_name}*` : '';
            return `${sender} (${m.timestamp})${m.edited ? ' *(edited)*' : ''}\n\n${m.text}${fileInfo}\n\n---`;
          })
          .join('\n\n');
      mimeType = 'text/markdown';
    } else {
      content = `Smart Assistant Chat Transcript\nExported: ${new Date().toLocaleString()}\n\n` +
        messages
          .map((m) => `[${m.timestamp}] ${m.sender.toUpperCase()}: ${m.text}${m.file_name ? ` (Attached: ${m.file_name})` : ''}`)
          .join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-history-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          m.text.toLowerCase().includes(q) ||
          (m.file_name && m.file_name.toLowerCase().includes(q))
        );
      })
    : messages;

  // Prompt suggestions for quick start
  const promptSuggestions = [
    { title: 'Explain a Concept', prompt: 'Explain how neural networks learn in simple terms with an example.' },
    { title: 'Code Review & Help', prompt: 'Write a TypeScript function to debounce an API call and explain it.' },
    { title: 'File Analysis', prompt: 'I would like to upload a document or screenshot for you to analyze.' },
    { title: 'Creative Ideas', prompt: 'Give me 5 unique feature ideas for an AI-powered productivity app.' }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-0 sm:p-4">
      {/* Main Chat App Container */}
      <div className="w-full max-w-4xl bg-white sm:rounded-2xl shadow-xl flex flex-col h-screen sm:h-[94vh] overflow-hidden border border-gray-200/80">
        {/* Header */}
        <ChatHeader
          mode={mode}
          onModeChange={setMode}
          onClearAllClick={() => setShowClearModal(true)}
          serverStatus={serverStatus}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onExport={handleExport}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          messages={messages}
        />

        {/* Global Error Banner */}
        {apiError && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-700 flex items-center justify-between animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="font-bold underline hover:text-rose-900 ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search Results Indicator */}
        {searchQuery && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-xs text-indigo-800 flex items-center justify-between">
            <span>
              Found <strong>{filteredMessages.length}</strong> matching messages for "{searchQuery}"
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Show all messages
            </button>
          </div>
        )}

        {/* Chat Messages Body */}
        <div
          ref={chatContainerRef}
          className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 bg-gradient-to-b from-gray-50/50 to-white"
        >
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm border border-indigo-100">
                <Bot className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                {searchQuery ? 'No matching messages found' : 'Welcome to your Smart Assistant'}
              </h2>
              <p className="text-sm text-gray-500 max-w-md mt-1 mb-6">
                {searchQuery
                  ? 'Try searching with different keywords or clear the filter.'
                  : 'Start a conversation, attach images, PDFs, or documents, and manage your full chat history.'}
              </p>

              {!searchQuery && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full text-left">
                  {promptSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="p-3 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-all shadow-xs group"
                    >
                      <div className="text-xs font-bold text-gray-800 group-hover:text-indigo-600">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {item.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onImageClick={(url, name) => setActiveImage({ url, name })}
                isStreamingOrBusy={isLoading}
              />
            ))
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-gray-200 text-gray-600 px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                </div>
                <span className="text-xs font-medium text-gray-500 ml-1">
                  {mode === 'gemini' ? 'Gemini 3.8 is generating response...' : 'Assistant is typing...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      {/* Lightbox Image Preview Modal */}
      <ImageModal
        imageUrl={activeImage?.url || null}
        fileName={activeImage?.name}
        onClose={() => setActiveImage(null)}
      />

      {/* Clear All Confirmation Modal */}
      <ClearConfirmModal
        isOpen={showClearModal}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearModal(false)}
        isClearing={isClearing}
      />
    </div>
  );
}
