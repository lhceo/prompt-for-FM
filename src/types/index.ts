export type ReferenceType = 'url' | 'image';

export interface UrlReference {
  id: string;
  type: 'url';
  url: string;
  comment: string;
}

export interface ImageReference {
  id: string;
  type: 'image';
  file?: File;
  previewUrl?: string;
  fileName?: string;
  comment: string;
  imageDataUrl?: string; // full data URL, for localStorage persistence
}

export type Reference = UrlReference | ImageReference;

export interface Category {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  references: Reference[];
}

export interface ExtractedColor {
  hex: string;
  name: string;
  role: 'base' | 'main' | 'accent';
  usage: string;
}

export interface ExtractedFont {
  family: string;
  weight?: string;
  usage: string;
}

export interface ExtractedAnimation {
  type: string;
  description: string;
}

export interface CategoryExtraction {
  categoryId: string;
  label: string;
  labelEn: string;
  summary: string;
  colors?: ExtractedColor[];
  fonts?: ExtractedFont[];
  animations?: ExtractedAnimation[];
  layoutDescription?: string;
  styleKeywords?: string[];
  notes?: string;
}

export interface StyleGuideColor {
  hex: string;
  name: string;
  role: 'base' | 'main' | 'accent';
}

export interface StyleGuide {
  concept: string;
  colorPalette: StyleGuideColor[];
  typography: string;
  layoutPrinciples: string;
  designMood: string;
}

export interface ExtractionResult {
  categories: CategoryExtraction[];
  overallStyle: string;
  styleGuide?: StyleGuide;
  projectContext?: ProjectContext;
  generatedAt: string;
}

export interface ProjectContext {
  purpose: string;        // 目的・解決すべき課題
  targetAudience: string; // 対象者
  desiredImpression: string; // 与えたい印象
}

export interface ExtractColorsRequest {
  references: {
    type: 'url' | 'image';
    url?: string;
    imageBase64?: string;
    imageMimeType?: string;
    fileName?: string;
    comment: string;
  }[];
  projectContext?: ProjectContext;
}

export interface AnalyzeRequest {
  categories: {
    id: string;
    label: string;
    labelEn: string;
    references: {
      type: 'url' | 'image';
      url?: string;
      imageBase64?: string;
      imageMimeType?: string;
      fileName?: string;
      comment: string;
    }[];
  }[];
  projectContext?: ProjectContext;
  preExtractedColors?: ExtractedColor[];
}

export interface CategoryPrompt {
  categoryId: string;
  label: string;
  prompt: string;
}

export interface GeneratePromptRequest {
  extraction: ExtractionResult;
  additionalContext?: string;
}

export interface GeneratePromptResponse {
  prompts: CategoryPrompt[];
  globalStylePrompt?: string | null;
}
