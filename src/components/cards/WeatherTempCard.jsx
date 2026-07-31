import { memo } from 'react';
import WeatherGraph from '../charts/WeatherGraph';
import WeatherEffects from '../effects/WeatherEffects';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { getIconComponent } from '../../icons';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
} from '../../utils';
import {
  formatItemValue,
  getItemLabel,
  getRenderableCustomItems,
  resolveEffectCondition,
} from './customItems';

/* -- One user-defined readout on the card ---------------------------- */
const WeatherCardItem = ({ item, entities, compact }) => {
  const entity = entities[item.entityId];
  const { text, unit } = formatItemValue(entity, item);
  const ItemIcon = item.icon ? getIconComponent(item.icon) : null;

  return (
    <div className="flex min-w-0 items-center gap-1.5" title={getItemLabel(item, entities)}>
      {ItemIcon && (
        <ItemIcon
          className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0 text-[var(--text-secondary)]`}
          strokeWidth={1.5}
        />
      )}
      <span
        className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold text-[var(--text-primary)]`}
      >
        {text}
      </span>
      {unit && (
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-[var(--text-secondary)]`}>
          {unit}
        </span>
      )}
    </div>
  );
};

const getWeatherInfo = (condition, t) => {
  const map = {
    'clear-night': { label: t?.('weather.condition.clearNight') || 'Clear', icon: 'clear-night' },
    cloudy: { label: t?.('weather.condition.cloudy') || 'Cloudy', icon: 'overcast' },
    fog: { label: t?.('weather.condition.fog') || 'Fog', icon: 'fog' },
    hail: { label: t?.('weather.condition.hail') || 'Hail', icon: 'hail' },
    lightning: { label: t?.('weather.condition.lightning') || 'Lightning', icon: 'thunderstorms' },
    'lightning-rainy': {
      label: t?.('weather.condition.lightning') || 'Lightning',
      icon: 'thunderstorms-rain',
    },
    partlycloudy: {
      label: t?.('weather.condition.partlyCloudy') || 'Partly cloudy',
      icon: 'partly-cloudy-day',
    },
    pouring: { label: t?.('weather.condition.pouring') || 'Heavy rain', icon: 'extreme-rain' },
    rainy: { label: t?.('weather.condition.rainy') || 'Rain', icon: 'rain' },
    snowy: { label: t?.('weather.condition.snowy') || 'Snow', icon: 'snow' },
    'snowy-rainy': { label: t?.('weather.condition.snowy') || 'Snow', icon: 'sleet' },
    sunny: { label: t?.('weather.condition.sunny') || 'Sunny', icon: 'clear-day' },
    windy: { label: t?.('weather.condition.windy') || 'Wind', icon: 'wind' },
    'windy-variant': { label: t?.('weather.condition.windy') || 'Wind', icon: 'wind' },
    exceptional: { label: t?.('weather.condition.exceptional') || 'Extreme', icon: 'extreme' },
  };
  return map[condition] || { label: condition || 'Unknown', icon: 'not-available' };
};

const WeatherTempCard = memo(
  /** @param {any} props */ function WeatherTempCard({
    cardId,
    dragProps,
    getControls,
    cardStyle,
    settingsKey,
    cardSettings,
    entities,
    tempHistory,
    tempHistoryById,
    forecastsById,
    outsideTempId,
    weatherEntityId,
    editMode,
    onOpen,
    t,
  }) {
    const { unitsMode } = useConfig();
    const { haConfig } = useHomeAssistantMeta();

    const settings = cardSettings[settingsKey] || {};
    const isSmall = settings.size === 'small';
    const weatherId = settings.weatherId;
    const tempId = settings.tempId;
    const weatherEntity = weatherId ? entities[weatherId] : null;
    const tempEntity = tempId ? entities[tempId] : null;

    const showEffects = settings.showEffects !== false;
    const subtitle = settings.subtitle || null;
    const cardItems = getRenderableCustomItems(settings.cardItems, entities);

    if (!weatherEntity) return null;

    const state = weatherEntity?.state;
    // The rain animation can be driven by an own sensor instead of the weather
    // condition, for stations that report precipitation separately.
    const effectCondition = resolveEffectCondition(state, settings, entities);
    const info = getWeatherInfo(state, t);
    const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/meteocons@v2.0.0/production/fill/all/${info.icon}.svg`;

    const tempValueRaw = tempEntity?.state ?? weatherEntity?.attributes?.temperature;
    const tempValue = parseFloat(tempValueRaw);
    const currentTemp = Number.isFinite(tempValue) ? tempValue : NaN;
    const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
    const sourceTempUnit =
      tempEntity?.attributes?.unit_of_measurement ||
      weatherEntity?.attributes?.temperature_unit ||
      /** @type {any} */ (haConfig?.unit_system)?.temperature ||
      '°C';
    const displayTempUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
    const displayTempValue = convertValueByKind(currentTemp, {
      kind: 'temperature',
      fromUnit: sourceTempUnit,
      unitMode: effectiveUnitMode,
    });
    const graphHistoryHours = Number.isFinite(settings.graphHistoryHours)
      ? settings.graphHistoryHours
      : 12;
    const graphColorLimits = [
      Number.isFinite(settings.graphLimit1) ? settings.graphLimit1 : 0,
      Number.isFinite(settings.graphLimit2) ? settings.graphLimit2 : 10,
      Number.isFinite(settings.graphLimit3) ? settings.graphLimit3 : 20,
      Number.isFinite(settings.graphLimit4) ? settings.graphLimit4 : 28,
    ]
      .map((limit) =>
        convertValueByKind(limit, {
          kind: 'temperature',
          fromUnit: '°C',
          unitMode: effectiveUnitMode,
        })
      )
      .filter((limit) => Number.isFinite(limit))
      .sort((a, b) => a - b);

    // Try to use history first (sensor), fallback to forecast (weather entity)
    let history = [];
    if (tempId) {
      history = tempId === outsideTempId ? tempHistory : tempHistoryById[tempId] || [];
    } else if (weatherId === weatherEntityId) {
      history = tempHistory;
    }

    // Fallback: Use forecast data if history not available/empty
    // Use explicit forecast from weather.get_forecasts service (forecastsById) if available,
    // otherwise fallback to deprecated attributes.forecast
    const forecast = forecastsById?.[weatherId] || weatherEntity?.attributes?.forecast;

    if ((!history || history.length < 2) && forecast) {
      // Convert HA forecast format to match history format expected by WeatherGraph
      // Forecast: [{ datetime: '...', temperature: 20 }, ...]
      // History target: { last_updated: '...', state: 20 }
      history = forecast.map((entry) => ({
        last_updated: entry.datetime || entry.time,
        state: entry.temperature,
      }));
    }

    // A readout can be drawn as a second curve, e.g. the indoor temperature.
    const graphItem = cardItems.find((item) => item.showGraph);
    const graphEntity = graphItem ? entities[graphItem.entityId] : null;
    const secondaryHistoryRaw = graphItem ? tempHistoryById?.[graphItem.entityId] || [] : [];
    const secondaryCurrentTemp = graphEntity ? parseFloat(graphEntity.state) : NaN;

    const historyForDisplay = Array.isArray(history)
      ? history.map((entry) => {
          const raw = parseFloat(entry?.state);
          if (!Number.isFinite(raw)) return entry;
          const converted = convertValueByKind(raw, {
            kind: 'temperature',
            fromUnit: sourceTempUnit,
            unitMode: effectiveUnitMode,
          });
          return Number.isFinite(converted) ? { ...entry, state: converted } : entry;
        })
      : [];

    // The second curve is converted with its own source unit, which is the
    // sensor's own; the main curve uses the weather entity's.
    const secondaryHistoryForDisplay = secondaryHistoryRaw.map((entry) => {
      const raw = parseFloat(entry?.state);
      if (!Number.isFinite(raw)) return entry;
      const converted = convertValueByKind(raw, {
        kind: 'temperature',
        fromUnit: graphEntity?.attributes?.unit_of_measurement || sourceTempUnit,
        unitMode: effectiveUnitMode,
      });
      return Number.isFinite(converted) ? { ...entry, state: converted } : entry;
    });

    const secondaryGraphProps = graphItem
      ? {
          secondaryHistory: secondaryHistoryForDisplay,
          secondaryCurrentTemp: convertValueByKind(secondaryCurrentTemp, {
            kind: 'temperature',
            fromUnit: graphEntity?.attributes?.unit_of_measurement || sourceTempUnit,
            unitMode: effectiveUnitMode,
          }),
          secondaryColor: graphItem.graphColor || '#38bdf8',
        }
      : {};

    if (isSmall) {
      return (
        <div
          key={cardId}
          {...dragProps}
          data-haptic={editMode ? undefined : 'card'}
          onClick={(e) => {
            e.stopPropagation();
            if (!editMode && onOpen) onOpen();
          }}
          className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
          style={cardStyle}
        >
          {getControls(cardId)}
          {showEffects && <WeatherEffects condition={effectCondition} />}
          <div className="absolute inset-0 z-0 opacity-30">
            <WeatherGraph
              history={historyForDisplay}
              currentTemp={displayTempValue}
              historyHours={graphHistoryHours}
              colorLimits={graphColorLimits}
              {...secondaryGraphProps}
            />
          </div>
          <div className="relative z-10 flex min-w-0 flex-1 items-center gap-4">
            <div className="-ml-1 flex h-12 w-12 items-center justify-center drop-shadow-md filter transition-transform duration-500 group-hover:scale-110">
              <img src={iconUrl} alt={info.label} className="h-full w-full object-contain" />
            </div>
            <div className="flex min-w-0 flex-col">
              <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
                {info.label}
              </p>
              <span className="text-2xl leading-none font-light text-[var(--text-primary)]">
                {formatUnitValue(displayTempValue, { fallback: '--' })}
                {displayTempUnit}
              </span>
              {subtitle && (
                <p className="mt-1 truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                  {subtitle}
                </p>
              )}
              {cardItems.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {cardItems.map((item) => (
                    <WeatherCardItem key={item.id} item={item} entities={entities} compact />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
        style={cardStyle}
      >
        {getControls(cardId)}
        {showEffects && <WeatherEffects condition={effectCondition} />}
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="-mt-2 -ml-2 h-20 w-20 drop-shadow-lg filter transition-transform duration-500 group-hover:scale-110">
              <img src={iconUrl} alt={info.label} className="h-full w-full object-contain" />
              {subtitle && (
                <p className="mt-0.5 truncate text-center text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-[var(--text-secondary)]">
                <span className="text-xs font-bold tracking-widest uppercase">{info.label}</span>
              </div>
              <span className="text-4xl leading-none font-thin text-[var(--text-primary)]">
                {formatUnitValue(displayTempValue, { fallback: '--' })}
                {displayTempUnit}
              </span>
            </div>
          </div>
          {cardItems.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {cardItems.map((item) => (
                <WeatherCardItem key={item.id} item={item} entities={entities} />
              ))}
            </div>
          )}
        </div>
        <div className="relative z-0 -mx-7 mt-auto -mb-7 h-32 overflow-hidden rounded-b-3xl opacity-80">
          <WeatherGraph
            history={historyForDisplay}
            currentTemp={displayTempValue}
            historyHours={graphHistoryHours}
            colorLimits={graphColorLimits}
            {...secondaryGraphProps}
          />
        </div>
      </div>
    );
  }
);

export default WeatherTempCard;
