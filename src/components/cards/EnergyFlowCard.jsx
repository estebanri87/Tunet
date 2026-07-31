import { memo } from 'react';
import { ArrowLeftRight, Battery, Home, Sun, Zap } from '../../icons';
import { getIconComponent } from '../../icons';
import {
  formatEnergyValue,
  getEnergyItemColor,
  getEnergyItemRatio,
  getEntityNumericValue,
  getRenderableEnergyItems,
} from './energyItems';

/* -- Compact layout: icon ring with value and free label ---------------- */
const EnergyItemRing = ({ item, entity, color, dense }) => {
  const value = getEntityNumericValue(entity);
  const ratio = getEnergyItemRatio(value, item);
  const { text, unit } = formatEnergyValue(entity, item.decimals);
  const isIdle = value === null;
  const ItemIcon = item.icon ? getIconComponent(item.icon) : null;

  const size = dense ? 56 : 68;
  const stroke = 3;
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--glass-border)"
            strokeWidth={stroke}
          />
          {!isIdle && ratio > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
              className="transition-all duration-500"
            />
          )}
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: isIdle ? 'var(--text-muted)' : color }}
        >
          {ItemIcon && <ItemIcon className={dense ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={1.5} />}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`${dense ? 'text-xs' : 'text-sm'} font-bold`}
          style={{ color: isIdle ? 'var(--text-muted)' : 'var(--text-primary)' }}
        >
          {text}
        </span>
        {unit && <span className="text-[10px] text-[var(--text-secondary)]">{unit}</span>}
      </div>
      <span
        className={`${dense ? 'text-[9px]' : 'text-[10px]'} max-w-full truncate text-center`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {item.label || entity?.attributes?.friendly_name || item.entityId}
      </span>
    </div>
  );
};

const getNumericValue = (entity) => {
  const raw = entity?.state;
  if (raw === undefined || raw === null || raw === 'unavailable' || raw === 'unknown') return null;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : null;
};

const formatPower = (value) => {
  if (value === null) return '--';
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`;
  return `${Math.round(abs)} W`;
};

/**
 * Sign conventions (matching typical Home Assistant power sensors):
 * - grid: positive = importing from grid, negative = exporting to grid
 * - solar: positive = producing (solar is a magnitude, always flows to home/grid/battery)
 * - battery: positive = discharging (battery -> home), negative = charging (home -> battery)
 * - home: derived if not provided; otherwise used purely for display
 */
function computeFlows({ grid, solar, battery }) {
  return {
    gridToHome: grid !== null && grid > 0,
    homeToGrid: grid !== null && grid < 0,
    solarToHome: solar !== null && solar > 0,
    batteryToHome: battery !== null && battery > 0,
    homeToBattery: battery !== null && battery < 0,
  };
}

const NODE_META = {
  grid: { label: 'energyFlow.grid', icon: Zap, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  solar: { label: 'energyFlow.solar', icon: Sun, color: '#facc15', bg: 'rgba(250, 204, 21, 0.12)' },
  battery: {
    label: 'energyFlow.battery',
    icon: Battery,
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
  },
  home: { label: 'energyFlow.home', icon: Home, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
};

function Node({ type, value, translate, dense }) {
  const meta = NODE_META[type];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`flex ${dense ? 'h-10 w-10' : 'h-12 w-12'} items-center justify-center rounded-2xl transition-all duration-500`}
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        <Icon className={dense ? 'h-5 w-5' : 'h-6 w-6'} style={{ strokeWidth: 1.5 }} />
      </div>
      <span
        className={`${dense ? 'text-[9px]' : 'text-[10px]'} font-bold tracking-widest uppercase opacity-60`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {translate(meta.label)}
      </span>
      <span
        className={`${dense ? 'text-xs' : 'text-sm'} font-semibold`}
        style={{ color: 'var(--text-primary)' }}
      >
        {value === null ? '--' : formatPower(value)}
      </span>
    </div>
  );
}

function FlowLine({ active, reverse, x1, y1, x2, y2 }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={active ? 'var(--accent-color)' : 'var(--glass-border)'}
      strokeWidth={active ? 2.5 : 1.5}
      strokeLinecap="round"
      className={
        active ? `energy-flow-line-active${reverse ? ' energy-flow-line-reverse' : ''}` : ''
      }
      opacity={active ? 0.9 : 0.35}
    />
  );
}

const EnergyFlowCard = memo(
  /** @param {any} props */ function EnergyFlowCard({
    cardId,
    gridEntityId,
    solarEntityId,
    batteryEntityId,
    homeEntityId,
    entities,
    dragProps,
    controls,
    cardStyle,
    editMode,
    customNames,
    customIcons,
    settings,
    isMobile,
    onOpen,
    t,
  }) {
    const translate = t || ((key) => key);
    const isSmall = settings?.size === 'small';
    const isDenseMobile = isMobile && !isSmall;

    const gridEntity = gridEntityId ? entities[gridEntityId] : null;
    const solarEntity = solarEntityId ? entities[solarEntityId] : null;
    const batteryEntity = batteryEntityId ? entities[batteryEntityId] : null;
    const homeEntity = homeEntityId ? entities[homeEntityId] : null;

    const grid = getNumericValue(gridEntity);
    const solar = solarEntityId ? getNumericValue(solarEntity) : null;
    const battery = batteryEntityId ? getNumericValue(batteryEntity) : null;
    const home = getNumericValue(homeEntity);

    const flows = computeFlows({ grid, solar, battery });

    const name = customNames[cardId] || translate('energyFlow.title');
    const Icon = customIcons[cardId]
      ? getIconComponent(customIcons[cardId]) || ArrowLeftRight
      : ArrowLeftRight;

    const hasSolar = !!solarEntityId;
    const hasBattery = !!batteryEntityId;

    // Compact layout: freely defined sensor readouts instead of the flow diagram.
    if (settings?.layout === 'compact') {
      const headerItems = getRenderableEnergyItems(settings?.headerItems, entities).slice(0, 2);
      const items = getRenderableEnergyItems(settings?.items, entities);
      const thresholdOptions = {
        useThresholds: settings?.useColorThresholds !== false,
        thresholds: settings?.colorThresholds,
      };

      return (
        <div
          {...dragProps}
          data-haptic={editMode ? undefined : 'card'}
          onClick={(e) => {
            e.stopPropagation();
            if (!editMode && onOpen) onOpen();
          }}
          className={`glass-texture touch-feedback group relative flex h-full flex-col overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'gap-4 p-5' : 'gap-6 p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
          style={cardStyle}
        >
          {controls}

          {headerItems.length > 0 && (
            <div className="relative z-10 flex items-start justify-between gap-4">
              {headerItems.map((headerItem, index) => {
                const headerEntity = entities[headerItem.entityId];
                const { text, unit } = formatEnergyValue(headerEntity, headerItem.decimals);
                return (
                  <div
                    key={headerItem.id}
                    className={`flex min-w-0 flex-col ${index === 1 ? 'items-end text-right' : ''}`}
                  >
                    <span className="truncate text-sm text-[var(--text-secondary)]">
                      {headerItem.label ||
                        headerEntity?.attributes?.friendly_name ||
                        headerItem.entityId}
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span
                        className={`${isDenseMobile ? 'text-xl' : 'text-2xl'} font-bold text-[var(--text-primary)]`}
                      >
                        {text}
                      </span>
                      {unit && <span className="text-xs text-[var(--text-secondary)]">{unit}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 ? (
            <div className="relative z-10 flex flex-1 flex-wrap items-center justify-around gap-x-3 gap-y-4">
              {items.map((item) => {
                const itemEntity = entities[item.entityId];
                return (
                  <EnergyItemRing
                    key={item.id}
                    item={item}
                    entity={itemEntity}
                    dense={isDenseMobile}
                    color={getEnergyItemColor(
                      getEntityNumericValue(itemEntity),
                      item,
                      thresholdOptions
                    )}
                  />
                );
              })}
            </div>
          ) : (
            <div className="relative z-10 flex flex-1 items-center justify-center">
              <span className="text-xs text-[var(--text-muted)]">
                {translate('energyFlow.noItems')}
              </span>
            </div>
          )}
        </div>
      );
    }

    if (isSmall) {
      return (
        <div
          {...dragProps}
          data-haptic={editMode ? undefined : 'card'}
          onClick={(e) => {
            e.stopPropagation();
            if (!editMode && onOpen) onOpen();
          }}
          className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
          style={cardStyle}
        >
          {controls}
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110"
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}
            >
              <Icon className="h-6 w-6 stroke-[1.5px]" />
            </div>
            <div className="flex min-w-0 flex-col">
              <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
                {name}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm leading-none font-bold text-[var(--text-primary)]">
                  {formatPower(home)}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {translate('energyFlow.home')}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-50" />
        <div className="relative z-10 flex items-start justify-between">
          <div
            className={`${isDenseMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'} transition-all duration-500 group-hover:scale-110`}
            style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}
          >
            <Icon className={isDenseMobile ? 'h-4 w-4' : 'h-5 w-5'} style={{ strokeWidth: 1.5 }} />
          </div>
          <div
            className={`flex items-center rounded-full border transition-all ${isDenseMobile ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1'}`}
            style={{
              backgroundColor: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <span
              className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}
            >
              {name}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex flex-1 items-center justify-center">
          <svg
            viewBox="0 0 200 120"
            className="h-full max-h-[140px] w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid -> Home / Home -> Grid */}
            <FlowLine active={flows.gridToHome} reverse={false} x1={30} y1={20} x2={150} y2={60} />
            <FlowLine active={flows.homeToGrid} reverse x1={30} y1={20} x2={150} y2={60} />
            {/* Solar -> Home */}
            {hasSolar && (
              <FlowLine
                active={flows.solarToHome}
                reverse={false}
                x1={30}
                y1={60}
                x2={150}
                y2={60}
              />
            )}
            {/* Battery -> Home / Home -> Battery */}
            {hasBattery && (
              <>
                <FlowLine
                  active={flows.batteryToHome}
                  reverse={false}
                  x1={30}
                  y1={100}
                  x2={150}
                  y2={60}
                />
                <FlowLine active={flows.homeToBattery} reverse x1={30} y1={100} x2={150} y2={60} />
              </>
            )}
          </svg>
        </div>

        <div
          className={`relative z-10 grid gap-2 ${hasSolar || hasBattery ? 'grid-cols-4' : 'grid-cols-2'}`}
        >
          <Node type="grid" value={grid} translate={translate} dense={isDenseMobile} />
          {hasSolar && (
            <Node type="solar" value={solar} translate={translate} dense={isDenseMobile} />
          )}
          {hasBattery && (
            <Node type="battery" value={battery} translate={translate} dense={isDenseMobile} />
          )}
          <Node type="home" value={home} translate={translate} dense={isDenseMobile} />
        </div>
      </div>
    );
  }
);

export default EnergyFlowCard;
