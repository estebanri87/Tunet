import React from 'react';
import { Plus, X } from 'lucide-react';
import {
  DEFAULT_POSITION_PRESETS,
  DEFAULT_TILT_PRESETS,
  MAX_PRESETS,
  normalizePresets,
  resolveShowTilt,
  TILT_MODES,
} from './coverRowTypes';
import { CustomRowsSection } from './CustomRowsSection';

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

      <div className="border-t border-[var(--glass-border)] pt-4">
        <CustomRowsSection
          t={t}
          entities={entities}
          editSettings={editSettings}
          editSettingsKey={editSettingsKey}
          saveCardSetting={saveCardSetting}
        />
      </div>
    </div>
  );
}

export default CoverSettingsSection;
