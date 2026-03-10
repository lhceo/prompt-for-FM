import React from 'react';
import type { ExtractionResult, CategoryExtraction, StyleGuide } from '../types';

interface ExtractedElementsProps {
  result: ExtractionResult;
  categoryLabels: Record<string, string>;
}

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

function ColorSwatch({ hex, name, role, usage }: { hex: string; name: string; role?: string; usage: string }) {
  return (
    <div className="flex items-center gap-2 group">
      <div
        className="w-8 h-8 rounded-md shadow-sm flex-shrink-0 border border-gray-200"
        style={{ backgroundColor: hex }}
        title={hex}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-xs font-medium text-gray-700 truncate">{name}</div>
          {role && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${COLOR_ROLE_STYLE[role] ?? 'bg-gray-100 text-gray-600'}`}>
              {COLOR_ROLE_LABEL[role] ?? role}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 truncate">{hex} · {usage}</div>
      </div>
    </div>
  );
}

function StyleGuideSection({ guide }: { guide: StyleGuide }) {

  return (
    <div className="bg-white rounded-xl border border-violet-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-5 py-3 border-b border-violet-100 flex items-center gap-2">
        <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-medium">SG</span>
        <h3 className="font-semibold text-gray-900 text-sm">スタイルガイド</h3>
        <span className="text-xs text-gray-400 ml-auto">見た目の印象・色・フォント・レイアウトから生成</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Concept & Mood */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guide.concept && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">デザインコンセプト</div>
              <p className="text-sm text-gray-700 leading-relaxed">{guide.concept}</p>
            </div>
          )}
          {guide.designMood && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">ムード・トーン</div>
              <p className="text-sm text-gray-700 leading-relaxed">{guide.designMood}</p>
            </div>
          )}
        </div>

        {/* Color Palette */}
        {guide.colorPalette && guide.colorPalette.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">カラーパレット</div>
            <div className="flex flex-wrap gap-3">
              {guide.colorPalette.map((color, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-lg shadow-sm border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                    title={color.hex}
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-700">{color.name}</div>
                    <div className="text-xs text-gray-400">{color.hex}</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${COLOR_ROLE_STYLE[color.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {COLOR_ROLE_LABEL[color.role] ?? color.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Typography & Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guide.typography && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">タイポグラフィ</div>
              <p className="text-xs text-gray-600 leading-relaxed">{guide.typography}</p>
            </div>
          )}
          {guide.layoutPrinciples && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">レイアウト方針</div>
              <p className="text-xs text-gray-600 leading-relaxed">{guide.layoutPrinciples}</p>
            </div>
          )}
        </div>
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

      {/* Style Guide */}
      {result.styleGuide && (
        <StyleGuideSection guide={result.styleGuide} />
      )}

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
                label={categoryLabels[cat.categoryId] || cat.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
