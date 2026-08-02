import { memo } from 'react';
import { Bar } from '../charts/SensorGauge';
import { Zap, getIconComponent } from '../../icons';
import useSolarSurplusData, { getNumericState } from '../../hooks/useSolarSurplusData';
import useApplianceTypicalWattage from '../../hooks/useApplianceTypicalWattage';

const formatWatts = (value) => {
  if (value === null || value === undefined) return '--';
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`;
  return `${Math.round(abs)} W`;
};

const formatEta = (date, locale, translate) => {
  const now = new Date();
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) {
    return translate('solarAppliance.etaToday').replace('{time}', time);
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return translate('solarAppliance.etaTomorrow').replace('{time}', time);
  }
  const weekday = date.toLocaleDateString(locale, { weekday: 'long' });
  return translate('solarAppliance.etaLater').replace('{weekday}', weekday).replace('{time}', time);
};

const TIER_META = {
  now: {
    fg: 'var(--status-success-fg)',
    bg: 'var(--status-success-bg)',
    border: 'var(--status-success-border)',
  },
  soon: {
    fg: 'var(--status-info-fg)',
    bg: 'var(--status-info-bg)',
    border: 'var(--status-info-border)',
  },
  wait: {
    fg: 'var(--status-warning-fg)',
    bg: 'var(--status-warning-bg)',
    border: 'var(--status-warning-border)',
  },
};

const SolarApplianceCard = memo(/** @param {any} props */ function SolarApplianceCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  editMode,
  entities,
  conn,
  callService,
  customNames,
  customIcons,
  settings = {},
  isMobile,
  locale,
  t,
}) {
  const translate = t || ((key) => key);
  const surplus = useSolarSurplusData(entities);

  const { switchEntityId, powerEntityId, typicalWattage, icon } = settings;
  const switchEntity = switchEntityId ? entities?.[switchEntityId] : null;
  const powerEntity = powerEntityId ? entities?.[powerEntityId] : null;

  // Peak power seen on this appliance's own power sensor over the last 30
  // days — used instead of a hand-entered guess. Falls back to the manual
  // `typicalWattage` setting only while no history exists yet (e.g. the
  // appliance has never run since the sensor was added).
  const autoWattage = useApplianceTypicalWattage(conn, powerEntityId);
  const wattage = autoWattage ?? (Number(typicalWattage) || 0);
  const wattageIsAuto = autoWattage !== null;

  const name = customNames?.[cardId] || settings.label || switchEntity?.attributes?.friendly_name || cardId;
  const Icon = customIcons?.[cardId]
    ? getIconComponent(customIcons[cardId]) || Zap
    : icon
      ? getIconComponent(icon) || Zap
      : Zap;

  const currentWatts = getNumericState(powerEntity) ?? 0;
  const tier = wattage > 0 ? surplus.classify(wattage) : 'wait';
  const tierMeta = TIER_META[tier];
  const gapW = Math.max(0, wattage - surplus.availableSurplusW);
  const eta = tier !== 'now' && wattage > 0 ? surplus.estimateNextAvailable(wattage) : null;
  const isOn = switchEntity?.state === 'on';
  const isDenseMobile = isMobile && settings.size !== 'small';

  const handleToggle = (event) => {
    event.stopPropagation();
    if (editMode || !switchEntityId) return;
    callService?.('switch', 'toggle', { entity_id: switchEntityId });
  };

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`glass-texture group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'gap-3 p-5' : 'gap-4 p-7'} ${editMode ? 'cursor-move' : ''}`}
      style={cardStyle}
    >
      {controls}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent-color) 15%, transparent)',
              color: 'var(--accent-color)',
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-70">
              {name}
            </p>
            <p className="mt-1.5 text-2xl leading-none font-light text-[var(--text-primary)]">
              {formatWatts(currentWatts)}
            </p>
          </div>
        </div>

        <span
          className="shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest uppercase"
          style={{ color: tierMeta.fg, backgroundColor: tierMeta.bg, borderColor: tierMeta.border }}
        >
          {translate(`solarAppliance.tier.${tier}`)}
        </span>
      </div>

      <div className="relative z-10 space-y-2">
        <Bar value={currentWatts} min={0} max={Math.max(wattage, currentWatts, 100)} color="var(--accent-color)" />
        {tier !== 'now' && wattage > 0 && (
          <p className="text-[11px] text-[var(--text-muted)]">
            {translate('solarAppliance.gap').replace('{watts}', String(Math.round(gapW)))}
          </p>
        )}
        {eta?.status === 'at' && (
          <p className="text-[11px] text-[var(--text-muted)]">{formatEta(eta.date, locale, translate)}</p>
        )}
        {eta?.status === 'none' && (
          <p className="text-[11px] text-[var(--text-muted)]">{translate('solarAppliance.etaNone')}</p>
        )}
        {wattage > 0 && (
          <p className="text-[10px] text-[var(--text-muted)] opacity-60">
            {translate(wattageIsAuto ? 'solarAppliance.wattageAuto' : 'solarAppliance.wattageManual').replace(
              '{watts}',
              String(Math.round(wattage))
            )}
          </p>
        )}
      </div>

      <button
        onClick={handleToggle}
        disabled={!switchEntityId}
        className={`relative z-10 flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors ${
          isOn
            ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
            : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        {isOn ? translate('solarAppliance.turnOff') : translate('solarAppliance.turnOn')}
      </button>
    </div>
  );
});

export default SolarApplianceCard;
