import Anthropic from '@anthropic-ai/sdk';
import type { AnalyzeRequest, CategoryExtraction, ExtractionResult, StyleGuide, CategoryPrompt, ProjectContext, ExtractedColor, ColorRatio, ExtractColorsRequest } from '../src/types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-5';

function detectImageMimeType(base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('R0lGODlh') || base64.startsWith('R0lGODdh')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

function extractJSON(text: string): string | null {
  // Try code block first (```json ... ``` or ``` ... ```)
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  // Find the outermost JSON object by tracking brace depth
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// Categories that need animation/interaction-focused analysis
const ANIMATION_CATEGORY_IDS = ['parallax', 'transition'];

// Categories that support hover animation references embedded within them
const HOVER_SUPPORTED_CATEGORY_IDS = ['buttons', 'blog', 'news', 'main-visual', 'header', 'footer'];

// Categories that support entrance/display animation references (scroll-triggered, on-load, etc.)
const ENTRANCE_ANIMATION_CATEGORY_IDS = ['diagrams'];

// Categories used for style guide generation
const STYLE_GUIDE_CATEGORY_IDS = ['visual-impression', 'colors', 'fonts', 'layout'];

function buildProjectContextBlock(ctx?: ProjectContext): string {
  if (!ctx) return '';
  const lines: string[] = [];
  if (ctx.purpose) lines.push(`- 目的・解決すべき課題: ${ctx.purpose}`);
  if (ctx.targetAudience) lines.push(`- 対象者: ${ctx.targetAudience}`);
  if (ctx.desiredImpression) lines.push(`- 与えたい印象: ${ctx.desiredImpression}`);
  if (lines.length === 0) return '';
  return `\nプロジェクト情報（分析の参考として活用してください）:\n${lines.join('\n')}\n→ 各デザイン選択が「なぜこのプロジェクトに適しているか」という視点も含めて分析してください。\n`;
}

function buildProjectContextNote(ctx?: ProjectContext): string {
  if (!ctx) return '';
  const lines: string[] = [];
  if (ctx.purpose) lines.push(`Purpose: ${ctx.purpose}`);
  if (ctx.targetAudience) lines.push(`Target audience: ${ctx.targetAudience}`);
  if (ctx.desiredImpression) lines.push(`Desired impression: ${ctx.desiredImpression}`);
  if (lines.length === 0) return '';
  return `\nProject context:\n${lines.join('\n')}\n`;
}

function buildCategoryAnalysisPrompt(categoryLabel: string, categoryLabelEn: string, isAnimation: boolean, isHoverSupported: boolean, isEntranceAnimationSupported: boolean, projectContext?: ProjectContext): string {
  const contextBlock = buildProjectContextBlock(projectContext);
  if (isAnimation) {
    return `あなたはWebデザインの専門家です。提供された参考資料（URL、画像）を分析し、「${categoryLabel}（${categoryLabelEn}）」に関するアニメーション・インタラクション要素を抽出してください。${contextBlock}

以下のJSON形式で回答してください：

{
  "summary": "このアニメーション/インタラクションの全体的なまとめ（200文字以内）",
  "colors": null,
  "fonts": null,
  "animations": [
    {
      "type": "アニメーション種類（例：parallax-scroll, hover-scale, page-fade等）",
      "description": "詳細説明（CSSプロパティ、タイミング関数、duration値、使用ライブラリ名、トリガー条件を含める）"
    }
  ],
  "layoutDescription": null,
  "styleKeywords": ["キーワード1", "キーワード2"],
  "notes": "使用ライブラリ（GSAP, ScrollMagic, Locomotive Scroll, Swiper等）やCSS技術の特記事項"
}

注意：
- CSSプロパティ（transform, opacity, transition, animation）を具体的に抽出してください
- タイミング関数（ease, ease-in-out, cubic-bezier等）とduration値を記載してください
- GSAP・ScrollMagic・Locomotive Scroll等のJSライブラリが確認できる場合は名称を記載してください
- トリガー条件（スクロール位置、ホバー、クリック、ページ読み込み等）を明確にしてください
- 該当しない項目（colors, fonts, layoutDescription）はnullとしてください
- コメントに書かれた指示を優先的に考慮してください`;
  }

  return `あなたはWebデザインの専門家です。提供された参考資料（URL、画像）を分析し、「${categoryLabel}（${categoryLabelEn}）」に関するデザイン要素を抽出してください。${contextBlock}

以下のJSON形式で回答してください：

{
  "summary": "このカテゴリの全体的なまとめ（200文字以内）",
  "colors": [
    {"hex": "#XXXXXX", "name": "色名", "role": "base | main | accent", "usage": "使用箇所・用途"}
  ],
  "fonts": [
    {"family": "フォントファミリー名", "weight": "ウェイト（例：400, 700）", "usage": "使用箇所（h1, h2, 本文など）"}
  ],
  "animations": [
    {"type": "アニメーション種類", "description": "詳細説明"}
  ],
  "layoutDescription": "レイアウトの特徴の説明",
  "styleKeywords": ["キーワード1", "キーワード2", "キーワード3"],
  "notes": "その他の特記事項"
}

注意：
- 参考資料から実際に観察できる要素のみを抽出してください
- 色は16進数で正確に記載してください（例：#1A2B3C）
- 色のroleは必ず以下3種類のいずれかで分類してください：
  - "base"：背景・余白など最も広い面積を占める土台の色（白・薄いグレー・アイボリー等）
  - "main"：ブランドの印象を決定づける主役の色（ロゴ・主要UI・見出し等）
  - "accent"：注目させたいポイントに使うワンポイントの色（CTAボタン・バッジ等）
- 必ずしも3色すべてが存在するとは限らない。観察できるものだけ抽出してください
- 該当しない項目（colors, fonts, animations, layoutDescription）はnullまたは省略可能
- styleKeywordsは3〜7個のキーワードを含めてください
- コメントに書かれた指示を優先的に考慮してください${isHoverSupported ? `
- ホバーアニメーションの参考が含まれている場合は animationsフィールドに抽出してください
  - type は "hover-[対象要素名]" 形式で記載してください（例："hover-button", "hover-card", "hover-nav-link"）
  - description にはCSSプロパティ・タイミング関数・duration値を具体的に含めてください` : ''}${isEntranceAnimationSupported ? `
- インフォグラフィック・グラフの表示アニメーション参考が含まれている場合は animationsフィールドに抽出してください
  - type は "animate-[対象要素名]" 形式で記載してください（例："animate-bar-chart", "animate-counter", "animate-pie", "animate-line-graph"）
  - description にはCSSプロパティ・タイミング関数・duration値、トリガー条件（スクロール連動・ページ読み込み等）を具体的に含めてください
  - GSAP・CountUp.js・Chart.js等のライブラリが確認できる場合は名称を記載してください` : ''}`;
}

export async function analyzeCategoryReferences(
  category: AnalyzeRequest['categories'][0],
  projectContext?: ProjectContext
): Promise<CategoryExtraction> {
  const hasReferences = category.references.length > 0;

  if (!hasReferences) {
    return {
      categoryId: category.id,
      label: category.label,
      labelEn: category.labelEn,
      summary: '参考資料が登録されていません',
      styleKeywords: [],
    };
  }

  const isAnimation = ANIMATION_CATEGORY_IDS.includes(category.id);
  const isHoverSupported = HOVER_SUPPORTED_CATEGORY_IDS.includes(category.id);
  const isEntranceAnimationSupported = ENTRANCE_ANIMATION_CATEGORY_IDS.includes(category.id);
  const messageContent: Anthropic.MessageParam['content'] = [];

  messageContent.push({
    type: 'text',
    text: buildCategoryAnalysisPrompt(category.label, category.labelEn, isAnimation, isHoverSupported, isEntranceAnimationSupported, projectContext),
  });

  let referenceIndex = 1;
  for (const ref of category.references) {
    messageContent.push({
      type: 'text',
      text: `\n\n--- 参考資料 ${referenceIndex} ---`,
    });

    if (ref.type === 'url' && ref.url) {
      messageContent.push({
        type: 'text',
        text: `URL: ${ref.url}${ref.comment ? `\nコメント: ${ref.comment}` : ''}`,
      });
    } else if (ref.type === 'image' && ref.imageBase64) {
      const mediaType = (ref.imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') || detectImageMimeType(ref.imageBase64);
      messageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: ref.imageBase64,
        },
      });
      if (ref.comment) {
        messageContent.push({
          type: 'text',
          text: `コメント: ${ref.comment}`,
        });
      }
    }

    referenceIndex++;
  }

  messageContent.push({
    type: 'text',
    text: '\n\n上記の参考資料を分析し、指定のJSON形式でデザイン要素を抽出してください。URLの場合はそのURLで示されるWebサイトのデザインを想定して分析してください。',
  });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: messageContent }],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === 'max_tokens') {
    throw new Error('Response was truncated (max_tokens reached). Try reducing the number of references.');
  }

  const textContent = response.content.find(b => b.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const rawText = textContent.text;

  // Extract JSON from the response
  const jsonStr = extractJSON(rawText);
  if (!jsonStr) {
    console.error('[analyzeCategoryReferences] No JSON found. Raw response:', rawText.slice(0, 500));
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonStr);

  return {
    categoryId: category.id,
    label: category.label,
    labelEn: category.labelEn,
    summary: parsed.summary || '',
    colors: parsed.colors || undefined,
    fonts: parsed.fonts || undefined,
    animations: parsed.animations || undefined,
    layoutDescription: parsed.layoutDescription || undefined,
    styleKeywords: parsed.styleKeywords || [],
    notes: parsed.notes || undefined,
  };
}

export async function generateGlobalStylePrompt(
  styleGuide: StyleGuide | null | undefined,
  styleCategories: CategoryExtraction[],
  projectContext?: ProjectContext
): Promise<string> {
  const parts: string[] = [];

  if (styleGuide) {
    if (styleGuide.concept) parts.push(`Design Concept: ${styleGuide.concept}`);
    if (styleGuide.designMood) parts.push(`Design Mood: ${styleGuide.designMood}`);
    if (styleGuide.colorPalette.length > 0) {
      parts.push(`Color Palette: ${styleGuide.colorPalette.map(c => `${c.name}(${c.hex}) - ${c.role}`).join(', ')}`);
    }
    if (styleGuide.typography) parts.push(`Typography: ${styleGuide.typography}`);
    if (styleGuide.layoutPrinciples) parts.push(`Layout Principles: ${styleGuide.layoutPrinciples}`);
  }

  // Supplement with raw category details for precision
  for (const cat of styleCategories) {
    if (cat.colors && cat.colors.length > 0) {
      parts.push(`${cat.label} colors: ${cat.colors.map(c => `[${c.role}] ${c.name}(${c.hex}) - ${c.usage}`).join(', ')}`);
    }
    if (cat.fonts && cat.fonts.length > 0) {
      parts.push(`${cat.label} fonts: ${cat.fonts.map(f => `${f.family}${f.weight ? ` w${f.weight}` : ''} - ${f.usage}`).join(', ')}`);
    }
    if (cat.layoutDescription) {
      parts.push(`${cat.label} layout: ${cat.layoutDescription}`);
    }
    if (cat.styleKeywords && cat.styleKeywords.length > 0) {
      parts.push(`${cat.label} keywords: ${cat.styleKeywords.join(', ')}`);
    }
  }

  const contextNote = buildProjectContextNote(projectContext);
  const contextInstruction = projectContext && (projectContext.purpose || projectContext.targetAudience || projectContext.desiredImpression)
    ? '- プロジェクトの目的・対象者・印象を踏まえ、なぜその色・フォント・レイアウトがこのプロジェクトに適切かを一文で示すこと\n'
    : '';

  const userMessage = `以下のデザイン分析結果をもとに、Figma Makeで使用するためのグローバルスタイルプロンプトを英語で生成してください。
このプロンプトはFigma Makeに最初に適用し、サイト全体の色・フォント・レイアウトの基盤を確立するためのものです。
後続のすべてのコンポーネントプロンプトはこのスタイルガイドに従います。
${contextNote}
分析結果:
${parts.join('\n')}

生成するプロンプトの条件:
- 英語で記述すること
- カラーパレット（具体的な16進数）、フォントファミリー・ウェイト、レイアウト基本方針をすべて含めること
- これがサイト全体の「スタイルガイド」として機能することを明示すること（例: "Establish the following as the global design system..."）
${contextInstruction}- 3〜8文程度の包括的なテキストとして出力すること
- プロンプト本文のみ出力し、説明や前置きは不要`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: userMessage }],
  });

  const response = await stream.finalMessage();
  const textContent = response.content.find(b => b.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }
  return textContent.text.trim();
}

export async function generateCategoryPrompt(
  extraction: CategoryExtraction,
  additionalContext?: string,
  projectContext?: ProjectContext
): Promise<CategoryPrompt> {
  const isAnimation = ANIMATION_CATEGORY_IDS.includes(extraction.categoryId);
  const isHoverSupported = HOVER_SUPPORTED_CATEGORY_IDS.includes(extraction.categoryId);
  const hasHoverAnimations = isHoverSupported &&
    extraction.animations?.some(a => a.type.startsWith('hover-'));
  const isEntranceAnimationSupported = ENTRANCE_ANIMATION_CATEGORY_IDS.includes(extraction.categoryId);
  const hasEntranceAnimations = isEntranceAnimationSupported &&
    extraction.animations?.some(a => a.type.startsWith('animate-'));

  // Tier 2: component/animation prompts — omit specific color/font values,
  // reference the global style guide instead
  const parts: string[] = [extraction.summary];
  parts.push('Colors & Typography: Follow the established global style guide. Do not define or override any colors or fonts.');

  if (extraction.animations && extraction.animations.length > 0) {
    parts.push(`Animations: ${extraction.animations.map(a => `${a.type}: ${a.description}`).join('; ')}`);
  }
  if (extraction.layoutDescription) {
    parts.push(`Layout: ${extraction.layoutDescription}`);
  }
  if (extraction.styleKeywords && extraction.styleKeywords.length > 0) {
    parts.push(`Keywords: ${extraction.styleKeywords.join(', ')}`);
  }
  if (extraction.notes) {
    parts.push(`Notes: ${extraction.notes}`);
  }

  const animationNote = isAnimation
    ? '\n- Include specific CSS properties, timing values, and JS library names (GSAP, ScrollMagic, etc.) where applicable\n- When animations require colors, explicitly state to use colors from the global style guide'
    : hasHoverAnimations
    ? '\n- Include hover state interactions with specific CSS properties (transform, opacity, transition, etc.) and timing values\n- Clearly specify which element the hover effect applies to (e.g., button, card thumbnail, nav link)\n- When hover animations require colors, use "from the global style guide" reference expression'
    : hasEntranceAnimations
    ? '\n- Include entrance/display animations for infographics and charts with specific CSS properties, timing values, and trigger conditions (scroll-triggered, on-load, etc.)\n- Specify the animated element type (bar chart, counter, pie chart, line graph, etc.) and any JS library (GSAP, CountUp.js, Chart.js, etc.)\n- When animations require colors, use "from the global style guide" reference expression'
    : '';

  const contextNote = buildProjectContextNote(projectContext);
  const contextInstruction = projectContext && (projectContext.purpose || projectContext.targetAudience || projectContext.desiredImpression)
    ? '- プロジェクトの目的・対象者・印象を踏まえ、この要素がなぜそのように設計されるべきかを示す一文を添えること\n'
    : '';

  const userMessage = `以下の「${extraction.label}（${extraction.labelEn}）」の分析結果から、Figma Makeで使用するための専用プロンプトを英語で生成してください。

このプロンプトは「${extraction.label}」の構造・配置・インタラクションのみに集中します。
色とフォントは別途定義されたグローバルスタイルガイドに従うものとし、このプロンプト内で色やフォントを指定しないでください。
${contextNote}
分析結果:
${parts.join('\n')}
${additionalContext ? `\n追加コンテキスト: ${additionalContext}` : ''}
生成するプロンプトの条件:
- 英語で記述すること
- 「${extraction.label}」の構造・レイアウト・インタラクションに特化した仕様のみを含めること
- 色・フォントは "using the established color palette" / "following the global typography" などの参照表現のみ使用すること
- "without changing other design elements" などの限定表現を入れること${animationNote}
${contextInstruction}- 2〜5文程度の簡潔なテキストとして出力すること
- プロンプト本文のみ出力し、説明や前置きは不要`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: userMessage }],
  });

  const response = await stream.finalMessage();
  const textContent = response.content.find(b => b.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return {
    categoryId: extraction.categoryId,
    label: extraction.label,
    prompt: textContent.text.trim(),
  };
}

export async function generateAllCategoryPrompts(
  extraction: ExtractionResult,
  additionalContext?: string
): Promise<{ globalStylePrompt: string | null; prompts: CategoryPrompt[] }> {
  const projectContext = extraction.projectContext;

  const styleCategories = extraction.categories.filter(
    cat => STYLE_GUIDE_CATEGORY_IDS.includes(cat.categoryId) &&
           cat.summary && cat.summary !== '参考資料が登録されていません'
  );

  // Tier 2: component/animation categories only
  const componentCategories = extraction.categories.filter(
    cat => !STYLE_GUIDE_CATEGORY_IDS.includes(cat.categoryId) &&
           cat.summary && cat.summary !== '参考資料が登録されていません'
  );

  // Generate Tier 1 and Tier 2 concurrently
  const hasStyleData = styleCategories.length > 0 || extraction.styleGuide;
  const globalStylePromptPromise = hasStyleData
    ? generateGlobalStylePrompt(extraction.styleGuide, styleCategories, projectContext)
    : Promise.resolve(null);

  const prompts: CategoryPrompt[] = [];
  for (let i = 0; i < componentCategories.length; i += 3) {
    const batch = componentCategories.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(cat => generateCategoryPrompt(cat, additionalContext, projectContext))
    );
    prompts.push(...batchResults);
  }

  const globalStylePrompt = await globalStylePromptPromise;
  return { globalStylePrompt, prompts };
}

export async function generateStyleGuide(categories: CategoryExtraction[], projectContext?: ProjectContext): Promise<StyleGuide | null> {
  const relevantCategories = categories.filter(
    cat =>
      STYLE_GUIDE_CATEGORY_IDS.includes(cat.categoryId) &&
      cat.summary &&
      cat.summary !== '参考資料が登録されていません'
  );

  if (relevantCategories.length === 0) return null;

  const categorySummaries = relevantCategories.map(cat => {
    const parts: string[] = [`【${cat.label}】`, cat.summary];
    if (cat.colors && cat.colors.length > 0) {
      parts.push(`カラー: ${cat.colors.map(c => `${c.name}(${c.hex})`).join(', ')}`);
    }
    if (cat.fonts && cat.fonts.length > 0) {
      parts.push(`フォント: ${cat.fonts.map(f => `${f.family}${f.weight ? ` w${f.weight}` : ''} - ${f.usage}`).join(', ')}`);
    }
    if (cat.layoutDescription) {
      parts.push(`レイアウト: ${cat.layoutDescription}`);
    }
    if (cat.styleKeywords && cat.styleKeywords.length > 0) {
      parts.push(`キーワード: ${cat.styleKeywords.join(', ')}`);
    }
    return parts.join('\n');
  }).join('\n\n');

  const contextBlock = buildProjectContextBlock(projectContext);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `以下のデザイン要素の分析結果をもとに、スタイルガイドを生成してください。
${contextBlock}
${categorySummaries}

以下のJSON形式で回答してください：

{
  "concept": "デザインコンセプト（100文字以内）",
  "colorPalette": [
    {"hex": "#XXXXXX", "name": "色名", "role": "base | main | accent"}
  ],
  "typography": "タイポグラフィの方針と使用フォントの説明（200文字以内）",
  "layoutPrinciples": "レイアウトの基本方針・グリッドシステムの説明（200文字以内）",
  "designMood": "デザインのムード・トーン・雰囲気（100文字以内）"
}

注意：
- colorPaletteは参考資料から抽出した色のみを含め、不明な場合は空配列にしてください
- roleは必ず "base"（土台・背景色）/ "main"（主役ブランドカラー）/ "accent"（強調ポイント色）のいずれかで分類してください`,
    }],
  });

  const textContent = response.content.find(b => b.type === 'text');
  if (!textContent || textContent.type !== 'text') return null;

  const jsonStr = extractJSON(textContent.text);
  if (!jsonStr) {
    console.error('[generateStyleGuide] No JSON found. Raw response:', textContent.text.slice(0, 500));
    return null;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      concept: parsed.concept || '',
      colorPalette: parsed.colorPalette || [],
      typography: parsed.typography || '',
      layoutPrinciples: parsed.layoutPrinciples || '',
      designMood: parsed.designMood || '',
    };
  } catch {
    return null;
  }
}

export async function extractColorsFromReferences(
  references: ExtractColorsRequest['references'],
  projectContext?: ProjectContext
): Promise<{ colors: ExtractedColor[]; ratio: ColorRatio }> {
  const messageContent: Anthropic.MessageParam['content'] = [];

  const contextBlock = buildProjectContextBlock(projectContext);
  messageContent.push({
    type: 'text',
    text: `あなたはWebデザインの専門家です。提供された参考資料から使用されている色を抽出し、役割ごとに分類してください。${contextBlock}
以下のJSON形式のみで回答してください（他のテキストは不要）：

{
  "colors": [
    {"hex": "#XXXXXX", "name": "色名", "role": "base | main | accent", "usage": "使用箇所・用途"}
  ],
  "ratio": {
    "base": 70,
    "main": 20,
    "accent": 10
  }
}

分類ルール：
- "base"：背景・余白など最も広い面積を占める土台の色（白、薄いグレー、アイボリー等）
- "main"：ブランドの印象を決定づける主役の色（ロゴ・主要UI・見出し等）
- "accent"：ユーザーの注目を集めるワンポイントの色（CTAボタン・バッジ・リンク等）

ratioについて：
- base + main + accent の合計が必ず100になるように推定してください
- 参考資料での各ロール色の使用面積・頻度から推定してください
- 一般的なWebデザインでは base:60〜75%, main:15〜25%, accent:5〜15% 程度
- 参考資料がない場合や判断できない場合はデフォルト値（base:70, main:20, accent:10）を使用してください

注意：
- 参考資料から実際に観察できる色のみ抽出してください
- 色は16進数で正確に記載してください（例：#1A2B3C）
- 3種類すべてが存在しない場合もあります。観察できたものだけ抽出してください
- コメントに書かれた指示を優先的に考慮してください`,
  });

  let idx = 1;
  for (const ref of references) {
    messageContent.push({ type: 'text', text: `\n\n--- 参考資料 ${idx} ---` });
    if (ref.type === 'url' && ref.url) {
      messageContent.push({
        type: 'text',
        text: `URL: ${ref.url}${ref.comment ? `\nコメント: ${ref.comment}` : ''}`,
      });
    } else if (ref.type === 'image' && ref.imageBase64) {
      const mediaType = (ref.imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') || detectImageMimeType(ref.imageBase64);
      messageContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: ref.imageBase64 } });
      if (ref.comment) messageContent.push({ type: 'text', text: `コメント: ${ref.comment}` });
    }
    idx++;
  }

  messageContent.push({ type: 'text', text: '\n\n上記の参考資料から色を抽出し、JSON形式で回答してください。' });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: messageContent }],
  });
  const response = await stream.finalMessage();
  const textContent = response.content.find(b => b.type === 'text');
  if (!textContent || textContent.type !== 'text') return { colors: [], ratio: { base: 70, main: 20, accent: 10 } };

  const jsonStr = extractJSON(textContent.text);
  if (!jsonStr) {
    console.error('[extractColorsFromReferences] No JSON found. Raw response:', textContent.text.slice(0, 500));
    return { colors: [], ratio: { base: 70, main: 20, accent: 10 } };
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const colors = (parsed.colors || []) as ExtractedColor[];
    const rawRatio = parsed.ratio || {};
    const base = Number(rawRatio.base) || 70;
    const main = Number(rawRatio.main) || 20;
    const accent = Number(rawRatio.accent) || 10;
    // Normalize so they sum to 100
    const total = base + main + accent;
    const ratio: ColorRatio = total > 0
      ? { base: Math.round(base / total * 100), main: Math.round(main / total * 100), accent: 100 - Math.round(base / total * 100) - Math.round(main / total * 100) }
      : { base: 70, main: 20, accent: 10 };
    return { colors, ratio };
  } catch {
    return { colors: [], ratio: { base: 70, main: 20, accent: 10 } };
  }
}

export async function analyzeOverallStyle(categories: AnalyzeRequest['categories'], projectContext?: ProjectContext): Promise<string> {
  const filledCategories = categories.filter(c => c.references.length > 0);

  if (filledCategories.length === 0) {
    return '参考資料が登録されていません';
  }

  const categoryList = filledCategories.map(c => c.label).join('、');

  const contextBlock = buildProjectContextBlock(projectContext);
  const contextSuffix = projectContext && (projectContext.purpose || projectContext.targetAudience || projectContext.desiredImpression)
    ? 'プロジェクトの目的・対象者・印象も踏まえた上で説明してください。'
    : '';

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `次のWebデザインカテゴリについて参考資料が登録されています：${categoryList}。
${contextBlock}これらの要素を総合した場合の全体的なデザインスタイルを50〜100文字で簡潔に日本語で説明してください。${contextSuffix}
レスポンスは説明文のみとし、余分なテキストは含めないでください。`,
    }],
  });

  const textContent = response.content.find(b => b.type === 'text');
  return textContent && textContent.type === 'text' ? textContent.text : '';
}
