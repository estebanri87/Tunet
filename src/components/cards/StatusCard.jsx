import { memo } from 'react';
import { AlertTriangle, Check } from '../../icons';
import { getIconComponent } from '../../icons';
import { getEntityDisplayName, resolveActiveEntities } from './statusCardUtils';

/**
 * StatusCard – lists only those of its entities that are currently in an
 * active state, e.g. "all windows configured, only the open ones shown".
 * When nothing is active it shows a single all-clear line instead.
 */
const StatusCard = memo(
  /** @param {any} props */ function StatusCard({
    cardId,
    dragProps,
    controls,
    cardStyle,
    cardSettings,
    settingsKey,
    entities,
    customNames,
    customIcons,
    editMode,
    isMobile,
    t,
  }) {
    const translate = t || ((key) => key);
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};

    const active = resolveActiveEntities(settings, entities);
    const hasActive = active.length > 0;
    const name = customNames[cardId] || settings.heading || translate('statusCard.title');

    const Icon = customIcons[cardId]
      ? getIconComponent(customIcons[cardId]) || AlertTriangle
      : AlertTriangle;

    const accent = hasActive
      ? { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' }
      : { color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' };

    return (
      <div
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        className={`glass-texture group relative flex h-full flex-col overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isMobile ? 'gap-2 p-4' : 'gap-3 p-5'} ${editMode ? 'cursor-move' : ''}`}
        style={cardStyle}
      >
        {controls}

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
            style={{ backgroundColor: accent.bg, color: accent.color }}
          >
            {hasActive ? (
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <Check className="h-5 w-5" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
              {name}
            </span>
            {hasActive && (
              <span className="text-sm font-bold" style={{ color: accent.color }}>
                {active.length}
              </span>
            )}
          </div>
        </div>

        <div className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto">
          {hasActive ? (
            <div className="space-y-1">
              {active.map(({ id, entity }) => (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--glass-bg)] px-2.5 py-1.5"
                >
                  <span className="truncate text-xs text-[var(--text-primary)]">
                    {getEntityDisplayName(id, entity)}
                  </span>
                  {settings.showState !== false && (
                    <span className="shrink-0 text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                      {entity.state}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center">
              <span className="text-xs text-[var(--text-secondary)]">
                {settings.emptyText?.trim() || translate('statusCard.allClear')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default StatusCard;
