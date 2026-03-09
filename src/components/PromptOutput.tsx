import React, { useState } from 'react';
import type { CategoryPrompt } from '../types';

interface PromptOutputProps {
  prompts: CategoryPrompt[];
  globalStylePrompt?: string | null;
  isGenerating: boolean;
  onGenerate: (additionalContext: string) => void;
}

function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const base = size === 'md'
    ? 'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150'
    : 'flex items-center gap-1.5 text-xs px-3 py-1 rounded-md transition-colors duration-150';

  return (
    <button
      onClick={handleCopy}
      className={`${base} ${copied
        ? 'bg-green-600 text-white'
        : size === 'md'
          ? 'bg-amber-500 hover:bg-amber-400 text-white'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
      }`}
    >
      {copied ? (
        <>
          <svg className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          コピー済み
        </>
      ) : (
        <>
          <svg className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          コピー
        </>
      )}
    </button>
  );
}

function ComponentPromptCard({ categoryPrompt, index }: { categoryPrompt: CategoryPrompt; index: number }) {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-gray-400 text-xs ml-1">②-{index + 1}</span>
          <span className="text-gray-200 text-xs font-medium">{categoryPrompt.label}</span>
        </div>
        <CopyButton text={categoryPrompt.prompt} size="sm" />
      </div>
      <div className="p-4">
        <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">
          {categoryPrompt.prompt}
        </pre>
      </div>
    </div>
  );
}

export default function PromptOutput({ prompts, globalStylePrompt, isGenerating, onGenerate }: PromptOutputProps) {
  const [additionalContext, setAdditionalContext] = useState('');
  const hasResults = globalStylePrompt || prompts.length > 0;

  return (
    <div className="space-y-4">
      {/* Additional context input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          追加コンテキスト（任意）
        </label>
        <textarea
          value={additionalContext}
          onChange={e => setAdditionalContext(e.target.value)}
          placeholder="プロジェクトの特徴、ターゲット、特別な要件など追加情報があれば入力してください..."
          rows={3}
          className="input-field text-sm resize-none"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={() => onGenerate(additionalContext)}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            プロンプト生成中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {hasResults ? '再生成する' : '項目別プロンプトを生成する'}
          </>
        )}
      </button>

      {/* Two-tier prompt output */}
      {hasResults && (
        <div className="space-y-6 mt-2">

          {/* Tier 1: Global Style Prompt */}
          {globalStylePrompt && (
            <div>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3l14 9-14 9V3z" />
                  </svg>
                  ① 最初に適用
                </div>
                <div className="h-px flex-1 bg-amber-200" />
              </div>

              {/* Global style prompt card */}
              <div className="rounded-xl overflow-hidden border-2 border-amber-400 shadow-lg">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <span className="text-white text-sm font-bold">グローバルスタイル</span>
                    <span className="text-amber-100 text-xs">色・フォント・レイアウトの基盤</span>
                  </div>
                  <CopyButton text={globalStylePrompt} size="md" />
                </div>
                <div className="p-4 bg-gray-900">
                  <pre className="text-amber-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {globalStylePrompt}
                  </pre>
                </div>
              </div>

              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                このプロンプトをFigma Makeに最初に適用してください。全体の色・フォント・レイアウトの基準が確立されます。
              </p>
            </div>
          )}

          {/* Tier 2: Component Prompts */}
          {prompts.length > 0 && (
            <div>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-300">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  ② その後、各コンポーネントを適用
                </div>
                <div className="h-px flex-1 bg-indigo-200" />
              </div>

              <p className="mb-3 text-xs text-gray-500">
                各プロンプトはグローバルスタイルを継承し、対象コンポーネントの構造・配置のみを指定します。
              </p>

              <div className="space-y-3">
                {prompts.map((p, i) => (
                  <ComponentPromptCard key={p.categoryId} categoryPrompt={p} index={i} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
