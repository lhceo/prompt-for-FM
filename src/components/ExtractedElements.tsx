import React from 'react';
import type { ExtractionResult, CategoryExtraction } from '../types';

interface ExtractedElementsProps {
  result: ExtractionResult;
  categoryLabels: Record<string, string>;
}

function ColorSwatch({ hex, name, usage }: { hex: string; name: string; usage: string }) {
  return (
    <div className="flex items-center gap-2 group">
      <div
        className="w-8 h-8 rounded-md shadow-sm flex-shrink-0 border border-gray-200"
        style={{ backgroundColor: hex }}
        title={hex}
      />
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-700 truncate">{name}</div>
        <div className="text-xs text-gray-400 truncate">{hex} · {usage}</div>
      </div>
    </div>
  );
}

function CategoryCard({ extraction, label }: { extraction: CategoryExtraction; label: string }) {
  const hasContent =
    extraction.summary ||
    (extraction.colors && extraction.colors.length > 0) ||
    (extraction.fonts && extraction.fonts.length > 0) ||
    (extraction.animations && extraction.animations.length > 0) ||
    extraction.layoutDescription;

  if (!hasContent) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
        {label}
      </h3>

      {extraction.summary && (
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{extraction.summary}</p>
      )}

      {extraction.styleKeywords && extraction.styleKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {extraction.styleKeywords.map((kw, i) => (
            <span key={i} className="tag">{kw}</span>
          ))}
        </div>
      )}

      {extraction.colors && extraction.colors.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">カラー</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {extraction.colors.map((color, i) => (
              <ColorSwatch key={i} {...color} />
            ))}
          </div>
        </div>
      )}

      {extraction.fonts && extraction.fonts.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">フォント</div>
          <div className="space-y-1">
            {extraction.fonts.map((font, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                  {font.family}
                </span>
                {font.weight && <span className="text-gray-400">w{font.weight}</span>}
                <span className="text-gray-500">{font.usage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {extraction.animations && extraction.animations.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">アニメーション</div>
          <div className="space-y-1">
            {extraction.animations.map((anim, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium text-gray-700">{anim.type}: </span>
                <span className="text-gray-500">{anim.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {extraction.layoutDescription && (
        <div className="mb-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">レイアウト</div>
          <p className="text-xs text-gray-600 leading-relaxed">{extraction.layoutDescription}</p>
        </div>
      )}

      {extraction.notes && (
        <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-700">{extraction.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function ExtractedElements({ result, categoryLabels }: ExtractedElementsProps) {
  const filledCategories = result.categories.filter(
    cat => cat.summary && cat.summary !== '参考資料が登録されていません'
  );

  return (
    <div className="space-y-6">
      {/* Overall style */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
        <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">
          全体的なスタイル
        </div>
        <p className="text-gray-800 font-medium leading-relaxed">{result.overallStyle}</p>
        <div className="mt-2 text-xs text-gray-400">
          分析日時: {new Date(result.generatedAt).toLocaleString('ja-JP')}
        </div>
      </div>

      {/* Category cards */}
      {filledCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            カテゴリ別の抽出結果
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filledCategories.map(cat => (
              <CategoryCard
                key={cat.categoryId}
                extraction={cat}
                label={categoryLabels[cat.categoryId] || cat.categoryId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
