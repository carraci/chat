import React, { useRef, useState, useEffect } from 'react';
import {
  Paperclip,
  Send,
  X,
  Mic,
  MicOff,
  Image,
  FileText,
  File,
  Loader2
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, file?: File | null) => Promise<void>;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Manage file preview URL
  useEffect(() => {
    if (!selectedFile) {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
      return;
    }

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreviewUrl(null);
    }
  }, [selectedFile]);

  // Speech recognition setup if available
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;
    if (isLoading) return;

    const fileToSend = selectedFile;
    const textToSend = trimmed;

    // Reset input immediately
    setText('');
    removeFile();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(textToSend, fileToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Adjust textarea height dynamically
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 140) + 'px';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-t bg-white transition-colors ${
        isDragOver ? 'bg-indigo-50/70 border-indigo-400' : 'border-gray-200'
      }`}
    >
      {/* Drag overlay notice */}
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-indigo-200 text-indigo-700 text-sm font-semibold flex items-center gap-2">
            <Paperclip className="w-4 h-4 animate-bounce" />
            Drop file to attach
          </div>
        </div>
      )}

      {/* Selected file preview pill */}
      {selectedFile && (
        <div className="px-4 py-2.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 truncate mr-2">
            {filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt="Selected"
                className="w-9 h-9 object-cover rounded-lg border border-indigo-200 shadow-xs shrink-0"
              />
            ) : selectedFile.type.includes('pdf') ? (
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <File className="w-4 h-4" />
              </div>
            )}
            <div className="truncate">
              <span className="font-semibold text-indigo-950 truncate block">
                {selectedFile.name}
              </span>
              <span className="text-[11px] text-indigo-600 font-medium">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="p-1 hover:bg-indigo-200/60 text-indigo-700 rounded-lg transition-colors shrink-0"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="p-3 flex items-end gap-2 max-w-4xl mx-auto">
        {/* Attach File Button */}
        <label
          className="cursor-pointer text-gray-500 hover:text-indigo-600 p-2.5 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
          title="Attach image, document, or PDF"
        >
          <Paperclip className="w-5 h-5" />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md,.js,.ts,.py"
          />
        </label>

        {/* Text Area */}
        <div className="flex-1 relative flex items-center">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedFile
                ? "Add instructions for this file (or press Send)..."
                : "Type a message... (Shift+Enter for newline)"
            }
            rows={1}
            disabled={isLoading}
            className="w-full text-sm py-2.5 px-3.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-36 text-gray-900 transition-all placeholder-gray-400"
          />
        </div>

        {/* Dictation / Microphone button */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-2.5 rounded-xl transition-colors shrink-0 ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse'
              : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'
          }`}
          title={isListening ? 'Listening... click to stop' : 'Voice input'}
        >
          {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || (!text.trim() && !selectedFile)}
          className={`flex items-center justify-center p-2.5 rounded-xl text-white font-medium shadow-xs transition-all shrink-0 ${
            isLoading || (!text.trim() && !selectedFile)
              ? 'bg-indigo-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
          }`}
          title="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};
