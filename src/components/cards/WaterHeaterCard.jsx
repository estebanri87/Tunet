import { memo, useState } from 'react';
import { Donut } from '../charts/SensorGauge';
import { Droplets } from '../../icons';

const WaterHeaterCard = memo(/** @param {any} props */ function WaterHeaterCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  editMode,
  entities,
  callService,
  customNames,
  settings = {},
  isMobile,
  t,
}) {
  const translate = t || ((key) => key);
  const entityId = settings.entityId;
  const entity = entityId ? entities?.[entityId] : null;
  const [pendingTemp, setPendingTemp] = useState(null);

  const name = customNames?.[cardId] || settings.heading || entity?.attributes?.friendly_name || cardId;
  const isDenseMobile = isMobile && settings.size !== 'small';

  if (!entity) {
    return (
      <div
        key={cardId}
        {...dragProps}
        className="glass-texture flex h-full flex-col items-center justify-center gap-2 rounded-3xl border p-5 text-center"
        style={cardStyle}
      >
        {controls}
        <Droplets className="h-6 w-6 opacity-40" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs text-[var(--text-muted)]">{translate('waterHeater.missingEntity')}</p>
      </div>
    );
  }

  const attrs = entity.attributes || {};
  const minTemp = Number(attrs.min_temp ?? 30);
  const maxTemp = Number(attrs.max_temp ?? 70);
  const currentTemp = Number(attrs.current_temperature);
  const targetTemp = pendingTemp ?? Number(attrs.temperature ?? currentTemp);
  const operationList = Array.isArray(attrs.operation_list) ? attrs.operation_list : [];
  const operationMode = attrs.operation_mode || entity.state;

  const handleModeSelect = (mode) => {
    if (editMode || !entityId) return;
    callService?.('water_heater', 'set_operation_mode', { entity_id: entityId, operation_mode: mode });
  };

  const handleTempCommit = (value) => {
    if (editMode || !entityId) return;
    callService?.('water_heater', 'set_temperature', { entity_id: entityId, temperature: value });
  };

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`glass-texture group relative flex h-full flex-col overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'gap-3 p-5' : 'gap-4 p-7'} ${editMode ? 'cursor-move' : ''}`}
      style={cardStyle}
    >
      {controls}

      <div className="relative z-10 flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110"
          style={{
            backgroundColor: 'color-mix(in srgb, #38bdf8 15%, transparent)',
            color: '#38bdf8',
          }}
        >
          <Droplets className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <p className="truncate text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-70">
          {name}
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4">
        <div className="relative shrink-0">
          <Donut value={currentTemp} min={minTemp} max={maxTemp} size={84} color="#38bdf8" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl leading-none font-light text-[var(--text-primary)]">
              {Number.isFinite(currentTemp) ? Math.round(currentTemp) : '--'}°
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {translate('waterHeater.target')}
          </p>
          <input
            type="range"
            min={minTemp}
            max={maxTemp}
            step={1}
            value={Number.isFinite(targetTemp) ? targetTemp : minTemp}
            disabled={editMode}
            onChange={(e) => setPendingTemp(Number(e.target.value))}
            onMouseUp={() => handleTempCommit(Number.isFinite(targetTemp) ? targetTemp : minTemp)}
            onTouchEnd={() => handleTempCommit(Number.isFinite(targetTemp) ? targetTemp : minTemp)}
            className="w-full"
          />
          <p className="text-lg font-light text-[var(--text-primary)]">
            {Number.isFinite(targetTemp) ? Math.round(targetTemp) : '--'}°C
          </p>
        </div>
      </div>

      {operationList.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-2">
          {operationList.map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeSelect(mode)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase transition-colors ${
                operationMode === mode
                  ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default WaterHeaterCard;
