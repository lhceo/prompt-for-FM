import React from 'react';
import type { Reference } from '../types';

type ReferenceUpdates = { url?: string; comment?: string };

interface ReferenceItemProps {
  reference: Reference;
  onUpdate: (updates: ReferenceUpdates) => void;
  onRemove: () => void;
}

export default function ReferenceItem({ reference, onUpdate, onRemove }: ReferenceItemProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 group">
      <div className="flex items-start gap-3">
        {/* Left: icon or image preview */}
        <div className="flex-shrink-0 mt-1">
          {reference.type === 'url' ? (
            <div className="w-8 h-8 bg-indigo-100 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          ) : (
            reference.previewUrl ? (
              <img
                src={reference.previewUrl}
                alt={reference.fileName}
                className="w-12 h-12 object-cover rounded-md border border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 bg-green-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )
          )}
        </div>

        {/* Right: form */}
        <div className="flex-1 min-w-0">
          {reference.type === 'url' ? (
            <input
              type="url"
              value={reference.url}
              onChange={e => onUpdate({ url: e.target.value })}
              placeholder="https://example.com"
              className="input-field mb-2 text-sm"
            />
          ) : (
            <div className="text-sm text-gray-600 mb-2 truncate font-medium">
              {reference.fileName}
            </div>
          )}
          <textarea
            value={reference.comment}
            onChange={e => onUpdate({ comment: e.target.value })}
            placeholder="参考にすべき箇所や要素について説明してください..."
            rows={2}
            className="input-field text-sm resize-none"
          />
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-gray-400 hover:text-red-500 mt-1"
          title="削除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
