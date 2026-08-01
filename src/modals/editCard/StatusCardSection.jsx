import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';
import IconPicker from '../../components/ui/IconPicker';
import { getIconComponent } from '../../icons';
import {
  MAX_STATUS_ENTITIES,
  MAX_STATUS_SOURCES,
  MAX_STATUS_CATEGORIES,
  UNGROUPED_CATEGORY_ID,
  createStatusCategory,
  createStatusItemId,
  createStatusRule,
  createStatusSource,
  getStatusCategories,
  getItemRules,
  getItemSources,
  getStatusItems,
  isSourceActive,
  matchesRule,
} from '../../components/cards/statusCardUtils';

const CONDITION_CHOICES = ['active', 'inactive', 'any'];

const MAX_ENTITY_OPTIONS = 150;

/** Compact icon chooser used for categories, entries and states. */
const IconField = ({ label, value, t, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const Selected = value ? getIconComponent(value) : null;

  return (
    <div>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="popup-surface popup-surface-hover flex w-full items-center justify-between rounded-xl px-3 py-2"
      >
        <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
          {Selected ? <Selected className="h-4 w-4 text-[var(--text-primary)]" /> : null}
          {label}
        </span>
        <span className="truncate text-[10px] text-[var(--text-muted)]">
          {value || t('dropdown.noneSelected')}
        </span>
      </button>
      {open && (
        <div className="mt-2">
          <IconPicker
            value={value}
            onSelect={(iconName) => {
              onChange(iconName);
              setOpen(false);
            }}
            onClear={() => onChange(null)}
            t={t}
            maxHeightClass="max-h-56"
          />
        </div>
      )}
    </div>
  );
};

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

/**
 * One rule: which combination of sensor states means what. Sensors left on
 * "any" are ignored, so a rule only names the sensors it cares about.
 */
const RuleEditor = ({ rule, index, sources, entities, matched, t, onUpdate, onRemove }) => (
  <div
    className={`space-y-3 rounded-xl p-3 transition-colors ${matched ? 'bg-sky-500/10' : 'bg-[var(--glass-bg)]'}`}
  >
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
        {`${t('statusCard.rule')} ${index + 1}`}
      </span>
      {matched && (
        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[9px] font-bold tracking-wider text-sky-300 uppercase">
          {t('statusCard.ruleMatches')}
        </span>
      )}
      <button
        onClick={onRemove}
        aria-label={t('statusCard.removeRule')}
        className="ml-auto rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>

    <input
      type="text"
      defaultValue={rule.text || ''}
      placeholder={t('statusCard.ruleTextPlaceholder')}
      onBlur={(e) => onUpdate({ text: e.target.value })}
      className="popup-surface w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
    />

    <IconField
      label={t('statusCard.ruleIcon')}
      value={rule.icon}
      t={t}
      onChange={(icon) => onUpdate({ icon })}
    />

    <div className="space-y-2">
      {sources.map((source, sourceIndex) => {
        const current = rule.conditions?.[source.id] || 'any';
        const entity = source.entityId ? entities[source.entityId] : null;
        return (
          <div key={source.id} className="space-y-1">
            <span className="ml-1 block truncate text-[10px] text-[var(--text-muted)]">
              {`${t('statusCard.source')} ${sourceIndex + 1}: ${entity?.attributes?.friendly_name || source.entityId || '—'}`}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {CONDITION_CHOICES.map((choice) => (
                <button
                  key={choice}
                  onClick={() =>
                    onUpdate({ conditions: { ...(rule.conditions || {}), [source.id]: choice } })
                  }
                  className={`rounded-lg py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                    current === choice
                      ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                      : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                  }`}
                >
                  {t(`statusCard.condition.${choice}`)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/** One entry: a thing in the home, watched through one or more sensors. */
const StatusItemEditor = ({
  item,
  index,
  entities,
  entityOptions,
  categories,
  t,
  onUpdate,
  onRemove,
}) => {
  const sources = getItemSources(item);
  const rules = getItemRules(item);

  const updateSources = (next) => onUpdate({ sources: next, entityId: undefined });
  const updateRules = (next) => onUpdate({ rules: next });

  /* Dropping a sensor also drops its conditions, so no rule is left pointing
     at something that no longer exists. */
  const removeSource = (sourceIndex) => {
    const removed = sources[sourceIndex];
    onUpdate({
      sources: sources.filter((_, i) => i !== sourceIndex),
      entityId: undefined,
      rules: rules.map((rule) => {
        const conditions = { ...(rule.conditions || {}) };
        delete conditions[removed?.id];
        return { ...rule, conditions };
      }),
    });
  };

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

      {categories.length > 0 && (
        <div>
          <label className="ml-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('statusCard.category')}
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {[{ id: UNGROUPED_CATEGORY_ID, name: t('statusCard.noCategory') }, ...categories].map(
              (category) => {
                const current = item.categoryId || UNGROUPED_CATEGORY_ID;
                const isSelected = current === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => onUpdate({ categoryId: category.id })}
                    className={`rounded-xl px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                      isSelected
                        ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                        : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {category.name?.trim() || t('statusCard.unnamedCategory')}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      <IconField
        label={t('statusCard.itemIcon')}
        value={item.icon}
        t={t}
        onChange={(icon) => onUpdate({ icon })}
      />

      {sources.length > 1 && rules.length === 0 && (
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
          onRemove={() => removeSource(sourceIndex)}
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

      {sources.length > 1 && (
        <div className="space-y-2 border-t border-[var(--glass-border)] pt-3">
          <div className="px-1">
            <span className="block text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
              {t('statusCard.rules')}
            </span>
            <span className="mt-1 block text-[10px] text-[var(--text-muted)] opacity-70">
              {t('statusCard.rulesHint')}
            </span>
          </div>

          {rules.map((rule, ruleIndex) => (
            <RuleEditor
              key={rule.id || ruleIndex}
              rule={rule}
              index={ruleIndex}
              sources={sources}
              entities={entities}
              matched={matchesRule(rule, sources, entities)}
              t={t}
              onUpdate={(patch) =>
                updateRules(rules.map((r, i) => (i === ruleIndex ? { ...r, ...patch } : r)))
              }
              onRemove={() => updateRules(rules.filter((_, i) => i !== ruleIndex))}
            />
          ))}

          <button
            onClick={() => updateRules([...rules, createStatusRule()])}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('statusCard.addRule')}
          </button>
        </div>
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
  const categories = React.useMemo(() => getStatusCategories(editSettings), [editSettings]);

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

  const persistCategories = (next) => {
    if (!editSettingsKey) return;
    saveCardSetting(editSettingsKey, 'categories', next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="px-1">
          <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('statusCard.categories')}
          </span>
          <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">
            {t('statusCard.categoriesHint')}
          </span>
        </div>

        {categories.map((category, index) => (
          <div key={category.id} className="popup-surface space-y-3 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                {`${t('statusCard.category')} ${index + 1}`}
              </span>
              <button
                onClick={() => persistCategories(categories.filter((_, i) => i !== index))}
                aria-label={t('statusCard.removeCategory')}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <TextField
              label={t('statusCard.categoryName')}
              value={category.name}
              placeholder={t('statusCard.categoryNamePlaceholder')}
              onChange={(value) =>
                persistCategories(
                  categories.map((c, i) => (i === index ? { ...c, name: value } : c))
                )
              }
            />

            <IconField
              label={t('statusCard.categoryIcon')}
              value={category.icon}
              t={t}
              onChange={(icon) =>
                persistCategories(categories.map((c, i) => (i === index ? { ...c, icon } : c)))
              }
            />

            <TextField
              label={t('statusCard.categoryEmptyText')}
              value={category.emptyText}
              placeholder={t('statusCard.categoryEmptyTextPlaceholder')}
              onChange={(value) =>
                persistCategories(
                  categories.map((c, i) => (i === index ? { ...c, emptyText: value } : c))
                )
              }
            />
            <p className="ml-1 text-[10px] text-[var(--text-muted)] opacity-70">
              {t('statusCard.categoryEmptyTextHint')}
            </p>
          </div>
        ))}

        {categories.length < MAX_STATUS_CATEGORIES && (
          <button
            onClick={() => persistCategories([...categories, createStatusCategory()])}
            className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('statusCard.addCategory')}
          </button>
        )}
      </div>

      <div className="px-1 pt-2">
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
          categories={categories}
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
