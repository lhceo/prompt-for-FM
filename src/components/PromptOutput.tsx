import React, { useState } from 'react';
import type { CategoryPrompt } from '../types';

interface PromptOutputProps {
  prompts: CategoryPrompt[];
  isGenerating: boolean;
  onGenerate: (additionalContext: string) => void;
}

function PromptCard({ categoryPrompt }: { categoryPrompt: CategoryPrompt }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(categoryPrompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-gray-300 text-xs font-medium ml-1">{categoryPrompt.label}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors duration-150 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              コピー済み
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              コピー
            </>
          )}
        </button>
      </div>
      <div className="p-4">
        <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">
          {categoryPrompt.prompt}
        </pre>
      </div>
    </div>
  );
}

export default function PromptOutput({ prompts, isGenerating, onGenerate }: PromptOutputProps) {
  const [additionalContext, setAdditionalContext] = useState('');

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
            {prompts.length > 0 ? '再生成する' : '項目別プロンプトを生成する'}
          </>
        )}
      </button>

      {/* Per-category prompts */}
      {prompts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            各プロンプトは対象の項目のみに特化しており、他のデザイン要素に影響しません。
          </p>
          {prompts.map(p => (
            <PromptCard key={p.categoryId} categoryPrompt={p} />
          ))}
        </div>
      )}
    </div>
  );
}
