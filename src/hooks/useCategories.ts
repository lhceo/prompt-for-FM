import { useState, useCallback } from 'react';
import type { Category, UrlReference, ImageReference } from '../types';

const INITIAL_CATEGORIES: Omit<Category, 'references'>[] = [
  {
    id: 'visual-impression',
    label: '見た目の印象',
    labelEn: 'Visual Impression',
    description: '全体的なデザインの印象・ムード・テイストの参考',
  },
  {
    id: 'colors',
    label: '色',
    labelEn: 'Colors',
    description: 'カラーパレット・配色の参考',
  },
  {
    id: 'fonts',
    label: 'フォント',
    labelEn: 'Fonts',
    description: '書体・タイポグラフィの参考',
  },
  {
    id: 'layout',
    label: 'レイアウト',
    labelEn: 'Layout',
    description: '構成・グリッド・配置の参考',
  },
  {
    id: 'photos',
    label: '写真',
    labelEn: 'Photos',
    description: '写真のトーン・スタイルの参考',
  },
  {
    id: 'illustrations',
    label: 'イラスト',
    labelEn: 'Illustrations',
    description: 'イラストのタッチ・スタイルの参考',
  },
  {
    id: 'icons',
    label: 'アイコン',
    labelEn: 'Icons',
    description: 'アイコンデザインの参考',
  },
  {
    id: 'diagrams',
    label: '絵図',
    labelEn: 'Diagrams',
    description: '図表・インフォグラフィックの参考',
  },
  {
    id: 'header',
    label: 'ヘッダー',
    labelEn: 'Header / Global Navigation',
    description: 'ヘッダー・グローバルナビゲーションの参考',
  },
  {
    id: 'footer',
    label: 'フッター',
    labelEn: 'Footer',
    description: 'フッターデザインの参考',
  },
  {
    id: 'main-visual',
    label: 'メインビジュアル',
    labelEn: 'Main Visual',
    description: 'ファーストビュー・ヒーローセクションの参考',
  },
  {
    id: 'buttons',
    label: 'ボタン',
    labelEn: 'Buttons',
    description: 'ボタンデザイン・CTAの参考',
  },
  {
    id: 'blog',
    label: 'ブログ',
    labelEn: 'Blog',
    description: 'ブログ・記事一覧・詳細ページの参考',
  },
  {
    id: 'news',
    label: 'ニュース',
    labelEn: 'News',
    description: 'ニュース・お知らせセクションの参考',
  },
  {
    id: 'symbol-motif',
    label: 'シンボルモチーフ',
    labelEn: 'Symbol Motif',
    description: 'シンボル・グラフィックモチーフの参考',
  },
  {
    id: 'parallax',
    label: 'パララックス',
    labelEn: 'Parallax',
    description: 'パララックス・スクロール連動アニメーションの参考（GSAP, ScrollMagic等）',
  },
  {
    id: 'hover-animation',
    label: 'ホバーアニメーション',
    labelEn: 'Hover Animation',
    description: 'ホバー時のアニメーション・インタラクションの参考',
  },
  {
    id: 'transition',
    label: 'トランジション',
    labelEn: 'Transition',
    description: 'ページ・要素間のトランジション効果の参考',
  },
];

function createDefaultCategory(base: Omit<Category, 'references'>): Category {
  return { ...base, references: [] };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(
    INITIAL_CATEGORIES.map(createDefaultCategory)
  );

  const addUrlReference = useCallback((categoryId: string) => {
    setCategories(prev =>
      prev.map(cat => {
        if (cat.id !== categoryId) return cat;
        const newRef: UrlReference = {
          id: generateId(),
          type: 'url',
          url: '',
          comment: '',
        };
        return { ...cat, references: [...cat.references, newRef] };
      })
    );
  }, []);

  const addImageReference = useCallback((categoryId: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setCategories(prev =>
      prev.map(cat => {
        if (cat.id !== categoryId) return cat;
        const newRef: ImageReference = {
          id: generateId(),
          type: 'image',
          file,
          previewUrl,
          fileName: file.name,
          comment: '',
        };
        return { ...cat, references: [...cat.references, newRef] };
      })
    );
  }, []);

  const updateReference = useCallback((
    categoryId: string,
    refId: string,
    updates: { url?: string; comment?: string }
  ) => {
    setCategories(prev =>
      prev.map(cat => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          references: cat.references.map(ref =>
            ref.id === refId ? { ...ref, ...updates } : ref
          ),
        };
      })
    );
  }, []);

  const removeReference = useCallback((categoryId: string, refId: string) => {
    setCategories(prev =>
      prev.map(cat => {
        if (cat.id !== categoryId) return cat;
        const ref = cat.references.find(r => r.id === refId);
        if (ref && ref.type === 'image' && ref.previewUrl) {
          URL.revokeObjectURL(ref.previewUrl);
        }
        return {
          ...cat,
          references: cat.references.filter(r => r.id !== refId),
        };
      })
    );
  }, []);

  const getTotalReferenceCount = useCallback(() => {
    return categories.reduce((sum, cat) => sum + cat.references.length, 0);
  }, [categories]);

  const getFilledCategoryCount = useCallback(() => {
    return categories.filter(cat => cat.references.length > 0).length;
  }, [categories]);

  return {
    categories,
    addUrlReference,
    addImageReference,
    updateReference,
    removeReference,
    getTotalReferenceCount,
    getFilledCategoryCount,
  };
}
