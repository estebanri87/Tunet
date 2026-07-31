import React from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';
import IconPicker from '../../components/ui/IconPicker';
import { getIconComponent } from '../../icons';
import {
  DEFAULT_ENERGY_COLOR_THRESHOLDS,
  ENERGY_COLOR_SWATCHES,
  MAX_ENERGY_HEADER_ITEMS,
  MAX_ENERGY_ITEMS,
  MAX_THRESHOLD_STEPS,
  MIN_THRESHOLD_STEPS,
  createEnergyItemId,
  normalizeEnergyItems,
  normalizeEnergyThresholds,
  resolveItemThresholds,
  resolveThresholdColor,
} from '../../components/cards/energyItems';

/* Colour swatches plus a native picker, so any colour is reachable. */
const ColorChooser = ({ value, onChange }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {ENERGY_COLOR_SWATCHES.map((swatch) => {
      const isSelected = resolveThresholdColor(value).toLowerCase() === swatch;
      return (
        <button
          key={swatch}
          onClick={() => onChange(swatch)}
          aria-label={swatch}
          className={`h-6 w-6 rounded-full border-2 transition-all ${isSelected ? 'scale-110 border-[var(--text-primary)]' : 'border-transparent'}`}
          style={{ backgroundColor: swatch }}
        />
      );
    })}
    <label
      className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-[var(--glass-border)]"
      style={{
        background: 'conic-gradient(#ef4444, #facc15, #22c55e, #38bdf8, #a855f7, #ef4444)',
      }}
    >
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#22c55e'}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  </div>
);

const SectionLabel = ({ title, hint }) => (
  <div className="px-1">
    <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
      {title}
    </span>
    {hint && (
      <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">{hint}</span>
    )}
  </div>
);

/**
 * Colour scale of one to six steps. Every readout carries its own, because
 * the value range that counts as "good" differs per sensor.
 */
const ThresholdEditor = ({
  enabled,
  thresholds,
  onToggle,
  onChange,
  onReset,
  onAdd,
  onRemove,
  t,
}) => (
  <div className="space-y-3 rounded-xl bg-[var(--glass-bg)] p-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <span className="block text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {t('energyFlow.colorThresholds')}
        </span>
        <span className="mt-1 block text-[10px] text-[var(--text-muted)] opacity-70">
          {t('energyFlow.colorThresholdsHint')}
        </span>
      </div>
      <button
        onClick={onToggle}
        className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors ${enabled ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--text-primary)] transition-all ${enabled ? 'left-7' : 'left-1'}`}
        />
      </button>
    </div>

    {enabled &&
      thresholds.map((step, index) => (
        <div key={index} className="space-y-2 border-t border-[var(--glass-border)] pt-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
              {`${t('energyFlow.thresholdStep')} ${index + 1}`}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] opacity-70">
              {t('energyFlow.thresholdUpTo')}
            </span>
            <input
              type="number"
              value={step.limit}
              onChange={(e) => onChange(index, { limit: Number(e.target.value) })}
              className="popup-surface ml-auto w-20 rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
            />
            {thresholds.length > MIN_THRESHOLD_STEPS && (
              <button
                onClick={() => onRemove(index)}
                aria-label={t('energyFlow.removeThresholdStep')}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ColorChooser value={step.color} onChange={(color) => onChange(index, { color })} />
        </div>
      ))}

    {enabled && (
      <div className="flex gap-2 border-t border-[var(--glass-border)] pt-2">
        {thresholds.length < MAX_THRESHOLD_STEPS && (
          <button
            onClick={onAdd}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--glass-bg-hover)] px-2 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
          >
            <Plus className="h-3 w-3" />
            {t('energyFlow.addThresholdStep')}
          </button>
        )}
        <button
          onClick={onReset}
          className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase transition-colors hover:text-[var(--text-primary)]"
        >
          {t('energyFlow.resetThresholds')}
        </button>
      </div>
    )}
  </div>
);

const NumberField = ({ label, value, placeholder, onChange }) => (
  <div className="flex-1">
    <label className="ml-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
      {label}
    </label>
    <input
      type="number"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className="popup-surface mt-1 w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
    />
  </div>
);

/**
 * Editor for one readout. `showRange` is false for the two header values,
 * which render as plain numbers without a ring.
 */
const EnergyItemEditor = ({
  item,
  index,
  entities,
  entityOptions,
  t,
  onUpdate,
  onRemove,
  onDragStart,
  isDragging,
  showRange,
  cardSettings,
}) => {
  const [showIcons, setShowIcons] = React.useState(false);
  const SelectedIcon = item.icon ? getIconComponent(item.icon) : null;
  const { useThresholds, thresholds } = resolveItemThresholds(item, cardSettings);
  const steps = normalizeEnergyThresholds(thresholds);

  return (
    <div
      data-energy-item-id={item.id}
      className={`popup-surface space-y-3 rounded-2xl p-4 transition-opacity ${isDragging ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            aria-label={t('energyFlow.reorderItem')}
            className="-ml-1 cursor-grab touch-none rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] active:cursor-grabbing"
            onPointerDown={(e) => {
              e.preventDefault();
              onDragStart();
            }}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {`${t('energyFlow.item')} ${index + 1}`}
          </span>
        </div>
        <button
          onClick={onRemove}
          aria-label={t('energyFlow.removeItem')}
          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="ml-4 text-xs font-bold text-[var(--text-muted)] uppercase">
          {t('energyFlow.itemLabel')}
        </label>
        <input
          type="text"
          value={item.label || ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder={t('energyFlow.itemLabelPlaceholder')}
          className="popup-surface mt-2 w-full rounded-2xl px-5 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      <SearchableSelect
        label={t('energyFlow.itemEntity')}
        value={item.entityId}
        options={entityOptions}
        onChange={(value) => onUpdate({ entityId: value })}
        placeholder={t('dropdown.noneSelected')}
        entities={entities}
        t={t}
        maxOptions={150}
      />

      {showRange && (
        <>
          <div>
            <button
              onClick={() => setShowIcons((prev) => !prev)}
              className="popup-surface popup-surface-hover flex w-full items-center justify-between rounded-2xl px-5 py-3"
            >
              <span className="flex items-center gap-3 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                {SelectedIcon ? (
                  <SelectedIcon className="h-5 w-5 text-[var(--text-primary)]" />
                ) : null}
                {t('energyFlow.itemIcon')}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {item.icon || t('dropdown.noneSelected')}
              </span>
            </button>
            {showIcons && (
              <div className="mt-2">
                <IconPicker
                  value={item.icon}
                  onSelect={(iconName) => {
                    onUpdate({ icon: iconName });
                    setShowIcons(false);
                  }}
                  onClear={() => onUpdate({ icon: null })}
                  t={t}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <NumberField
              label={t('energyFlow.itemMin')}
              value={item.min}
              placeholder="0"
              onChange={(value) => onUpdate({ min: value })}
            />
            <NumberField
              label={t('energyFlow.itemMax')}
              value={item.max}
              placeholder="100"
              onChange={(value) => onUpdate({ max: value })}
            />
            <NumberField
              label={t('energyFlow.itemDecimals')}
              value={item.decimals}
              placeholder="1"
              onChange={(value) => onUpdate({ decimals: value })}
            />
          </div>

          <ThresholdEditor
            enabled={useThresholds}
            thresholds={steps}
            t={t}
            onToggle={() => onUpdate({ useColorThresholds: !useThresholds })}
            onChange={(index, patch) =>
              onUpdate({
                colorThresholds: steps.map((step, i) =>
                  i === index ? { ...step, ...patch } : step
                ),
              })
            }
            onAdd={() =>
              onUpdate({
                colorThresholds: [
                  ...steps,
                  {
                    limit: Math.min(100, (steps[steps.length - 1]?.limit ?? 0) + 20),
                    color: ENERGY_COLOR_SWATCHES[steps.length % ENERGY_COLOR_SWATCHES.length],
                  },
                ],
              })
            }
            onRemove={(index) => onUpdate({ colorThresholds: steps.filter((_, i) => i !== index) })}
            onReset={() => onUpdate({ colorThresholds: DEFAULT_ENERGY_COLOR_THRESHOLDS })}
          />
        </>
      )}
    </div>
  );
};

export function EnergyFlowSettingsSection({
  t,
  entities,
  editSettings,
  editSettingsKey,
  saveCardSetting,
}) {
  const layout = editSettings.layout === 'compact' ? 'compact' : 'flow';

  const sensorOptions = React.useMemo(
    () =>
      Object.keys(entities || {})
        .filter((id) => {
          const domain = id.split('.')[0];
          return ['sensor', 'input_number', 'number', 'counter'].includes(domain);
        })
        .sort((a, b) => {
          const nameA = entities[a]?.attributes?.friendly_name || a;
          const nameB = entities[b]?.attributes?.friendly_name || b;
          return nameA.localeCompare(nameB);
        }),
    [entities]
  );

  const items = React.useMemo(() => normalizeEnergyItems(editSettings.items), [editSettings.items]);
  const headerItems = React.useMemo(
    () => normalizeEnergyItems(editSettings.headerItems),
    [editSettings.headerItems]
  );

  const persist = React.useCallback(
    (key, value) => {
      if (!editSettingsKey) return;
      saveCardSetting(editSettingsKey, key, value);
    },
    [editSettingsKey, saveCardSetting]
  );

  const updateList = (key, list, id, patch) =>
    persist(
      key,
      list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );

  const removeFromList = (key, list, id) =>
    persist(
      key,
      list.filter((entry) => entry.id !== id)
    );

  const addToList = (key, list) =>
    persist(key, [...list, { id: createEnergyItemId(), label: '', entityId: null }]);

  /* Drag reordering, mirroring the cover rows: listeners on the window so
     moving the handle within the DOM does not abort the gesture. */
  const [draggingId, setDraggingId] = React.useState(null);
  const listRef = React.useRef(null);

  const handleDragMove = React.useCallback(
    (rowId, clientY) => {
      if (!listRef.current) return;
      const elements = Array.from(listRef.current.querySelectorAll('[data-energy-item-id]'));
      const target = elements.find((element) => {
        const rect = element.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      });
      const targetId = target?.getAttribute('data-energy-item-id');
      if (!targetId || targetId === rowId) return;
      const from = items.findIndex((entry) => entry.id === rowId);
      const to = items.findIndex((entry) => entry.id === targetId);
      if (from < 0 || to < 0) return;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      persist('items', next);
    },
    [items, persist]
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
    <div className="space-y-4">
      <div className="space-y-2">
        <SectionLabel title={t('energyFlow.layout')} hint={t('energyFlow.layoutHint')} />
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'flow', label: t('energyFlow.layoutFlow') },
            { key: 'compact', label: t('energyFlow.layoutCompact') },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => persist('layout', option.key)}
              className={`rounded-xl border py-2.5 text-center text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                layout === option.key
                  ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                  : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {layout === 'compact' && (
        <>
          <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
            <SectionLabel
              title={t('energyFlow.headerValues')}
              hint={t('energyFlow.headerValuesHint')}
            />
            {headerItems.map((item, index) => (
              <EnergyItemEditor
                key={item.id}
                item={item}
                index={index}
                entities={entities}
                entityOptions={sensorOptions}
                t={t}
                showRange={false}
                isDragging={false}
                onDragStart={() => {}}
                onUpdate={(patch) => updateList('headerItems', headerItems, item.id, patch)}
                onRemove={() => removeFromList('headerItems', headerItems, item.id)}
              />
            ))}
            {headerItems.length < MAX_ENERGY_HEADER_ITEMS && (
              <button
                onClick={() => addToList('headerItems', headerItems)}
                className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('energyFlow.addHeaderValue')}
              </button>
            )}
          </div>

          <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
            <SectionLabel title={t('energyFlow.items')} hint={t('energyFlow.itemsHint')} />
            {items.length === 0 && (
              <p className="popup-surface rounded-2xl px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                {t('energyFlow.noItemsYet')}
              </p>
            )}
            <div ref={listRef} className={`space-y-3 ${draggingId ? 'select-none' : ''}`}>
              {items.map((item, index) => (
                <EnergyItemEditor
                  key={item.id}
                  item={item}
                  index={index}
                  entities={entities}
                  entityOptions={sensorOptions}
                  t={t}
                  showRange
                  cardSettings={editSettings}
                  isDragging={draggingId === item.id}
                  onDragStart={() => setDraggingId(item.id)}
                  onUpdate={(patch) => updateList('items', items, item.id, patch)}
                  onRemove={() => removeFromList('items', items, item.id)}
                />
              ))}
            </div>
            {items.length < MAX_ENERGY_ITEMS && (
              <button
                onClick={() => addToList('items', items)}
                className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('energyFlow.addItem')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default EnergyFlowSettingsSection;
