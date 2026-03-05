import React, { useState, useCallback } from 'react';
import { useCategories } from './hooks/useCategories';
import CategorySection from './components/CategorySection';
import ExtractedElements from './components/ExtractedElements';
import PromptOutput from './components/PromptOutput';
import type { ExtractionResult, AnalyzeRequest, CategoryPrompt } from './types';

type AppStep = 'references' | 'extraction' | 'prompt';

// Categories used for style guide generation in Step 2
const STYLE_GUIDE_CATEGORY_IDS = ['visual-impression', 'colors', 'fonts', 'layout'];

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const {
    categories,
    addUrlReference,
    addImageReference,
    updateReference,
    removeReference,
    getTotalReferenceCount,
    getFilledCategoryCount,
  } = useCategories();

  const [step, setStep] = useState<AppStep>('references');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedPrompts, setGeneratedPrompts] = useState<CategoryPrompt[]>([]);

  const categoryLabels = Object.fromEntries(
    categories.map(c => [c.id, c.label])
  );

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      // Build request — convert image files to base64
      const requestCategories: AnalyzeRequest['categories'] = await Promise.all(
        categories
          .filter(c => c.references.length > 0)
          .map(async cat => ({
            id: cat.id,
            label: cat.label,
            labelEn: cat.labelEn,
            references: await Promise.all(
              cat.references.map(async ref => {
                if (ref.type === 'url') {
                  return {
                    type: 'url' as const,
                    url: ref.url,
                    comment: ref.comment,
                  };
                } else {
                  const base64 = ref.file ? await fileToBase64(ref.file) : undefined;
                  return {
                    type: 'image' as const,
                    imageBase64: base64,
                    imageMimeType: ref.file?.type,
                    fileName: ref.fileName,
                    comment: ref.comment,
                  };
                }
              })
            ),
          }))
      );

      const body: AnalyzeRequest = { categories: requestCategories };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result: ExtractionResult = await response.json();
      setExtraction(result);
      setStep('extraction');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '分析中にエラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
  }, [categories]);

  const handleGeneratePrompt = useCallback(async (additionalContext: string) => {
    if (!extraction) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction, additionalContext }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Prompt generation failed');
      }

      const data = await response.json();
      setGeneratedPrompts(data.prompts);
      setStep('prompt');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'プロンプト生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  }, [extraction]);

  const totalRefs = getTotalReferenceCount();
  const filledCats = getFilledCategoryCount();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Figma Make プロンプトジェネレーター
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                参考資料からFigma Make用の高品質プロンプトを生成
              </p>
            </div>

            {/* Step indicator */}
            <div className="hidden sm:flex items-center gap-2">
              {(['references', 'extraction', 'prompt'] as AppStep[]).map((s, i) => {
                const labels = ['参考登録', 'スタイルガイド', 'プロンプト'];
                const isActive = step === s;
                const isDone =
                  (s === 'references' && (step === 'extraction' || step === 'prompt')) ||
                  (s === 'extraction' && step === 'prompt');

                return (
                  <React.Fragment key={s}>
                    {i > 0 && <div className="w-6 h-px bg-gray-300" />}
                    <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : isDone
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                      {labels[i]}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Step 1: References */}
        {step === 'references' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Step 1：参考資料の登録</h2>
              <p className="text-sm text-gray-600">
                各カテゴリに参考となるWebサイトのURLまたは画像を登録してください。
                コメントで参考にすべき箇所を説明すると、より精度の高い分析ができます。
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                <span className="inline-flex items-center bg-violet-100 text-violet-600 text-xs px-1.5 py-0.5 rounded mr-1 font-medium">SG</span>
                のマークの項目はStep 2のスタイルガイド生成に使用されます
              </p>
            </div>

            {/* Progress summary */}
            {totalRefs > 0 && (
              <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center gap-3">
                <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-indigo-700">
                  <span className="font-semibold">{filledCats}カテゴリ</span>に
                  <span className="font-semibold"> {totalRefs}件</span>の参考資料が登録されています
                </p>
              </div>
            )}

            {/* Category sections */}
            <div className="space-y-3">
              {categories.map(cat => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  isStyleGuideCategory={STYLE_GUIDE_CATEGORY_IDS.includes(cat.id)}
                  onAddUrl={() => addUrlReference(cat.id)}
                  onAddImage={file => addImageReference(cat.id, file)}
                  onUpdateRef={(refId, updates) => updateReference(cat.id, refId, updates)}
                  onRemoveRef={refId => removeReference(cat.id, refId)}
                />
              ))}
            </div>

            {/* Analyze button */}
            <div className="mt-8 flex flex-col items-center gap-3">
              {analyzeError && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {analyzeError}
                </div>
              )}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || totalRefs === 0}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    AIが参考資料を分析中...（数分かかる場合があります）
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    参考資料をAIで分析する
                  </>
                )}
              </button>
              {totalRefs === 0 && (
                <p className="text-xs text-gray-400">少なくとも1つの参考資料を登録してください</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Extraction results + Style Guide */}
        {step === 'extraction' && extraction && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Step 2：スタイルガイド・抽出結果</h2>
                <p className="text-sm text-gray-600">
                  AIが参考資料から生成したスタイルガイドと抽出要素です。内容を確認してプロンプト生成に進みましょう。
                </p>
              </div>
              <button
                onClick={() => setStep('references')}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                参考資料に戻る
              </button>
            </div>

            <ExtractedElements result={extraction} categoryLabels={categoryLabels} />

            <div className="mt-8 flex flex-col items-center gap-3">
              {generateError && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {generateError}
                </div>
              )}
              <button
                onClick={() => setStep('prompt')}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-150 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                プロンプト生成へ進む
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Prompt generation */}
        {step === 'prompt' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Step 3：Figma Makeプロンプト生成</h2>
                <p className="text-sm text-gray-600">
                  項目ごとにスコープを絞ったプロンプトを生成します。それぞれ独立してFigma Makeで使用できます。
                </p>
              </div>
              <button
                onClick={() => setStep('extraction')}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                抽出結果に戻る
              </button>
            </div>

            <PromptOutput
              prompts={generatedPrompts}
              isGenerating={isGenerating}
              onGenerate={handleGeneratePrompt}
            />

            {generatedPrompts.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  Figma Makeへの貼り付け方
                </h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Figma Makeを開く</li>
                  <li>適用したい項目のプロンプトをコピーする</li>
                  <li>Figma Makeのプロンプト入力欄に貼り付けて実行する</li>
                  <li>複数の項目を適用する場合は順番に繰り返す</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
