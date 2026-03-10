import React, { useState, useRef } from 'react';
import type { ExtractedColor, ColorPaletteData, ColorRatio } from '../types';

const ROLE_CONFIG = {
  base:   { label: 'ベース',   labelEn: 'Base',   style: 'bg-gray-100 text-gray-600',   border: 'border-gray-200', ring: 'ring-gray-300' },
  main:   { label: 'メイン',   labelEn: 'Main',   style: 'bg-blue-100 text-blue-700',   border: 'border-blue-200', ring: 'ring-blue-300' },
  accent: { label: 'アクセント', labelEn: 'Accent', style: 'bg-amber-100 text-amber-700', border: 'border-amber-200', ring: 'ring-amber-300' },
} as const;

const ROLES = ['base', 'main', 'accent'] as const;
type Role = typeof ROLES[number];

function generateId() {
  return Math.random().toString(36).slice(2);
}

interface ColorCardProps {
  color: ExtractedColor;
  onUpdate: (updates: Partial<ExtractedColor>) => void;
  onRemove: () => void;
}

function ColorCard({ color, onUpdate, onRemove }: ColorCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(color.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameValue.trim()) onUpdate({ name: nameValue.trim() });
    else setNameValue(color.name);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ hex: e.target.value });
  };

  const handleRoleChange = (role: Role) => {
    onUpdate({ role });
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 group">
      {/* Color picker */}
      <label className="relative flex-shrink-0 cursor-pointer">
        <div
          className="w-9 h-9 rounded-md shadow-sm border-2 border-white ring-1 ring-gray-200 transition-transform group-hover:scale-105"
          style={{ backgroundColor: color.hex }}
        />
        <input
          type="color"
          value={color.hex}
          onChange={handleHexChange}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') nameInputRef.current?.blur(); }}
            className="text-xs font-medium w-full border-b border-indigo-400 outline-none bg-transparent text-gray-800 leading-tight"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setEditingName(true); setNameValue(color.name); }}
            className="text-xs font-medium text-gray-700 leading-tight text-left hover:text-indigo-600 transition-colors truncate max-w-full block"
            title="クリックして名前を編集"
          >
            {color.name || '(名前なし)'}
          </button>
        )}
        <div className="text-xs text-gray-400 leading-tight font-mono">{color.hex}</div>
      </div>

      {/* Role selector */}
      <div className="flex gap-1 flex-shrink-0">
        {ROLES.map(r => (
          <button
            key={r}
            onClick={() => handleRoleChange(r)}
            className={`text-xs px-1.5 py-0.5 rounded font-medium transition-all ${
              color.role === r
                ? ROLE_CONFIG[r].style + ' ring-1 ' + ROLE_CONFIG[r].ring
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={ROLE_CONFIG[r].label}
          >
            {ROLE_CONFIG[r].label[0]}
          </button>
        ))}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-1"
        title="削除"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface AddColorFormProps {
  role: Role;
  onAdd: (color: ExtractedColor) => void;
  onCancel: () => void;
}

function AddColorForm({ role, onAdd, onCancel }: AddColorFormProps) {
  const [hex, setHex] = useState('#3B82F6');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hex) return;
    onAdd({
      hex,
      name: name.trim() || hex,
      role,
      usage: '手動追加',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
      <label className="relative flex-shrink-0 cursor-pointer">
        <div
          className="w-9 h-9 rounded-md shadow-sm border-2 border-white ring-1 ring-indigo-300"
          style={{ backgroundColor: hex }}
        />
        <input
          type="color"
          value={hex}
          onChange={e => setHex(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>
      <div className="flex-1 min-w-0 flex gap-1.5">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="色の名前（省略可）"
          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          type="submit"
          className="text-xs bg-indigo-500 text-white px-2 py-1 rounded font-medium hover:bg-indigo-600 transition-colors"
        >
          追加
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 px-1 py-1 transition-colors"
        >
          ✕
        </button>
      </div>
    </form>
  );
}

interface RatioEditorProps {
  ratio: ColorRatio;
  onChange: (ratio: ColorRatio) => void;
}

function RatioEditor({ ratio, onChange }: RatioEditorProps) {
  const handleChange = (role: Role, value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    const others = ROLES.filter(r => r !== role);
    const remaining = 100 - clamped;
    const otherTotal = ratio[others[0]] + ratio[others[1]];
    let newRatio: ColorRatio;
    if (otherTotal === 0) {
      newRatio = { ...ratio, [role]: clamped, [others[0]]: Math.round(remaining / 2), [others[1]]: remaining - Math.round(remaining / 2) };
    } else {
      newRatio = {
        ...ratio,
        [role]: clamped,
        [others[0]]: Math.round(ratio[others[0]] / otherTotal * remaining),
        [others[1]]: remaining - Math.round(ratio[others[0]] / otherTotal * remaining),
      };
    }
    onChange(newRatio);
  };

  const ROLE_COLORS = { base: '#6B7280', main: '#3B82F6', accent: '#F59E0B' };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">使用バランス</span>
        <span className="text-xs text-gray-400">合計100%</span>
      </div>

      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-3 shadow-inner bg-gray-100">
        {ROLES.map(r => (
          <div
            key={r}
            style={{ width: `${ratio[r]}%`, backgroundColor: ROLE_COLORS[r] }}
            className="transition-all duration-300"
            title={`${ROLE_CONFIG[r].label}: ${ratio[r]}%`}
          />
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-2">
        {ROLES.map(r => (
          <div key={r} className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${ROLE_CONFIG[r].style} flex-shrink-0 w-20 text-center`}>
              {ROLE_CONFIG[r].label}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={ratio[r]}
              onChange={e => handleChange(r, Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full accent-indigo-500"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                type="number"
                min={0}
                max={100}
                value={ratio[r]}
                onChange={e => handleChange(r, Number(e.target.value))}
                className="w-12 text-xs text-right border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ColorPaletteEditorProps {
  palette: ColorPaletteData;
  hasReferences: boolean;
  isExtracting: boolean;
  onExtract: () => void;
  onChange: (palette: ColorPaletteData) => void;
}

export default function ColorPaletteEditor({
  palette,
  hasReferences,
  isExtracting,
  onExtract,
  onChange,
}: ColorPaletteEditorProps) {
  const [addingRole, setAddingRole] = useState<Role | null>(null);

  const updateColor = (id: string, updates: Partial<ExtractedColor>) => {
    // Colors are identified by index since ExtractedColor has no id; we use a workaround via closure
    const newColors = palette.colors.map(c => (c as ExtractedColor & { _id?: string })._id === id ? { ...c, ...updates } : c);
    onChange({ ...palette, colors: newColors });
  };

  const removeColor = (id: string) => {
    const newColors = palette.colors.filter(c => (c as ExtractedColor & { _id?: string })._id !== id);
    onChange({ ...palette, colors: newColors });
  };

  const addColor = (color: ExtractedColor) => {
    const colorWithId = { ...color, _id: generateId() };
    onChange({ ...palette, colors: [...palette.colors, colorWithId] });
    setAddingRole(null);
  };

  // Ensure colors have internal IDs (for keying)
  const colorsWithIds = palette.colors.map(c => {
    const cWithId = c as ExtractedColor & { _id?: string };
    if (!cWithId._id) cWithId._id = generateId();
    return cWithId;
  });

  return (
    <div className="mt-3 space-y-3">
      {/* AI extract button */}
      {hasReferences && (
        <button
          onClick={onExtract}
          disabled={isExtracting}
          className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:from-violet-600 hover:to-indigo-600 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isExtracting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              色を抽出中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              {palette.colors.length > 0 ? 'AIで色を再抽出する' : 'AIで色を抽出する'}
            </>
          )}
        </button>
      )}

      {/* Color sections by role */}
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
        {ROLES.map(role => {
          const roleColors = colorsWithIds.filter(c => c.role === role);
          const cfg = ROLE_CONFIG[role];
          return (
            <div key={role}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.style}`}>
                  {cfg.label}
                </span>
                {addingRole !== role && (
                  <button
                    onClick={() => setAddingRole(role)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    手動追加
                  </button>
                )}
              </div>

              {/* Existing colors */}
              <div className="space-y-1.5">
                {roleColors.map(c => (
                  <ColorCard
                    key={c._id}
                    color={c}
                    onUpdate={updates => updateColor(c._id!, updates)}
                    onRemove={() => removeColor(c._id!)}
                  />
                ))}
                {roleColors.length === 0 && addingRole !== role && (
                  <p className="text-xs text-gray-400 text-center py-1.5 border border-dashed border-gray-200 rounded-lg">
                    まだ{cfg.label}色がありません
                  </p>
                )}
                {addingRole === role && (
                  <AddColorForm
                    role={role}
                    onAdd={addColor}
                    onCancel={() => setAddingRole(null)}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Ratio editor — show when at least 1 color exists */}
        {palette.colors.length > 0 && (
          <div className="border-t border-gray-200 pt-3">
            <RatioEditor
              ratio={palette.ratio}
              onChange={ratio => onChange({ ...palette, ratio })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
