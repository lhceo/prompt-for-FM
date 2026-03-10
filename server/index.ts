import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeCategoryReferences, generateAllCategoryPrompts, analyzeOverallStyle, generateStyleGuide } from './claude.js';
import type { AnalyzeRequest, ExtractionResult, GeneratePromptRequest } from '../src/types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

// Analyze references and extract design elements
app.post('/api/analyze', async (req, res) => {
  try {
    const body: AnalyzeRequest = req.body;

    if (!body.categories || !Array.isArray(body.categories)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const filledCategories = body.categories.filter(c => c.references.length > 0);

    if (filledCategories.length === 0) {
      return res.status(400).json({ error: '参考資料が登録されていません。少なくとも1つのカテゴリに参考資料を追加してください。' });
    }

    const projectContext = body.projectContext;

    // Analyze each category in parallel (max 3 concurrent to avoid rate limits)
    const results = [];
    for (let i = 0; i < filledCategories.length; i += 3) {
      const batch = filledCategories.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map(cat => analyzeCategoryReferences(cat, projectContext))
      );
      results.push(...batchResults);
    }

    const [overallStyle, styleGuide] = await Promise.all([
      analyzeOverallStyle(filledCategories, projectContext),
      generateStyleGuide(results, projectContext),
    ]);

    const extraction: ExtractionResult = {
      categories: results,
      overallStyle,
      styleGuide: styleGuide ?? undefined,
      projectContext,
      generatedAt: new Date().toISOString(),
    };

    return res.json(extraction);
  } catch (error) {
    console.error('Analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `分析中にエラーが発生しました: ${message}` });
  }
});

// Generate per-category Figma Make prompts from extraction results
app.post('/api/generate-prompt', async (req, res) => {
  try {
    const body: GeneratePromptRequest = req.body;

    if (!body.extraction) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { globalStylePrompt, prompts } = await generateAllCategoryPrompts(body.extraction, body.additionalContext);

    return res.json({ prompts, globalStylePrompt });
  } catch (error) {
    console.error('Prompt generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `プロンプト生成中にエラーが発生しました: ${message}` });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '..', 'client');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set');
  }
});
