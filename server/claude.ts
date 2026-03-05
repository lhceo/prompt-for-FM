import Anthropic from '@anthropic-ai/sdk';
import type { AnalyzeRequest, ExtractionResult, CategoryExtraction } from '../src/types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-6';

function buildCategoryAnalysisPrompt(categoryLabel: string, categoryLabelEn: string, categoryDescription: string): string {
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
      summary: '参考資料が登録されていません',
      styleKeywords: [],
    };
  }

  const messageContent: Anthropic.MessageParam['content'] = [];

  messageContent.push({
    type: 'text',
    text: buildCategoryAnalysisPrompt(category.label, category.labelEn, ''),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: 'adaptive' } as any,
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
    summary: parsed.summary || '',
    colors: parsed.colors || undefined,
    fonts: parsed.fonts || undefined,
    animations: parsed.animations || undefined,
    layoutDescription: parsed.layoutDescription || undefined,
    styleKeywords: parsed.styleKeywords || [],
    notes: parsed.notes || undefined,
  };
}

export async function generateFigmaPrompt(
  extraction: ExtractionResult,
  additionalContext?: string
): Promise<string> {
  const categorySummaries = extraction.categories
    .map(cat => {
      const parts: string[] = [`【${cat.categoryId}】`, cat.summary];

      if (cat.colors && cat.colors.length > 0) {
        parts.push(`カラー: ${cat.colors.map(c => `${c.name}(${c.hex})`).join(', ')}`);
      }
      if (cat.fonts && cat.fonts.length > 0) {
        parts.push(`フォント: ${cat.fonts.map(f => `${f.family}(${f.usage})`).join(', ')}`);
      }
      if (cat.animations && cat.animations.length > 0) {
        parts.push(`アニメーション: ${cat.animations.map(a => a.description).join('; ')}`);
      }
      if (cat.layoutDescription) {
        parts.push(`レイアウト: ${cat.layoutDescription}`);
      }
      if (cat.styleKeywords && cat.styleKeywords.length > 0) {
        parts.push(`スタイルキーワード: ${cat.styleKeywords.join(', ')}`);
      }

      return parts.join('\n');
    })
    .join('\n\n');

  const systemPrompt = `あなたはFigma Makeの専門家であり、優れたWebデザインプロンプトライターです。
デザイン要素の分析結果から、Figma Makeで高品質なWebサイトデザインを生成するための詳細なプロンプトを作成してください。

プロンプトは英語で記述し、以下の要素を含めてください：
1. Overall visual style and mood
2. Color palette (with hex codes)
3. Typography (font families, sizes, weights for headings and body)
4. Layout structure and grid system
5. UI components styling (buttons, navigation, cards, etc.)
6. Animations and interactions (parallax, hover effects, transitions)
7. Image and media treatment
8. Special design elements and motifs`;

  const userMessage = `以下のデザイン要素の分析結果から、Figma Makeで使用するための詳細なプロンプトを生成してください。

全体的なスタイル: ${extraction.overallStyle}

${additionalContext ? `追加コンテキスト: ${additionalContext}\n\n` : ''}カテゴリ別の分析結果:
${categorySummaries}

プロンプトは具体的で詳細なものにし、デザイナーがFigma Makeに入力した際に、個性的で高品質なWebサイトデザインが生成されるようにしてください。
プロンプトは英語で、単一の連続したテキストとして出力してください。`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: 'adaptive' } as any,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const response = await stream.finalMessage();

  const textContent = response.content.find(b => b.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textContent.text;
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
