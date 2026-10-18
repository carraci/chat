import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  fileName?: string | null;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, fileName, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 text-white border-b border-neutral-700">
          <span className="text-sm font-medium truncate max-w-xs md:max-w-md">
            {fileName || 'Image preview'}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download={fileName || 'download'}
              className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </a>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
              title="Open full size in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-neutral-950">
          <img
            src={imageUrl}
            alt={fileName || 'Attached file'}
            className="max-h-[80vh] max-w-full object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
