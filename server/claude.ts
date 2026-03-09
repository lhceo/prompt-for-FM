import Anthropic from '@anthropic-ai/sdk';
import type { AnalyzeRequest, CategoryExtraction, ExtractionResult, StyleGuide, CategoryPrompt } from '../src/types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-6';

// Categories that need animation/interaction-focused analysis
const ANIMATION_CATEGORY_IDS = ['parallax', 'hover-animation', 'transition'];

// Categories used for style guide generation
const STYLE_GUIDE_CATEGORY_IDS = ['visual-impression', 'colors', 'fonts', 'layout'];

function buildCategoryAnalysisPrompt(categoryLabel: string, categoryLabelEn: string, isAnimation: boolean): string {
  if (isAnimation) {
    return `あなたはWebデザインの専門家です。提供された参考資料（URL、画像）を分析し、「${categoryLabel}（${categoryLabelEn}）」に関するアニメーション・インタラクション要素を抽出してください。

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

  return `あなたはWebデザインの専門家です。提供された参考資料（URL、画像）を分析し、「${categoryLabel}（${categoryLabelEn}）」に関するデザイン要素を抽出してください。

以下のJSON形式で回答してください：

{
  "summary": "このカテゴリの全体的なまとめ（200文字以内）",
  "colors": [
    {"hex": "#XXXXXX", "name": "色名", "usage": "使用箇所・用途"}
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
- 該当しない項目（colors, fonts, animations, layoutDescription）はnullまたは省略可能
- styleKeywordsは3〜7個のキーワードを含めてください
- コメントに書かれた指示を優先的に考慮してください`;
}

export async function analyzeCategoryReferences(
  category: AnalyzeRequest['categories'][0]
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
  const messageContent: Anthropic.MessageParam['content'] = [];

  messageContent.push({
    type: 'text',
    text: buildCategoryAnalysisPrompt(category.label, category.labelEn, isAnimation),
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
      const mediaType = (ref.imageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') || 'image/jpeg';
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
    max_tokens: 2000,
    messages: [{ role: 'user', content: messageContent }],
  });

  const response = await stream.finalMessage();

  const textContent = response.content.find(b => b.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const rawText = textContent.text;

  // Extract JSON from the response
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

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
  styleCategories: CategoryExtraction[]
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
      parts.push(`${cat.label} colors: ${cat.colors.map(c => `${c.name}(${c.hex}) - ${c.usage}`).join(', ')}`);
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

  const userMessage = `以下のデザイン分析結果をもとに、Figma Makeで使用するためのグローバルスタイルプロンプトを英語で生成してください。
このプロンプトはFigma Makeに最初に適用し、サイト全体の色・フォント・レイアウトの基盤を確立するためのものです。
後続のすべてのコンポーネントプロンプトはこのスタイルガイドに従います。

分析結果:
${parts.join('\n')}

生成するプロンプトの条件:
- 英語で記述すること
- カラーパレット（具体的な16進数）、フォントファミリー・ウェイト、レイアウト基本方針をすべて含めること
- これがサイト全体の「スタイルガイド」として機能することを明示すること（例: "Establish the following as the global design system..."）
- 3〜8文程度の包括的なテキストとして出力すること
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
  additionalContext?: string
): Promise<CategoryPrompt> {
  const isAnimation = ANIMATION_CATEGORY_IDS.includes(extraction.categoryId);

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
    : '';

  const userMessage = `以下の「${extraction.label}（${extraction.labelEn}）」の分析結果から、Figma Makeで使用するための専用プロンプトを英語で生成してください。

このプロンプトは「${extraction.label}」の構造・配置・インタラクションのみに集中します。
色とフォントは別途定義されたグローバルスタイルガイドに従うものとし、このプロンプト内で色やフォントを指定しないでください。

分析結果:
${parts.join('\n')}
${additionalContext ? `\n追加コンテキスト: ${additionalContext}` : ''}
生成するプロンプトの条件:
- 英語で記述すること
- 「${extraction.label}」の構造・レイアウト・インタラクションに特化した仕様のみを含めること
- 色・フォントは "using the established color palette" / "following the global typography" などの参照表現のみ使用すること
- "without changing other design elements" などの限定表現を入れること${animationNote}
- 2〜5文程度の簡潔なテキストとして出力すること
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
    ? generateGlobalStylePrompt(extraction.styleGuide, styleCategories)
    : Promise.resolve(null);

  const prompts: CategoryPrompt[] = [];
  for (let i = 0; i < componentCategories.length; i += 3) {
    const batch = componentCategories.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(cat => generateCategoryPrompt(cat, additionalContext))
    );
    prompts.push(...batchResults);
  }

  const globalStylePrompt = await globalStylePromptPromise;
  return { globalStylePrompt, prompts };
}

export async function generateStyleGuide(categories: CategoryExtraction[]): Promise<StyleGuide | null> {
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

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `以下のデザイン要素の分析結果をもとに、スタイルガイドを生成してください。

${categorySummaries}

以下のJSON形式で回答してください：

{
  "concept": "デザインコンセプト（100文字以内）",
  "colorPalette": [
    {"hex": "#XXXXXX", "name": "色名", "role": "プライマリ/セカンダリ/アクセント/ニュートラル"}
  ],
  "typography": "タイポグラフィの方針と使用フォントの説明（200文字以内）",
  "layoutPrinciples": "レイアウトの基本方針・グリッドシステムの説明（200文字以内）",
  "designMood": "デザインのムード・トーン・雰囲気（100文字以内）"
}

注意：colorPaletteは参考資料から抽出した色のみを含め、不明な場合は空配列にしてください。`,
    }],
  });

  const textContent = response.content.find(b => b.type === 'text');
  if (!textContent || textContent.type !== 'text') return null;

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
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

export async function analyzeOverallStyle(categories: AnalyzeRequest['categories']): Promise<string> {
  const filledCategories = categories.filter(c => c.references.length > 0);

  if (filledCategories.length === 0) {
    return '参考資料が登録されていません';
  }

  const categoryList = filledCategories.map(c => c.label).join('、');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `次のWebデザインカテゴリについて参考資料が登録されています：${categoryList}。
これらの要素を総合した場合の全体的なデザインスタイルを50〜100文字で簡潔に日本語で説明してください。
レスポンスは説明文のみとし、余分なテキストは含めないでください。`,
    }],
  });

  const textContent = response.content.find(b => b.type === 'text');
  return textContent && textContent.type === 'text' ? textContent.text : '';
}
