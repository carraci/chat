import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Pencil,
  Trash2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Download
} from 'lucide-react';
import { ChatMessage } from '../types/chat';

interface MessageItemProps {
  message: ChatMessage;
  onEdit: (id: number, newText: string, regenerate?: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onImageClick: (url: string, name?: string | null) => void;
  isStreamingOrBusy?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onEdit,
  onDelete,
  onImageClick,
  isStreamingOrBusy
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isUser = message.sender === 'user';

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveEdit = async (regenerate = false) => {
    if (!editText.trim()) return;
    await onEdit(message.id, editText.trim(), regenerate);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(message.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  const getFileIcon = (fileName?: string | null, mime?: string | null) => {
    if (!fileName) return <File className="w-5 h-5 text-indigo-500" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json'].includes(ext || ''))
      return <FileCode className="w-5 h-5 text-amber-500" />;
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-500" />;
    return <FileText className="w-5 h-5 text-indigo-500" />;
  };

  const isImageFile = (fileName?: string | null, mime?: string | null) => {
    if (mime && mime.startsWith('image/')) return true;
    if (fileName && fileName.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) return true;
    return false;
  };

  return (
    <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs ${
          isUser
            ? 'bg-gradient-to-tr from-indigo-600 to-violet-500'
            : 'bg-gradient-to-tr from-slate-700 to-slate-900 border border-slate-600'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-emerald-400" />}
      </div>

      {/* Bubble Container */}
      <div className={`relative max-w-[85%] md:max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Name and Tag */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-semibold text-gray-500">
            {isUser ? 'You' : 'Smart Assistant'}
          </span>
          {message.mode && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                message.mode === 'gemini'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : message.mode === 'auto-responder'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {message.mode === 'gemini' ? 'Gemini 3.8' : message.mode === 'auto-responder' ? 'Auto-Reply' : 'Echo'}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`relative rounded-2xl p-4 shadow-xs transition-all ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-xs'
              : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs shadow-sm'
          }`}
        >
          {/* Action Toolbar on hover */}
          <div
            className={`absolute top-2 ${
              isUser ? 'left-2 -translate-x-full pr-2' : 'right-2 translate-x-full pl-2'
            } hidden group-hover:flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-gray-200 px-1.5 py-1 rounded-xl shadow-md z-10`}
          >
            {isUser && !isEditing && (
              <button
                onClick={() => {
                  setEditText(message.text);
                  setIsEditing(true);
                }}
                title="Edit message"
                className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleCopy}
              title={copied ? 'Copied' : 'Copy text'}
              className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {!isUser && (
              <button
                onClick={handleSpeech}
                title={isSpeaking ? 'Stop speech' : 'Read aloud'}
                className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                {isSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete message"
              className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Delete Confirmation mini overlay */}
          {showDeleteConfirm && (
            <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-2">
              <span>Delete this message?</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2 py-0.5 bg-rose-600 text-white rounded-md font-medium hover:bg-rose-700"
                >
                  {isDeleting ? '...' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300"
                >
                  No
                </button>
              </div>
            </div>
          )}

          {/* Uploaded File Media Preview */}
          {message.file_url && (
            <div className="mb-3">
              {isImageFile(message.file_name, message.file_type) ? (
                <div className="relative group/img overflow-hidden rounded-xl border border-black/10 cursor-pointer max-w-sm">
                  <img
                    src={message.file_url}
                    alt={message.file_name || 'Uploaded image'}
                    className="max-h-60 w-auto object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.02]"
                    onClick={() => onImageClick(message.file_url!, message.file_name)}
                  />
                  <div
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white font-medium text-xs gap-1"
                    onClick={() => onImageClick(message.file_url!, message.file_name)}
                  >
                    Click to enlarge
                  </div>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isUser
                      ? 'bg-indigo-800/40 border-indigo-400/30 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    {getFileIcon(message.file_name, message.file_type)}
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate">{message.file_name || 'Attachment'}</p>
                      {message.file_size && (
                        <p className={`text-[10px] ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {(message.file_size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={message.file_url}
                    download={message.file_name || 'file'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isUser
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Message Text or Inline Edit Mode */}
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[260px] md:min-w-[320px] text-gray-800">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 resize-y min-h-[70px]"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveEdit(false)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Save
                </button>
                {isUser && (
                  <button
                    onClick={() => handleSaveEdit(true)}
                    disabled={isStreamingOrBusy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                    title="Save edit and generate a fresh bot answer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Save & Regenerate
                  </button>
                )}
              </div>
            </div>
          ) : isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none text-gray-800 dark:prose-invert leading-relaxed space-y-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    return (
                      <code
                        className={`${className || ''} bg-gray-100 text-indigo-700 px-1 py-0.5 rounded-md font-mono text-xs`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre({ children }) {
                    return (
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-xs my-2 font-mono">
                        {children}
                      </pre>
                    );
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-4 space-y-1 my-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-4 space-y-1 my-1">{children}</ol>;
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0">{children}</p>;
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          )}

          {/* Footer timestamp and edited mark */}
          <div
            className={`mt-2 flex items-center justify-between text-[11px] ${
              isUser ? 'text-indigo-200' : 'text-gray-400'
            }`}
          >
            <div className="flex items-center gap-1">
              <span>{message.timestamp}</span>
              {message.edited && (
                <span className="italic opacity-80" title={`Edited ${message.edited_at || ''}`}>
                  (edited)
                </span>
              )}
            </div>
            {isUser && (
              <button
                onClick={() => {
                  setEditText(message.text);
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover:opacity-100 text-[10px] underline hover:text-white transition-opacity ml-2"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
