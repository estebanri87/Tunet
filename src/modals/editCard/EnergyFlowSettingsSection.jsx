import React from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';
import IconPicker from '../../components/ui/IconPicker';
import { getIconComponent } from '../../icons';
import {
  DEFAULT_ENERGY_COLOR_THRESHOLDS,
  MAX_ENERGY_HEADER_ITEMS,
  MAX_ENERGY_ITEMS,
  createEnergyItemId,
  normalizeEnergyItems,
  normalizeEnergyThresholds,
} from '../../components/cards/energyItems';

const THRESHOLD_COLORS = [
  { key: 'red', label: 'ROT', dot: 'var(--color-red-500)' },
  { key: 'amber', label: 'GELB', dot: 'var(--color-amber-400)' },
  { key: 'green', label: 'GRÜN', dot: 'var(--color-green-400)' },
];

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
}) => {
  const [showIcons, setShowIcons] = React.useState(false);
  const SelectedIcon = item.icon ? getIconComponent(item.icon) : null;

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

  const thresholds = React.useMemo(
    () => normalizeEnergyThresholds(editSettings.colorThresholds),
    [editSettings.colorThresholds]
  );
  const useThresholds = editSettings.useColorThresholds !== false;

  const updateThreshold = (index, patch) => {
    const next = thresholds.map((step, i) => (i === index ? { ...step, ...patch } : step));
    persist('colorThresholds', next);
  };

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

          <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
            <div className="flex items-center justify-between gap-4">
              <SectionLabel
                title={t('energyFlow.colorThresholds')}
                hint={t('energyFlow.colorThresholdsHint')}
              />
              <button
                onClick={() => persist('useColorThresholds', !useThresholds)}
                className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors ${useThresholds ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
              >
                <div
                  className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--text-primary)] transition-all ${useThresholds ? 'left-7' : 'left-1'}`}
                />
              </button>
            </div>

            {useThresholds &&
              thresholds.map((step, index) => (
                <div key={index} className="popup-surface space-y-3 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                      {`${t('energyFlow.thresholdStep')} ${index + 1}`}
                    </span>
                    <input
                      type="number"
                      value={step.limit}
                      onChange={(e) => updateThreshold(index, { limit: Number(e.target.value) })}
                      className="popup-surface ml-auto w-24 rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {THRESHOLD_COLORS.map((color) => (
                      <button
                        key={color.key}
                        onClick={() => updateThreshold(index, { color: color.key })}
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-[11px] font-bold tracking-wider uppercase transition-all ${
                          step.color === color.key
                            ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                            : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: color.dot }}
                        />
                        {color.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {useThresholds && (
              <button
                onClick={() => persist('colorThresholds', DEFAULT_ENERGY_COLOR_THRESHOLDS)}
                className="w-full rounded-xl px-3 py-2 text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase transition-colors hover:text-[var(--text-primary)]"
              >
                {t('energyFlow.resetThresholds')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default EnergyFlowSettingsSection;
