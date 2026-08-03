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

const PLACEHOLDER_STATES = new Set(['unknown', 'unavailable', '-', '', 'none']);

const isMeaningfulState = (state) => {
  if (state === null || state === undefined) return false;
  const normalized = String(state).trim().toLowerCase();
  return normalized !== '' && !PLACEHOLDER_STATES.has(normalized);
};

/** Home Connect program keys look like "dishcare_dishwasher_program_eco_50";
 * already-readable values (e.g. LG ThinQ's course name) pass through untouched. */
const prettifyProgramName = (raw) => {
  const match = String(raw).match(/^[a-z]+_[a-z]+_program_(.+)$/i);
  const slug = match ? match[1] : String(raw);
  return slug
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/** Parses "H:MM" / "H:MM:SS" or a plain number of minutes into total minutes. */
const parseDurationMinutes = (value) => {
  const str = String(value).trim();
  if (/^\d+:\d{2}(:\d{2})?$/.test(str)) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  }
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
};

const formatRemainingTime = (entity, translate, locale) => {
  if (!entity || !isMeaningfulState(entity.state)) return null;
  if (entity.attributes?.device_class === 'timestamp') {
    const date = new Date(entity.state);
    if (Number.isNaN(date.getTime())) return null;
    return translate('solarAppliance.finishesAt').replace(
      '{time}',
      date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    );
  }
  const minutes = parseDurationMinutes(entity.state);
  if (minutes === null || minutes <= 0) return null;
  const duration = `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, '0')}`;
  return translate('solarAppliance.remainingDuration').replace('{duration}', duration);
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
  active: {
    fg: 'var(--accent-color)',
    bg: 'var(--accent-bg)',
    border: 'var(--accent-color)',
  },
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

/** Below this draw, an appliance is considered idle/standby rather than
 * actually mid-cycle -- typical dishwashers/washing machines pull only a
 * few watts on standby, so anything meaningfully above that is genuinely
 * running. */
const RUNNING_WATTS_THRESHOLD = 20;

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
  const surplus = useSolarSurplusData(entities, conn);

  const {
    switchEntityId,
    powerEntityId,
    programEntityId,
    remainingTimeEntityId,
    typicalWattage,
    typicalDurationMinutes,
    safetyMarginMinutes,
    icon,
  } = settings;
  const switchEntity = switchEntityId ? entities?.[switchEntityId] : null;
  const powerEntity = powerEntityId ? entities?.[powerEntityId] : null;
  const programEntity = programEntityId ? entities?.[programEntityId] : null;
  const remainingTimeEntity = remainingTimeEntityId ? entities?.[remainingTimeEntityId] : null;
  const programName =
    programEntity && isMeaningfulState(programEntity.state) ? prettifyProgramName(programEntity.state) : null;
  const remainingTimeText = formatRemainingTime(remainingTimeEntity, translate, locale);

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
  // Once the appliance is genuinely drawing power it has already started --
  // the solar-surplus tier (now/soon/wait) is a scheduling recommendation
  // for *whether to start it*, so showing "Soon"/"Wait" while it's actively
  // running mid-cycle is misleading. Surface that it's running instead.
  const isRunning = currentWatts >= RUNNING_WATTS_THRESHOLD;
  const scheduleTier = wattage > 0 ? surplus.classify(wattage) : 'wait';
  const tier = isRunning ? 'active' : scheduleTier;
  const tierMeta = TIER_META[tier];
  const gapW = Math.max(0, wattage - surplus.availableSurplusW);
  const eta = tier !== 'now' && tier !== 'active' && wattage > 0 ? surplus.estimateNextAvailable(wattage) : null;

  // "Jetzt" only means enough surplus exists right now -- it says nothing
  // about whether that surplus will still be there once the program has
  // actually run its course. surplusHoldsUntil is when the forecast expects
  // surplus to drop back below what this appliance needs; subtracting the
  // appliance's own typical runtime (+ a safety margin) turns that into an
  // actual "start by" recommendation. Without a configured duration there's
  // no way to know if today's runway is long enough, so the render below
  // falls back to a plain "holds until" notice instead of implying a false
  // guarantee.
  const durationMinutes = Number(typicalDurationMinutes) || 0;
  const marginMinutes = Number(safetyMarginMinutes) || 0;
  const surplusHoldsUntil = tier === 'now' && wattage > 0 ? surplus.estimateSurplusHoldsUntil(wattage) : null;
  const latestStart =
    surplusHoldsUntil && durationMinutes > 0
      ? new Date(surplusHoldsUntil.getTime() - (durationMinutes + marginMinutes) * 60000)
      : null;
  const latestStartHasPassed = latestStart ? latestStart.getTime() <= Date.now() : false;
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

        <div className="flex min-w-0 max-w-[55%] flex-col items-end gap-1">
          <span
            className="shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold whitespace-nowrap tracking-widest uppercase"
            style={{ color: tierMeta.fg, backgroundColor: tierMeta.bg, borderColor: tierMeta.border }}
          >
            {translate(`solarAppliance.tier.${tier}`)}
          </span>
          {eta?.status === 'at' && (
            <p className="text-right text-[10px] text-[var(--text-muted)]">
              {formatEta(eta.date, locale, translate)}
            </p>
          )}
          {eta?.status === 'none' && (
            <p className="text-right text-[10px] text-[var(--text-muted)]">{translate('solarAppliance.etaNone')}</p>
          )}
          {latestStart && !latestStartHasPassed && (
            <p className="text-right text-[10px] text-[var(--text-muted)]">
              {translate('solarAppliance.latestStartToday').replace(
                '{time}',
                latestStart.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
              )}
            </p>
          )}
          {latestStart && latestStartHasPassed && (
            <p className="text-right text-[10px]" style={{ color: 'var(--status-warning-fg)' }}>
              {translate('solarAppliance.startNowRisky')}
            </p>
          )}
          {surplusHoldsUntil && durationMinutes <= 0 && (
            <p className="text-right text-[10px] text-[var(--text-muted)]">
              {translate('solarAppliance.surplusHoldsUntil').replace(
                '{time}',
                surplusHoldsUntil.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
              )}
            </p>
          )}
        </div>
      </div>

      {(programName || remainingTimeText) && (
        <p className="relative z-10 -mt-2 truncate text-[11px] text-[var(--text-secondary)]">
          {[programName, remainingTimeText].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="relative z-10 space-y-2">
        <Bar value={currentWatts} min={0} max={Math.max(wattage, currentWatts, 100)} color="var(--accent-color)" />
        {tier !== 'now' && tier !== 'active' && wattage > 0 && (
          <p className="text-[11px] text-[var(--text-muted)]">
            {translate('solarAppliance.gap').replace('{watts}', String(Math.round(gapW)))}
          </p>
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
