import { memo } from 'react';
import { TrendingUp, getIconComponent } from '../../icons';
import { getNumericState } from '../../hooks/useSolarSurplusData';

const formatKwh = (value) => (value === null ? '--' : `${value.toFixed(1)} kWh`);

const sumField = (entities, instances, field) =>
  (instances || []).reduce((sum, instance) => {
    const value = getNumericState(entities?.[instance?.[field]]);
    return sum + (value ?? 0);
  }, 0);

const hasAny = (instances, field) => (instances || []).some((instance) => Boolean(instance?.[field]));

const Stat = ({ label, value }) => (
  <div className="popup-surface rounded-2xl p-4">
    <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-70">
      {label}
    </p>
    <p className="mt-1 text-xl font-light text-[var(--text-primary)]">{value}</p>
  </div>
);

const SolarForecastCard = memo(/** @param {any} props */ function SolarForecastCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  editMode,
  entities,
  customNames,
  customIcons,
  settings = {},
  isMobile,
  t,
}) {
  const translate = t || ((key) => key);
  const instances = Array.isArray(settings.instances) ? settings.instances : [];

  const name = customNames?.[cardId] || settings.heading || translate('solarForecast.title');
  const Icon = customIcons?.[cardId] ? getIconComponent(customIcons[cardId]) || TrendingUp : TrendingUp;
  const isDenseMobile = isMobile && settings.size !== 'small';

  const today = hasAny(instances, 'energyTodayId') ? sumField(entities, instances, 'energyTodayId') : null;
  const remaining = hasAny(instances, 'energyRemainingId')
    ? sumField(entities, instances, 'energyRemainingId')
    : null;
  const nextHour = hasAny(instances, 'energyNextHourId')
    ? sumField(entities, instances, 'energyNextHourId')
    : null;
  const tomorrow = hasAny(instances, 'energyTomorrowId')
    ? sumField(entities, instances, 'energyTomorrowId')
    : null;

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
            backgroundColor: 'color-mix(in srgb, var(--accent-color) 15%, transparent)',
            color: 'var(--accent-color)',
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <p className="truncate text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-70">
          {name}
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-3">
        <Stat label={translate('solarForecast.today')} value={formatKwh(today)} />
        <Stat label={translate('solarForecast.remaining')} value={formatKwh(remaining)} />
        <Stat label={translate('solarForecast.nextHour')} value={formatKwh(nextHour)} />
        <Stat label={translate('solarForecast.tomorrow')} value={formatKwh(tomorrow)} />
      </div>
    </div>
  );
});

export default SolarForecastCard;
