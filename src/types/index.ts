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
  role: string;
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
  generatedAt: string;
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
}
