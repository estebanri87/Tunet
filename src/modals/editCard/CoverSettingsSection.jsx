import React from 'react';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';
import {
  COVER_ROW_TYPES,
  DEFAULT_POSITION_PRESETS,
  DEFAULT_TILT_PRESETS,
  MAX_PRESETS,
  createRowId,
  getEntityOptionsForRowType,
  normalizeCustomRows,
  normalizePresets,
  reorderRows,
  resolveShowTilt,
  TILT_MODES,
} from './coverRowTypes';

// Status rows may point at any entity, so the picker list is capped.
const MAX_ENTITY_OPTIONS = 150;

const InvertToggle = ({ title, hint, checked, onToggle }) => (
  <div className="popup-surface flex items-center justify-between gap-4 rounded-2xl p-4">
    <div>
      <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
        {title}
      </span>
      <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">{hint}</span>
    </div>
    <button
      onClick={onToggle}
      className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors ${checked ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
    >
      <div
        className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--text-primary)] transition-all ${checked ? 'left-7' : 'left-1'}`}
      />
    </button>
  </div>
);

/* -- Editor for a list of percentage presets -------------------------- */
const PresetEditor = ({ title, hint, values, defaults, onChange, t }) => {
  const [draft, setDraft] = React.useState('');

  const addValue = () => {
    const parsed = Math.round(Number(draft));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return;
    onChange([...values, parsed]);
    setDraft('');
  };

  const isFull = values.length >= MAX_PRESETS;

  return (
    <div className="popup-surface space-y-3 rounded-2xl p-4">
      <div>
        <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {title}
        </span>
        <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">{hint}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="flex items-center gap-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2 text-[11px] font-bold tracking-wider text-[var(--text-primary)] uppercase"
          >
            {`${value}%`}
            <button
              onClick={() => onChange(values.filter((entry) => entry !== value))}
              aria-label={`${t('cover.removePreset')} ${value}%`}
              className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={draft}
          disabled={isFull}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={t('cover.presetValuePlaceholder')}
          className="popup-surface w-24 rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none disabled:opacity-40"
        />
        <button
          onClick={addValue}
          disabled={isFull || draft === ''}
          className="popup-surface popup-surface-hover flex items-center gap-1 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-[11px] font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('cover.addPreset')}
        </button>
        <button
          onClick={() => onChange(defaults)}
          className="ml-auto rounded-xl px-3 py-2 text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase transition-colors hover:text-[var(--text-primary)]"
        >
          {t('cover.resetPresets')}
        </button>
      </div>
    </div>
  );
};

export function CoverSettingsSection({
  t,
  entities,
  editSettings,
  editSettingsKey,
  saveCardSetting,
}) {
  const coverEntity = entities[editSettings.coverId];
  const supportedFeatures = coverEntity?.attributes?.supported_features ?? 0;
  // Mirrors CoverModal: roller shutters may advertise the tilt *services*
  // without having slats, so detection keys on a reported tilt position
  // (CoverEntityFeature.SET_TILT_POSITION or a current_tilt_position value).
  const supportsTiltPosition = (supportedFeatures & 128) !== 0;
  const detectedTilt =
    supportsTiltPosition || typeof coverEntity?.attributes?.current_tilt_position === 'number';
  const supportsTilt = resolveShowTilt(editSettings.tiltMode, detectedTilt);

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

  const removeRow = React.useCallback(
    (id) => {
      persistRows(customRows.filter((row) => row.id !== id));
    },
    [customRows, persistRows]
  );

  const addRow = React.useCallback(() => {
    persistRows([...customRows, { id: createRowId(), label: '', type: 'toggle', entityId: null }]);
  }, [customRows, persistRows]);

  const moveRow = React.useCallback(
    (from, to) => {
      const next = reorderRows(customRows, from, to);
      if (next !== customRows) persistRows(next);
    },
    [customRows, persistRows]
  );

  /* Drag reordering. Pointer events cover mouse and touch alike, so the drag
     handle works on the wall tablet as well as on the desktop. The listeners
     live on the window because reordering moves the handle within the DOM,
     which would drop a pointer capture held by the handle itself. */
  const [draggingId, setDraggingId] = React.useState(null);
  const listRef = React.useRef(null);

  const handleDragMove = React.useCallback(
    (rowId, clientY) => {
      if (!listRef.current) return;
      const rowElements = Array.from(listRef.current.querySelectorAll('[data-cover-row-id]'));
      const targetElement = rowElements.find((element) => {
        const rect = element.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      });
      const targetId = targetElement?.getAttribute('data-cover-row-id');
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

  const presetValues = React.useMemo(
    () => normalizePresets(editSettings.positionPresets, DEFAULT_POSITION_PRESETS),
    [editSettings.positionPresets]
  );
  const tiltPresetValues = React.useMemo(
    () => normalizePresets(editSettings.tiltPresets, DEFAULT_TILT_PRESETS),
    [editSettings.tiltPresets]
  );

  const savePresets = React.useCallback(
    (key, values, defaults) => {
      if (!editSettingsKey) return;
      saveCardSetting(editSettingsKey, key, normalizePresets(values, defaults));
    },
    [editSettingsKey, saveCardSetting]
  );

  return (
    <div className="space-y-4">
      <InvertToggle
        title={t('cover.invertPosition')}
        hint={t('cover.invertPositionHint')}
        checked={editSettings.invertPosition === true}
        onToggle={() =>
          editSettingsKey &&
          saveCardSetting(
            editSettingsKey,
            'invertPosition',
            !(editSettings.invertPosition === true)
          )
        }
      />

      {/* Tilt visibility. Roller shutters sometimes advertise tilt support they
          do not physically have, so the automatic detection can be overridden. */}
      <div className="popup-surface space-y-3 rounded-2xl p-4">
        <div>
          <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('cover.tiltVisibility')}
          </span>
          <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">
            {t('cover.tiltVisibilityHint')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TILT_MODES.map((mode) => {
            const isSelected = (editSettings.tiltMode || 'auto') === mode;
            return (
              <button
                key={mode}
                onClick={() =>
                  editSettingsKey && saveCardSetting(editSettingsKey, 'tiltMode', mode)
                }
                className={`rounded-xl border py-2.5 text-center text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                  isSelected
                    ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                    : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t(`cover.tiltMode.${mode}`)}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] opacity-70">
          {detectedTilt ? t('cover.tiltDetected') : t('cover.tiltNotDetected')}
        </p>
      </div>

      {supportsTilt && (
        <InvertToggle
          title={t('cover.invertTilt')}
          hint={t('cover.invertTiltHint')}
          checked={editSettings.invertTilt === true}
          onToggle={() =>
            editSettingsKey &&
            saveCardSetting(editSettingsKey, 'invertTilt', !(editSettings.invertTilt === true))
          }
        />
      )}

      <PresetEditor
        title={t('cover.positionPresets')}
        hint={t('cover.positionPresetsHint')}
        values={presetValues}
        defaults={DEFAULT_POSITION_PRESETS}
        onChange={(values) => savePresets('positionPresets', values, DEFAULT_POSITION_PRESETS)}
        t={t}
      />

      {supportsTilt && supportsTiltPosition && (
        <PresetEditor
          title={t('cover.tiltPresets')}
          hint={t('cover.tiltPresetsHint')}
          values={tiltPresetValues}
          defaults={DEFAULT_TILT_PRESETS}
          onChange={(values) => savePresets('tiltPresets', values, DEFAULT_TILT_PRESETS)}
          t={t}
        />
      )}

      <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
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
                data-cover-row-id={row.id}
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
                    onClick={() => removeRow(row.id)}
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
                    {COVER_ROW_TYPES.map((type) => {
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
                            updateRow(row.id, {
                              type,
                              entityId: stillValid ? row.entityId : null,
                            });
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
          onClick={addRow}
          className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('cover.addCustomRow')}
        </button>
      </div>
    </div>
  );
}

export default CoverSettingsSection;
