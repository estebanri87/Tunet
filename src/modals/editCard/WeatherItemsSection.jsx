import React from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';
import IconPicker from '../../components/ui/IconPicker';
import { getIconComponent } from '../../icons';
import { createCustomItemId, normalizeCustomItems } from '../../components/cards/customItems';

const MAX_WEATHER_ITEMS = 8;
const MAX_ENTITY_OPTIONS = 150;
const GRAPH_COLORS = ['#38bdf8', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#94a3b8'];

/** On/off sensors show free text instead of a number, so no decimals apply. */
const isBinaryEntity = (entityId, entities) => {
  if (!entityId) return false;
  if (entityId.startsWith('binary_sensor.')) return true;
  const state = entities?.[entityId]?.state;
  return state === 'on' || state === 'off';
};

/** One readout: free label, any sensor, own icon. Display only. */
const WeatherItemEditor = ({
  item,
  index,
  entities,
  entityOptions,
  t,
  onUpdate,
  onRemove,
  onDragStart,
  isDragging,
  allowGraph,
}) => {
  const [showIcons, setShowIcons] = React.useState(false);
  const SelectedIcon = item.icon ? getIconComponent(item.icon) : null;
  const isBinary = isBinaryEntity(item.entityId, entities);

  return (
    <div
      data-weather-item-id={item.id}
      className={`popup-surface space-y-3 rounded-2xl p-4 transition-opacity ${isDragging ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            aria-label={t('weatherTemp.reorderItem')}
            className="-ml-1 cursor-grab touch-none rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] active:cursor-grabbing"
            onPointerDown={(e) => {
              e.preventDefault();
              onDragStart();
            }}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {`${t('weatherTemp.item')} ${index + 1}`}
          </span>
        </div>
        <button
          onClick={onRemove}
          aria-label={t('weatherTemp.removeItem')}
          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="ml-4 text-xs font-bold text-[var(--text-muted)] uppercase">
          {t('weatherTemp.itemLabel')}
        </label>
        <input
          type="text"
          value={item.label || ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder={t('weatherTemp.itemLabelPlaceholder')}
          className="popup-surface mt-2 w-full rounded-2xl px-5 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      <SearchableSelect
        label={t('weatherTemp.itemEntity')}
        value={item.entityId}
        options={entityOptions}
        onChange={(value) => onUpdate({ entityId: value })}
        placeholder={t('dropdown.noneSelected')}
        entities={entities}
        t={t}
        maxOptions={MAX_ENTITY_OPTIONS}
      />

      <div>
        <button
          onClick={() => setShowIcons((prev) => !prev)}
          className="popup-surface popup-surface-hover flex w-full items-center justify-between rounded-2xl px-5 py-3"
        >
          <span className="flex items-center gap-3 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            {SelectedIcon ? <SelectedIcon className="h-5 w-5 text-[var(--text-primary)]" /> : null}
            {t('weatherTemp.itemIcon')}
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

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="ml-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('weatherTemp.itemDecimals')}
          </label>
          <input
            type="number"
            value={item.decimals ?? ''}
            placeholder="1"
            onChange={(e) =>
              onUpdate({ decimals: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="popup-surface mt-1 w-24 rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>
      </div>

      {/* Own wording for on/off sensors, e.g. "Aktiv" / "Nicht aktiv". */}
      {isBinary && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="ml-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
              {t('weatherTemp.itemOnText')}
            </label>
            <input
              type="text"
              value={item.onText || ''}
              placeholder="on"
              onChange={(e) => onUpdate({ onText: e.target.value })}
              className="popup-surface mt-1 w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="flex-1">
            <label className="ml-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
              {t('weatherTemp.itemOffText')}
            </label>
            <input
              type="text"
              value={item.offText || ''}
              placeholder="off"
              onChange={(e) => onUpdate({ offText: e.target.value })}
              className="popup-surface mt-1 w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      )}

      {/* Numeric readouts can be drawn as a second curve on the card graph. */}
      {allowGraph && !isBinary && (
        <div className="space-y-2 rounded-xl bg-[var(--glass-bg)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="block text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                {t('weatherTemp.itemShowGraph')}
              </span>
              <span className="mt-1 block text-[10px] text-[var(--text-muted)] opacity-70">
                {t('weatherTemp.itemShowGraphHint')}
              </span>
            </div>
            <button
              onClick={() => onUpdate({ showGraph: !item.showGraph })}
              className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors ${item.showGraph ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--text-primary)] transition-all ${item.showGraph ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>
          {item.showGraph && (
            <div className="flex flex-wrap items-center gap-1.5">
              {GRAPH_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdate({ graphColor: color })}
                  aria-label={color}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${(item.graphColor || '#38bdf8') === color ? 'scale-110 border-[var(--text-primary)]' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <label
                className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-[var(--glass-border)]"
                style={{
                  background:
                    'conic-gradient(#ef4444, #facc15, #22c55e, #38bdf8, #a855f7, #ef4444)',
                }}
              >
                <input
                  type="color"
                  value={item.graphColor || '#38bdf8'}
                  onChange={(e) => onUpdate({ graphColor: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Two independent lists: values shown on the card itself and values shown in
 * the popup. The popup list replaces the attribute-derived defaults, which
 * stay in place while it is empty.
 */
export function WeatherItemsSection({
  t,
  entities,
  editSettings,
  editSettingsKey,
  saveCardSetting,
  settingKey,
  title,
  hint,
}) {
  const items = React.useMemo(
    () => normalizeCustomItems(editSettings[settingKey]),
    [editSettings, settingKey]
  );

  const sensorOptions = React.useMemo(
    () =>
      Object.keys(entities || {})
        .filter((id) => {
          const domain = id.split('.')[0];
          return ['sensor', 'binary_sensor', 'input_number', 'number', 'counter'].includes(domain);
        })
        .sort((a, b) => {
          const nameA = entities[a]?.attributes?.friendly_name || a;
          const nameB = entities[b]?.attributes?.friendly_name || b;
          return nameA.localeCompare(nameB);
        }),
    [entities]
  );

  const persist = React.useCallback(
    (next) => {
      if (!editSettingsKey) return;
      saveCardSetting(editSettingsKey, settingKey, next);
    },
    [editSettingsKey, saveCardSetting, settingKey]
  );

  const [draggingId, setDraggingId] = React.useState(null);
  const listRef = React.useRef(null);

  const handleDragMove = React.useCallback(
    (rowId, clientY) => {
      if (!listRef.current) return;
      const elements = Array.from(listRef.current.querySelectorAll('[data-weather-item-id]'));
      const target = elements.find((element) => {
        const rect = element.getBoundingClientRect();
        return clientY >= rect.top && clientY <= rect.bottom;
      });
      const targetId = target?.getAttribute('data-weather-item-id');
      if (!targetId || targetId === rowId) return;
      const from = items.findIndex((entry) => entry.id === rowId);
      const to = items.findIndex((entry) => entry.id === targetId);
      if (from < 0 || to < 0) return;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      persist(next);
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
    <div className="space-y-3">
      <div className="px-1">
        <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {title}
        </span>
        <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">{hint}</span>
      </div>

      {items.length === 0 && (
        <p className="popup-surface rounded-2xl px-4 py-6 text-center text-xs text-[var(--text-muted)]">
          {t('weatherTemp.noItems')}
        </p>
      )}

      <div ref={listRef} className={`space-y-3 ${draggingId ? 'select-none' : ''}`}>
        {items.map((item, index) => (
          <WeatherItemEditor
            key={item.id}
            item={item}
            index={index}
            entities={entities}
            entityOptions={sensorOptions}
            t={t}
            isDragging={draggingId === item.id}
            allowGraph={settingKey === 'cardItems'}
            onDragStart={() => setDraggingId(item.id)}
            onUpdate={(patch) =>
              persist(items.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)))
            }
            onRemove={() => persist(items.filter((entry) => entry.id !== item.id))}
          />
        ))}
      </div>

      {items.length < MAX_WEATHER_ITEMS && (
        <button
          onClick={() =>
            persist([...items, { id: createCustomItemId(), label: '', entityId: null }])
          }
          className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('weatherTemp.addItem')}
        </button>
      )}
    </div>
  );
}

export default WeatherItemsSection;
