import React, { useRef, useState } from 'react';
import type { Category, Reference, ExtractedColor } from '../types';
import ReferenceItem from './ReferenceItem';

const COLOR_ROLE_STYLE: Record<string, string> = {
  base:   'bg-gray-100 text-gray-600',
  main:   'bg-blue-100 text-blue-700',
  accent: 'bg-amber-100 text-amber-700',
};
const COLOR_ROLE_LABEL: Record<string, string> = {
  base:   'ベース',
  main:   'メイン',
  accent: 'アクセント',
};

interface CategorySectionProps {
  category: Category;
  isStyleGuideCategory?: boolean;
  isColorCategory?: boolean;
  extractedColors?: ExtractedColor[] | null;
  isExtractingColors?: boolean;
  onAddUrl: () => void;
  onAddImage: (file: File) => void;
  onUpdateRef: (refId: string, updates: Partial<Omit<Reference, 'id' | 'type'>>) => void;
  onRemoveRef: (refId: string) => void;
  onExtractColors?: () => void;
  onClearExtractedColors?: () => void;
}

export default function CategorySection({
  category,
  isStyleGuideCategory,
  isColorCategory,
  extractedColors,
  isExtractingColors,
  onAddUrl,
  onAddImage,
  onUpdateRef,
  onRemoveRef,
  onExtractColors,
  onClearExtractedColors,
}: CategorySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasRefs = category.references.length > 0;
  const hasColors = extractedColors && extractedColors.length > 0;

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
              {isColorCategory && hasColors && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {extractedColors!.length}色抽出済み
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

          {/* Color extraction panel (colors category only) */}
          {isColorCategory && (
            <div className="mt-4">
              {/* Extract button */}
              {hasRefs && (
                <button
                  onClick={onExtractColors}
                  disabled={isExtractingColors}
                  className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:from-violet-600 hover:to-indigo-600 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isExtractingColors ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      色を抽出中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      {hasColors ? '色を再抽出する' : '色を抽出する'}
                    </>
                  )}
                </button>
              )}

              {/* Extracted colors display */}
              {hasColors && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">抽出済みカラー</span>
                    <button
                      onClick={onClearExtractedColors}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors duration-150"
                    >
                      クリア
                    </button>
                  </div>
                  {(['base', 'main', 'accent'] as const).map(role => {
                    const roleColors = extractedColors!.filter(c => c.role === role);
                    if (roleColors.length === 0) return null;
                    return (
                      <div key={role} className="mb-2.5 last:mb-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded mb-2 inline-block ${COLOR_ROLE_STYLE[role]}`}>
                          {COLOR_ROLE_LABEL[role]}
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {roleColors.map((color, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <div
                                className="w-7 h-7 rounded-md shadow-sm border border-gray-200 flex-shrink-0"
                                style={{ backgroundColor: color.hex }}
                                title={`${color.hex} · ${color.usage}`}
                              />
                              <div>
                                <div className="text-xs font-medium text-gray-700 leading-tight">{color.name}</div>
                                <div className="text-xs text-gray-400 leading-tight">{color.hex}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
