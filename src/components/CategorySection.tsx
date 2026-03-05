import React, { useRef, useState } from 'react';
import type { Category, Reference } from '../types';
import ReferenceItem from './ReferenceItem';

interface CategorySectionProps {
  category: Category;
  isStyleGuideCategory?: boolean;
  onAddUrl: () => void;
  onAddImage: (file: File) => void;
  onUpdateRef: (refId: string, updates: Partial<Omit<Reference, 'id' | 'type'>>) => void;
  onRemoveRef: (refId: string) => void;
}

export default function CategorySection({
  category,
  isStyleGuideCategory,
  onAddUrl,
  onAddImage,
  onUpdateRef,
  onRemoveRef,
}: CategorySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasRefs = category.references.length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => onAddImage(file));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/')
    );
    files.forEach(file => onAddImage(file));
  };

  return (
    <div className="category-card">
      {/* Header */}
      <button
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-150"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasRefs ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{category.label}</span>
              <span className="text-xs text-gray-400">{category.labelEn}</span>
              {isStyleGuideCategory && (
                <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-medium">SG</span>
              )}
              {hasRefs && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {category.references.length}件
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* References list */}
          {category.references.length > 0 && (
            <div className="mt-3 space-y-3">
              {category.references.map(ref => (
                <ReferenceItem
                  key={ref.id}
                  reference={ref}
                  onUpdate={updates => onUpdateRef(ref.id, updates)}
                  onRemove={() => onRemoveRef(ref.id)}
                />
              ))}
            </div>
          )}

          {/* Add buttons */}
          <div
            className={`mt-3 flex flex-wrap gap-2 ${isDragOver ? 'opacity-50' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <button
              onClick={onAddUrl}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-dashed border-indigo-300 hover:border-indigo-500 rounded-lg px-3 py-2 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              URLを追加
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-medium border border-dashed border-emerald-300 hover:border-emerald-500 rounded-lg px-3 py-2 transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              画像を追加
            </button>

            {isDragOver && (
              <span className="text-xs text-gray-500 self-center">ドロップして追加</span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {!hasRefs && (
            <p className="mt-3 text-xs text-gray-400 text-center py-2">
              URLまたは画像を追加して参考資料を登録してください
            </p>
          )}
        </div>
      )}
    </div>
  );
}
