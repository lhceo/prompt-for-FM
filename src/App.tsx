import React, { useState, useCallback, useEffect } from 'react';
import { useCategories } from './hooks/useCategories';
import CategorySection from './components/CategorySection';
import ExtractedElements from './components/ExtractedElements';
import PromptOutput from './components/PromptOutput';
import type { ExtractionResult, AnalyzeRequest, CategoryPrompt, ProjectContext, ColorPaletteData } from './types';

type AppStep = 'references' | 'extraction' | 'prompt';

// Categories used for style guide generation in Step 2
const STYLE_GUIDE_CATEGORY_IDS = ['visual-impression', 'colors', 'fonts', 'layout'];

// Category groups for Step 1 display
const CATEGORY_GROUPS: { label: string; ids: string[]; icon: React.ReactNode }[] = [
  {
    label: 'デザイン要素',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    ids: ['visual-impression', 'colors', 'fonts', 'layout', 'photos', 'illustrations', 'icons', 'diagrams'],
  },
  {
    label: 'Webコンテンツ',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    ids: ['header', 'footer', 'main-visual', 'buttons', 'blog', 'news', 'symbol-motif'],
  },
  {
    label: '演出要素',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    ids: ['parallax', 'hover-animation', 'transition'],
  },
];

function ProjectContextForm({
  context,
  onChange,
}: {
  context: ProjectContext;
  onChange: (ctx: ProjectContext) => void;
}) {
  const [open, setOpen] = useState(
    !!(context.purpose || context.targetAudience || context.desiredImpression)
  );

  const filled = context.purpose || context.targetAudience || context.desiredImpression;

  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-violet-100 transition-colors duration-150"
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-semibold text-violet-800">プロジェクト概要</span>
          <span className="text-xs text-violet-500 font-normal">任意・入力するとAI分析の精度が上がります</span>
          {filled && !open && (
            <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium">入力済み</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-violet-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-violet-200 pt-3">
          <p className="text-xs text-violet-600">
            目的・対象者・印象を登録することで、AIが参考資料のデザイン選択の「なぜ」を推察しながら分析・プロンプト生成を行います。
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">目的・解決すべき課題</label>
            <input
              type="text"
              value={context.purpose}
              onChange={e => onChange({ ...context, purpose: e.target.value })}
              placeholder="例：地元工務店への問い合わせのハードルを下げる"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">対象者</label>
            <input
              type="text"
              value={context.targetAudience}
              onChange={e => onChange({ ...context, targetAudience: e.target.value })}
              placeholder="例：30〜50代の家族持ち、住宅購入を検討中"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">与えたい印象</label>
            <input
              type="text"
              value={context.desiredImpression}
              onChange={e => onChange({ ...context, desiredImpression: e.target.value })}
              placeholder="例：誠実・温かみ・信頼感"
              className="input-field text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

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
    clearAll,
  } = useCategories();

  const [step, setStep] = useState<AppStep>('references');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  const [projectContext, setProjectContext] = useState<ProjectContext>(() => {
    try {
      const saved = localStorage.getItem('projectContext');
      return saved ? JSON.parse(saved) : { purpose: '', targetAudience: '', desiredImpression: '' };
    } catch {
      return { purpose: '', targetAudience: '', desiredImpression: '' };
    }
  });

  useEffect(() => {
    localStorage.setItem('projectContext', JSON.stringify(projectContext));
  }, [projectContext]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedPrompts, setGeneratedPrompts] = useState<CategoryPrompt[]>([]);
  const [globalStylePrompt, setGlobalStylePrompt] = useState<string | null>(null);

  // Color palette (persisted in localStorage)
  const [colorPalette, setColorPalette] = useState<ColorPaletteData | null>(() => {
    try {
      const saved = localStorage.getItem('colorPalette');
      return saved ? JSON.parse(saved) : { colors: [], ratio: { base: 70, main: 20, accent: 10 } };
    } catch { return { colors: [], ratio: { base: 70, main: 20, accent: 10 } }; }
  });
  const [isExtractingColors, setIsExtractingColors] = useState(false);

  useEffect(() => {
    localStorage.setItem('colorPalette', JSON.stringify(colorPalette));
  }, [colorPalette]);

  const handleExtractColors = useCallback(async () => {
    const colorsCategory = categories.find(c => c.id === 'colors');
    if (!colorsCategory || colorsCategory.references.length === 0) return;
    setIsExtractingColors(true);
    try {
      const refs = await Promise.all(
        colorsCategory.references.map(async ref => {
          if (ref.type === 'url') {
            return { type: 'url' as const, url: (ref as import('./types').UrlReference).url, comment: ref.comment };
          } else {
            const ir = ref as import('./types').ImageReference;
            let base64: string | undefined;
            if (ir.file) {
              base64 = await fileToBase64(ir.file);
            } else if (ir.imageDataUrl) {
              base64 = ir.imageDataUrl.split(',')[1];
            }
            return { type: 'image' as const, imageBase64: base64, imageMimeType: ir.file?.type, fileName: ir.fileName, comment: ir.comment };
          }
        })
      );
      const hasContext = projectContext.purpose || projectContext.targetAudience || projectContext.desiredImpression;
      const response = await fetch('/api/extract-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ references: refs, ...(hasContext && { projectContext }) }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'failed');
      const data = await response.json();
      setColorPalette({
        colors: data.colors ?? [],
        ratio: data.ratio ?? { base: 70, main: 20, accent: 10 },
      });
    } catch (err) {
      console.error('Color extraction error:', err);
    } finally {
      setIsExtractingColors(false);
    }
  }, [categories, projectContext]);

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
                  // Use file if available, otherwise extract base64 from stored data URL
                  let base64: string | undefined;
                  if (ref.file) {
                    base64 = await fileToBase64(ref.file);
                  } else if (ref.imageDataUrl) {
                    base64 = ref.imageDataUrl.split(',')[1];
                  }
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

      const hasContext = projectContext.purpose || projectContext.targetAudience || projectContext.desiredImpression;
      const hasColors = colorPalette && colorPalette.colors.length > 0;
      const body: AnalyzeRequest = {
        categories: requestCategories,
        ...(hasContext && { projectContext }),
        ...(hasColors && { preExtractedColors: colorPalette!.colors, colorRatio: colorPalette!.ratio }),
      };

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
      setGeneratedPrompts(Array.isArray(data.prompts) ? data.prompts : []);
      setGlobalStylePrompt(data.globalStylePrompt ?? null);
      setStep('prompt');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'プロンプト生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  }, [extraction]);

  const [activeGroupIdx, setActiveGroupIdx] = useState(0);

  const totalRefs = getTotalReferenceCount();
  const filledCats = getFilledCategoryCount();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start">
              <img src="/logo.png" alt="PromptChef" className="h-8 w-auto" />
              <span className="text-gray-400 font-normal mt-0.5" style={{ fontSize: '12px' }}>for Figma Make</span>
            </div>

            <p className="text-xs text-gray-500 hidden sm:block">
              参考資料からFigma Make用の高品質プロンプトを生成
            </p>

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

            {/* Project context form */}
            <ProjectContextForm context={projectContext} onChange={setProjectContext} />

            {/* Auto-save status bar */}
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center gap-3">
              <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {totalRefs > 0 ? (
                <p className="text-sm text-indigo-700 flex-1">
                  <span className="font-semibold">{filledCats}カテゴリ</span>に
                  <span className="font-semibold"> {totalRefs}件</span>の参考資料が登録されています
                  <span className="text-indigo-400 text-xs ml-2">（自動保存済み）</span>
                </p>
              ) : (
                <p className="text-sm text-indigo-400 flex-1">参考資料を登録すると自動で保存されます</p>
              )}
              {totalRefs > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('登録した参考資料をすべてクリアしますか？')) clearAll();
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors duration-150 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50"
                >
                  クリア
                </button>
              )}
            </div>

            {/* Group tabs */}
            <div className="flex border-b border-gray-200 mb-4 gap-1">
              {CATEGORY_GROUPS.map((group, idx) => {
                const groupCats = group.ids
                  .map(id => categories.find(c => c.id === id))
                  .filter(Boolean) as typeof categories;
                const filledCount = groupCats.filter(cat =>
                  cat.references.length > 0 || (cat.id === 'colors' && (colorPalette?.colors.length ?? 0) > 0)
                ).length;
                const isActive = activeGroupIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveGroupIdx(idx)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 rounded-t-lg -mb-px border border-b-0 ${
                      isActive
                        ? 'bg-white border-gray-200 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {group.icon}
                    {group.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      filledCount > 0
                        ? isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {filledCount}/{groupCats.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active group categories */}
            <div className="space-y-3">
              {(CATEGORY_GROUPS[activeGroupIdx].ids
                .map(id => categories.find(c => c.id === id))
                .filter(Boolean) as typeof categories
              ).map(cat => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  isStyleGuideCategory={STYLE_GUIDE_CATEGORY_IDS.includes(cat.id)}
                  isColorCategory={cat.id === 'colors'}
                  colorPalette={cat.id === 'colors' ? colorPalette : null}
                  isExtractingColors={cat.id === 'colors' ? isExtractingColors : false}
                  onAddUrl={() => addUrlReference(cat.id)}
                  onAddImage={file => addImageReference(cat.id, file)}
                  onUpdateRef={(refId, updates) => updateReference(cat.id, refId, updates)}
                  onRemoveRef={refId => removeReference(cat.id, refId)}
                  onExtractColors={cat.id === 'colors' ? handleExtractColors : undefined}
                  onColorPaletteChange={cat.id === 'colors' ? setColorPalette : undefined}
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
              <div className="flex flex-col sm:flex-row items-center gap-3">
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
                {extraction && !isAnalyzing && (
                  <button
                    onClick={() => setStep('extraction')}
                    className="flex items-center gap-2 bg-white border border-indigo-300 text-indigo-600 px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    先程の分析結果を表示する
                  </button>
                )}
              </div>
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
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setStep('prompt')}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-150 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  プロンプト生成へ進む
                </button>
                {(generatedPrompts.length > 0 || globalStylePrompt) && (
                  <button
                    onClick={() => setStep('prompt')}
                    className="flex items-center gap-2 bg-white border border-purple-300 text-purple-600 px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-purple-50 transition-all duration-150 shadow-sm hover:shadow"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    先程のプロンプト結果を表示する
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Prompt generation */}
        {step === 'prompt' && (
          <div>
            {generateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {generateError}
              </div>
            )}
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
              globalStylePrompt={globalStylePrompt}
              isGenerating={isGenerating}
              onGenerate={handleGeneratePrompt}
            />
          </div>
        )}
      </main>
    </div>
  );
}
