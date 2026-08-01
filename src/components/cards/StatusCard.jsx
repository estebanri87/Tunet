import { memo } from 'react';
import { AlertTriangle, Check } from '../../icons';
import { getIconComponent } from '../../icons';
import { resolveStatusGroups } from './statusCardUtils';

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

    const groups = resolveStatusGroups(settings, entities);
    const allEntries = groups.flatMap((group) => group.entries);
    const activeCount = allEntries.filter((entry) => entry.active).length;
    const hasActive = activeCount > 0;
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
        className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isMobile ? 'gap-2 p-4' : 'gap-3 p-5'} ${editMode ? 'glass-texture cursor-move' : ''}`}
        /* Frameless like the spacer: the card is a plain status readout, not a
           tile. In edit mode it keeps its surface so it stays grabbable. */
        style={
          editMode
            ? cardStyle
            : { ...cardStyle, backgroundColor: 'transparent', borderColor: 'transparent' }
        }
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
                {activeCount}
              </span>
            )}
          </div>
        </div>

        <div className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto">
          {groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((group) => {
                const GroupIcon = group.icon ? getIconComponent(group.icon) : null;
                return (
                  <div key={group.id} className="space-y-1.5">
                    {(group.name || GroupIcon) && (
                      <div className="flex items-center gap-1.5">
                        {GroupIcon && (
                          <GroupIcon
                            className="h-3.5 w-3.5 text-[var(--text-muted)]"
                            strokeWidth={1.5}
                          />
                        )}
                        <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-muted)] uppercase">
                          {group.name}
                        </span>
                      </div>
                    )}
                    {group.entries.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {group.entries.map((entry) => {
                          const EntryIcon = entry.icon ? getIconComponent(entry.icon) : null;
                          return (
                            <span
                              key={entry.id}
                              className="flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5"
                              title={entry.label}
                            >
                              {EntryIcon ? (
                                <EntryIcon
                                  className="h-3.5 w-3.5 shrink-0"
                                  strokeWidth={1.5}
                                  style={{
                                    color: entry.active ? accent.color : 'var(--text-muted)',
                                  }}
                                />
                              ) : (
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: entry.active
                                      ? accent.color
                                      : 'var(--text-muted)',
                                  }}
                                />
                              )}
                              <span className="truncate text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                                {entry.label}
                              </span>
                              {settings.showState !== false && (
                                <span className="shrink-0 text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                                  {entry.stateText}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="block text-xs text-[var(--text-secondary)]">
                        {group.emptyText}
                      </span>
                    )}
                  </div>
                );
              })}
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
