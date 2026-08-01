import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';
import {
  MAX_STATUS_ENTITIES,
  MAX_STATUS_SOURCES,
  createStatusItemId,
  createStatusSource,
  getItemSources,
  getStatusItems,
  isSourceActive,
} from '../../components/cards/statusCardUtils';

const MAX_ENTITY_OPTIONS = 150;

const TextField = ({ label, value, placeholder, onChange }) => (
  <div className="flex-1">
    <label className="ml-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
      {label}
    </label>
    <input
      type="text"
      defaultValue={value || ''}
      placeholder={placeholder}
      onBlur={(e) => onChange(e.target.value.trim() || null)}
      className="popup-surface mt-1 w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
    />
  </div>
);

const Toggle = ({ title, hint, checked, onToggle }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--glass-bg)] p-3">
    <div>
      <span className="block text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
        {title}
      </span>
      {hint && (
        <span className="mt-1 block text-[10px] text-[var(--text-muted)] opacity-70">{hint}</span>
      )}
    </div>
    <button
      onClick={onToggle}
      className="relative h-6 w-12 flex-shrink-0 rounded-full bg-[var(--glass-bg-hover)] transition-colors"
    >
      <div
        className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--text-primary)] transition-all ${checked ? 'left-7' : 'left-1'}`}
      />
    </button>
  </div>
);

/** One sensor of an entry: which entity, when it counts, what it then reads. */
const SourceEditor = ({ source, index, total, entities, entityOptions, t, onUpdate, onRemove }) => {
  const entity = source.entityId ? entities[source.entityId] : null;
  const active = isSourceActive(source, entity);

  return (
    <div className="space-y-3 rounded-xl bg-[var(--glass-bg)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {`${t('statusCard.source')} ${index + 1}`}
        </span>
        {total > 1 && (
          <button
            onClick={onRemove}
            aria-label={t('statusCard.removeSource')}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <SearchableSelect
        label={t('statusCard.entity')}
        value={source.entityId}
        options={entityOptions}
        onChange={(value) => onUpdate({ entityId: value })}
        placeholder={t('dropdown.noneSelected')}
        entities={entities}
        t={t}
        maxOptions={MAX_ENTITY_OPTIONS}
      />

      {/* The live state, so the exact wording for the field below is visible. */}
      {entity && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--glass-bg-hover)] px-3 py-2">
          <span className="text-[10px] tracking-widest text-[var(--text-muted)] uppercase">
            {t('statusCard.currentState')}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--text-primary)]">{entity.state}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${active ? 'bg-sky-500/20 text-sky-300' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`}
            >
              {active ? t('statusCard.stateActive') : t('statusCard.stateInactive')}
            </span>
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="ml-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('statusCard.activeStates')}
          </label>
          <input
            type="text"
            defaultValue={source.activeStates || ''}
            placeholder={entity ? entity.state : 'on, open'}
            onBlur={(e) => onUpdate({ activeStates: e.target.value.trim() || null })}
            className="popup-surface mt-1 w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>
        <TextField
          label={t('statusCard.activeText')}
          value={source.activeText}
          placeholder={t('statusCard.activeTextPlaceholder')}
          onChange={(value) => onUpdate({ activeText: value })}
        />
      </div>

      <Toggle
        title={t('statusCard.invert')}
        hint={t('statusCard.invertHint')}
        checked={source.invert === true}
        onToggle={() => onUpdate({ invert: !(source.invert === true) })}
      />
    </div>
  );
};

/** One entry: a thing in the home, watched through one or more sensors. */
const StatusItemEditor = ({ item, index, entities, entityOptions, t, onUpdate, onRemove }) => {
  const sources = getItemSources(item);

  const updateSources = (next) => onUpdate({ sources: next, entityId: undefined });

  return (
    <div className="popup-surface space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {`${t('statusCard.entry')} ${index + 1}`}
        </span>
        <button
          onClick={onRemove}
          aria-label={t('statusCard.removeEntry')}
          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <TextField
        label={t('statusCard.itemLabel')}
        value={item.label}
        placeholder={t('statusCard.itemLabelPlaceholder')}
        onChange={(value) => onUpdate({ label: value })}
      />

      {sources.length > 1 && (
        <p className="ml-1 text-[10px] text-[var(--text-muted)] opacity-70">
          {t('statusCard.sourceOrderHint')}
        </p>
      )}

      {sources.map((source, sourceIndex) => (
        <SourceEditor
          key={source.id || sourceIndex}
          source={source}
          index={sourceIndex}
          total={sources.length}
          entities={entities}
          entityOptions={entityOptions}
          t={t}
          onUpdate={(patch) =>
            updateSources(sources.map((s, i) => (i === sourceIndex ? { ...s, ...patch } : s)))
          }
          onRemove={() => updateSources(sources.filter((_, i) => i !== sourceIndex))}
        />
      ))}

      {sources.length < MAX_STATUS_SOURCES && (
        <button
          onClick={() => updateSources([...sources, createStatusSource()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('statusCard.addSource')}
        </button>
      )}

      <TextField
        label={t('statusCard.inactiveText')}
        value={item.inactiveText}
        placeholder={t('statusCard.inactiveTextPlaceholder')}
        onChange={(value) => onUpdate({ inactiveText: value })}
      />

      <Toggle
        title={t('statusCard.alwaysShow')}
        hint={t('statusCard.alwaysShowHint')}
        checked={item.alwaysShow === true}
        onToggle={() => onUpdate({ alwaysShow: !(item.alwaysShow === true) })}
      />
    </div>
  );
};

export function StatusCardSection({ t, entities, editSettings, editSettingsKey, saveCardSetting }) {
  const items = React.useMemo(() => getStatusItems(editSettings), [editSettings]);

  const entityOptions = React.useMemo(
    () =>
      Object.keys(entities || {}).sort((a, b) => {
        const nameA = entities[a]?.attributes?.friendly_name || a;
        const nameB = entities[b]?.attributes?.friendly_name || b;
        return nameA.localeCompare(nameB);
      }),
    [entities]
  );

  const persist = (next) => {
    if (!editSettingsKey) return;
    saveCardSetting(editSettingsKey, 'items', next);
  };

  return (
    <div className="space-y-4">
      <div className="px-1">
        <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {t('statusCard.entities')}
        </span>
        <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">
          {t('statusCard.entitiesHint')}
        </span>
      </div>

      {items.length === 0 && (
        <p className="popup-surface rounded-2xl px-4 py-6 text-center text-xs text-[var(--text-muted)]">
          {t('statusCard.noEntries')}
        </p>
      )}

      {items.map((item, index) => (
        <StatusItemEditor
          key={item.id || index}
          item={item}
          index={index}
          entities={entities}
          entityOptions={entityOptions}
          t={t}
          onUpdate={(patch) =>
            persist(items.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
          }
          onRemove={() => persist(items.filter((_, i) => i !== index))}
        />
      ))}

      {items.length < MAX_STATUS_ENTITIES && (
        <button
          onClick={() =>
            persist([...items, { id: createStatusItemId(), sources: [createStatusSource()] }])
          }
          className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('statusCard.addEntry')}
        </button>
      )}

      <div className="space-y-2 border-t border-[var(--glass-border)] pt-4">
        <label className="ml-1 text-xs font-bold text-[var(--text-muted)] uppercase">
          {t('statusCard.emptyText')}
        </label>
        <input
          type="text"
          defaultValue={editSettings.emptyText || ''}
          onBlur={(e) =>
            editSettingsKey &&
            saveCardSetting(editSettingsKey, 'emptyText', e.target.value.trim() || null)
          }
          placeholder={t('statusCard.allClear')}
          className="popup-surface w-full rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        <p className="ml-1 text-[11px] text-[var(--text-muted)] opacity-70">
          {t('statusCard.emptyTextHint')}
        </p>
      </div>

      <div className="popup-surface flex items-center justify-between gap-4 rounded-2xl p-4">
        <span className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {t('statusCard.showState')}
        </span>
        <button
          onClick={() =>
            editSettingsKey &&
            saveCardSetting(editSettingsKey, 'showState', editSettings.showState === false)
          }
          className="relative h-6 w-12 flex-shrink-0 rounded-full bg-[var(--glass-bg-hover)] transition-colors"
        >
          <div
            className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--text-primary)] transition-all ${editSettings.showState !== false ? 'left-7' : 'left-1'}`}
          />
        </button>
      </div>
    </div>
  );
}

export default StatusCardSection;
