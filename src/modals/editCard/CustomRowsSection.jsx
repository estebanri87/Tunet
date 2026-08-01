import React from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';
import {
  CUSTOM_ROW_TYPES,
  createRowId,
  getEntityOptionsForRowType,
  normalizeCustomRows,
  reorderRows,
} from './customRows';

// Status rows may point at any entity, so the picker list is capped.
const MAX_ENTITY_OPTIONS = 150;

/**
 * Editor for the user-defined rows of an entity popup: a free label, a type
 * (toggle / status / action) and any entity. Shared by the cover, light and
 * sensor popups.
 *
 * The translations live under the `cover.*` keys where they were introduced;
 * their wording is generic, so they are reused rather than duplicated.
 */
export function CustomRowsSection({ t, entities, editSettings, editSettingsKey, saveCardSetting }) {
  const customRows = React.useMemo(
    () => normalizeCustomRows(editSettings.customRows),
    [editSettings.customRows]
  );

  const persistRows = React.useCallback(
    (rows) => {
      if (!editSettingsKey) return;
      saveCardSetting(editSettingsKey, 'customRows', rows);
    },
    [editSettingsKey, saveCardSetting]
  );

  const updateRow = React.useCallback(
    (id, patch) => {
      persistRows(customRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    },
    [customRows, persistRows]
  );

  const moveRow = React.useCallback(
    (from, to) => {
      const next = reorderRows(customRows, from, to);
      if (next !== customRows) persistRows(next);
    },
    [customRows, persistRows]
  );

  /* Drag reordering. Pointer events cover mouse and touch alike; the listeners
     live on the window because reordering moves the handle within the DOM,
     which would drop a pointer capture held by the handle itself. */
  const [draggingId, setDraggingId] = React.useState(null);
  const listRef = React.useRef(null);

  const handleDragMove = React.useCallback(
    (rowId, clientY) => {
      if (!listRef.current) return;
      const rowElements = Array.from(listRef.current.querySelectorAll('[data-custom-row-id]'));
      const targetElement = rowElements.find((element) => {
        const rect = element.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      });
      const targetId = targetElement?.getAttribute('data-custom-row-id');
      if (!targetId || targetId === rowId) return;
      moveRow(
        customRows.findIndex((row) => row.id === rowId),
        customRows.findIndex((row) => row.id === targetId)
      );
    },
    [customRows, moveRow]
  );

  React.useEffect(() => {
    if (!draggingId) return undefined;
    const handleMove = (e) => handleDragMove(draggingId, e.clientY);
    const handleEnd = () => setDraggingId(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };
  }, [draggingId, handleDragMove]);

  return (
    <div className="space-y-3">
      <div className="px-1">
        <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {t('cover.customRows')}
        </span>
        <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">
          {t('cover.customRowsHint')}
        </span>
      </div>

      {customRows.length === 0 && (
        <p className="popup-surface rounded-2xl px-4 py-6 text-center text-xs text-[var(--text-muted)]">
          {t('cover.noCustomRows')}
        </p>
      )}

      <div ref={listRef} className={`space-y-3 ${draggingId ? 'select-none' : ''}`}>
        {customRows.map((row, index) => {
          const options = getEntityOptionsForRowType(row.type, entities);
          return (
            <div
              key={row.id}
              data-custom-row-id={row.id}
              className={`popup-surface space-y-3 rounded-2xl p-4 transition-opacity ${draggingId === row.id ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    aria-label={t('cover.reorderCustomRow')}
                    className="-ml-1 cursor-grab touch-none rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] active:cursor-grabbing"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDraggingId(row.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        moveRow(index, index - 1);
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        moveRow(index, index + 1);
                      }
                    }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                    {`${t('cover.customRow')} ${index + 1}`}
                  </span>
                </div>
                <button
                  onClick={() => persistRows(customRows.filter((entry) => entry.id !== row.id))}
                  aria-label={t('cover.removeCustomRow')}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="ml-4 text-xs font-bold text-[var(--text-muted)] uppercase">
                  {t('cover.rowLabel')}
                </label>
                <input
                  type="text"
                  value={row.label || ''}
                  onChange={(e) => updateRow(row.id, { label: e.target.value })}
                  placeholder={t('cover.rowLabelPlaceholder')}
                  className="popup-surface mt-2 w-full rounded-2xl px-5 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div>
                <label className="ml-4 text-xs font-bold text-[var(--text-muted)] uppercase">
                  {t('cover.rowKind')}
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {CUSTOM_ROW_TYPES.map((type) => {
                    const isSelected = row.type === type;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          if (isSelected) return;
                          // The entity list differs per type, so a stale selection is dropped.
                          const stillValid =
                            row.entityId &&
                            getEntityOptionsForRowType(type, entities).includes(row.entityId);
                          updateRow(row.id, { type, entityId: stillValid ? row.entityId : null });
                        }}
                        className={`rounded-xl border py-2.5 text-center text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                          isSelected
                            ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                            : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {t(`cover.rowType.${type}`)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 ml-4 text-[11px] text-[var(--text-muted)] opacity-70">
                  {t(`cover.rowKindHint.${row.type}`)}
                </p>
              </div>

              <SearchableSelect
                label={t('cover.rowEntity')}
                value={row.entityId}
                options={options}
                onChange={(value) => updateRow(row.id, { entityId: value })}
                placeholder={t('dropdown.noneSelected')}
                entities={entities}
                t={t}
                maxOptions={MAX_ENTITY_OPTIONS}
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={() =>
          persistRows([
            ...customRows,
            { id: createRowId(), label: '', type: 'toggle', entityId: null },
          ])
        }
        className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('cover.addCustomRow')}
      </button>
    </div>
  );
}

export default CustomRowsSection;
