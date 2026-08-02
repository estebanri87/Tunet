import { memo } from 'react';
import { Donut } from '../charts/SensorGauge';
import { Sun, Battery, Zap, getIconComponent } from '../../icons';
import { getNumericState } from '../../hooks/useSolarSurplusData';

const formatWatts = (value) => {
  if (value === null || value === undefined) return '--';
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`;
  return `${Math.round(abs)} W`;
};

const formatKwh = (value) => {
  if (value === null || value === undefined) return '--';
  return `${value.toFixed(1)} kWh`;
};

const Stat = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-70">
      {label}
    </p>
    <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">{value}</p>
  </div>
);

const SolarSystemCard = memo(/** @param {any} props */ function SolarSystemCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  editMode,
  entities,
  callService,
  customNames,
  customIcons,
  settings = {},
  isMobile,
  t,
}) {
  const translate = t || ((key) => key);
  const {
    pvPowerId,
    batteryPowerId,
    batteryModeId,
    batterySocId,
    gridPowerId,
    todayProductionId,
    lifetimeProductionId,
    healthStateId,
    healthAlarmId,
    healthFaultId,
    controlSwitchId,
  } = settings;

  const pvPower = getNumericState(entities?.[pvPowerId]);
  const batteryPower = getNumericState(entities?.[batteryPowerId]);
  const batteryMode = entities?.[batteryModeId]?.state ?? null;
  const batterySoc = getNumericState(entities?.[batterySocId]);
  const gridPower = getNumericState(entities?.[gridPowerId]);
  const todayProduction = getNumericState(entities?.[todayProductionId]);
  const lifetimeProduction = getNumericState(entities?.[lifetimeProductionId]);
  const healthAlarm = entities?.[healthAlarmId]?.state;
  const healthFault = entities?.[healthFaultId]?.state;
  const healthState = entities?.[healthStateId]?.state;
  const switchEntity = controlSwitchId ? entities?.[controlSwitchId] : null;

  const hasFault =
    (healthAlarm && healthAlarm !== 'OK' && healthAlarm !== 'ok') ||
    (healthFault && healthFault !== 'OK' && healthFault !== 'ok');

  const name = customNames?.[cardId] || settings.heading || translate('solarSystem.title');
  const Icon = customIcons?.[cardId] ? getIconComponent(customIcons[cardId]) || Sun : Sun;
  const isDenseMobile = isMobile && settings.size !== 'small';
  const isOn = switchEntity?.state === 'on';

  const handleToggle = (event) => {
    event.stopPropagation();
    if (editMode || !controlSwitchId) return;
    callService?.('switch', 'toggle', { entity_id: controlSwitchId });
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

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110"
            style={{
              backgroundColor: 'color-mix(in srgb, #facc15 15%, transparent)',
              color: '#facc15',
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-70">
              {name}
            </p>
            <p className="mt-1.5 text-2xl leading-none font-light text-[var(--text-primary)]">
              {formatWatts(pvPower)}
            </p>
          </div>
        </div>

        {hasFault && (
          <span
            className="shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest uppercase"
            style={{
              color: 'var(--status-error-fg)',
              backgroundColor: 'var(--status-error-bg)',
              borderColor: 'var(--status-error-border)',
            }}
          >
            {translate('solarSystem.fault')}
          </span>
        )}
        {!hasFault && healthState && (
          <span
            className="shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest uppercase"
            style={{
              color: 'var(--status-success-fg)',
              backgroundColor: 'var(--status-success-bg)',
              borderColor: 'var(--status-success-border)',
            }}
          >
            {translate('solarSystem.ok')}
          </span>
        )}
      </div>

      {batterySocId && (
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative shrink-0">
            <Donut value={batterySoc ?? 0} min={0} max={100} size={72} color="#22c55e" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Battery className="h-4 w-4" style={{ color: '#22c55e' }} strokeWidth={1.5} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-70">
              {translate('solarSystem.battery')}
            </p>
            <p className="mt-0.5 text-lg font-light text-[var(--text-primary)]">
              {batterySoc !== null ? `${Math.round(batterySoc)}%` : '--'}
            </p>
            {batteryMode && (
              <p className="text-[11px] text-[var(--text-muted)]">
                {batteryMode} {batteryPower !== null ? `· ${formatWatts(batteryPower)}` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10 grid grid-cols-2 gap-3">
        {gridPowerId && (
          <Stat
            label={translate('solarSystem.grid')}
            value={gridPower !== null ? formatWatts(gridPower) : '--'}
          />
        )}
        {todayProductionId && (
          <Stat label={translate('solarSystem.today')} value={formatKwh(todayProduction)} />
        )}
        {lifetimeProductionId && (
          <Stat label={translate('solarSystem.lifetime')} value={formatKwh(lifetimeProduction)} />
        )}
      </div>

      {controlSwitchId && (
        <button
          onClick={handleToggle}
          className={`relative z-10 mt-auto flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors ${
            isOn
              ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
              : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          {isOn ? translate('solarSystem.turnOff') : translate('solarSystem.turnOn')}
        </button>
      )}
    </div>
  );
});

export default SolarSystemCard;
