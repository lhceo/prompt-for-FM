import { useState, useCallback, useEffect } from 'react';
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
    description: 'ヘッダー・グローバルナビゲーションの参考（ナビメニューのホバーアニメーション参考も登録可）',
  },
  {
    id: 'footer',
    label: 'フッター',
    labelEn: 'Footer',
    description: 'フッターデザインの参考（リンクのホバーアニメーション参考も登録可）',
  },
  {
    id: 'main-visual',
    label: 'メインビジュアル',
    labelEn: 'Main Visual',
    description: 'ファーストビュー・ヒーローセクションの参考（ホバーアニメーション参考も登録可）',
  },
  {
    id: 'buttons',
    label: 'ボタン',
    labelEn: 'Buttons',
    description: 'ボタンデザイン・CTAの参考（ホバーアニメーション参考も登録可）',
  },
  {
    id: 'blog',
    label: 'ブログ',
    labelEn: 'Blog',
    description: 'ブログ・記事一覧・詳細ページの参考（サムネイル・カードのホバーアニメーション参考も登録可）',
  },
  {
    id: 'news',
    label: 'ニュース',
    labelEn: 'News',
    description: 'ニュース・お知らせセクションの参考（カードのホバーアニメーション参考も登録可）',
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

// ── localStorage persistence ────────────────────────────────────────────────

const STORAGE_KEY = 'figma-prompt-refs-v1';

interface StoredRef {
  id: string;
  type: 'url' | 'image';
  url?: string;
  comment: string;
  imageDataUrl?: string;
  fileName?: string;
}

interface StoredCategory {
  id: string;
  refs: StoredRef[];
}

function saveToStorage(categories: Category[]) {
  try {
    const data: StoredCategory[] = categories.map(cat => ({
      id: cat.id,
      refs: cat.references.map(ref => {
        if (ref.type === 'url') {
          return { id: ref.id, type: 'url' as const, url: ref.url, comment: ref.comment };
        }
        return {
          id: ref.id,
          type: 'image' as const,
          comment: ref.comment,
          imageDataUrl: ref.imageDataUrl,
          fileName: ref.fileName,
        };
      }),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or unavailable — silently ignore
  }
}

function loadFromStorage(bases: Omit<Category, 'references'>[]): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return bases.map(createDefaultCategory);

    const stored: StoredCategory[] = JSON.parse(raw);

    return bases.map(base => {
      const s = stored.find(x => x.id === base.id);
      if (!s || s.refs.length === 0) return createDefaultCategory(base);

      const references = s.refs.map(ref => {
        if (ref.type === 'url') {
          return {
            id: ref.id,
            type: 'url' as const,
            url: ref.url ?? '',
            comment: ref.comment,
          } as UrlReference;
        }
        return {
          id: ref.id,
          type: 'image' as const,
          previewUrl: ref.imageDataUrl, // use data URL directly as preview
          fileName: ref.fileName,
          comment: ref.comment,
          imageDataUrl: ref.imageDataUrl,
        } as ImageReference;
      });

      return { ...base, references };
    });
  } catch {
    return bases.map(createDefaultCategory);
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(
    () => loadFromStorage(INITIAL_CATEGORIES)
  );

  // Auto-save to localStorage whenever categories change
  useEffect(() => {
    saveToStorage(categories);
  }, [categories]);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCategories(INITIAL_CATEGORIES.map(createDefaultCategory));
  }, []);

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

  const addImageReference = useCallback(async (categoryId: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const imageDataUrl = await fileToDataUrl(file);

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
          imageDataUrl,
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
        if (ref && ref.type === 'image' && ref.previewUrl?.startsWith('blob:')) {
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
    clearAll,
  };
}
