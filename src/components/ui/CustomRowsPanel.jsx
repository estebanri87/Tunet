import { useCallback, useMemo } from 'react';
import {
  getActionServiceCall,
  getRenderableRows,
  getToggleServiceCall,
  isToggleRowActive,
} from '../../modals/editCard/customRows';

const EMPTY_ENTITIES = {};

/* -- User-defined row (toggle) --------------------------------------- */
const CustomToggleRow = ({ label, entity, entityId, onToggle, translate }) => {
  const rowState = entity?.state;
  const rowUnavailable = rowState === 'unavailable' || rowState === 'unknown' || !rowState;
  const isActive = !rowUnavailable && isToggleRowActive(entityId, rowState);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--glass-bg)] px-3 py-2.5">
      <div className="min-w-0">
        <span className="block truncate text-xs font-bold text-[var(--text-primary)]">{label}</span>
        <span className="block text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
          {rowUnavailable
            ? translate('status.unavailable')
            : isActive
              ? translate('status.on')
              : translate('status.off')}
        </span>
      </div>
      <button
        onClick={() => !rowUnavailable && onToggle(isActive)}
        disabled={rowUnavailable}
        role="switch"
        aria-checked={isActive}
        aria-label={label}
        className="relative h-6 w-12 flex-shrink-0 rounded-full bg-[var(--glass-bg-hover)] transition-colors disabled:opacity-40"
        style={isActive ? { backgroundColor: 'rgba(52,211,153,0.25)' } : undefined}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full transition-all ${isActive ? 'left-7' : 'left-1'}`}
          style={{ backgroundColor: isActive ? '#34d399' : 'var(--text-primary)' }}
        />
      </button>
    </div>
  );
};

/**
 * Renders the rows a card defines for its popup: toggles, action buttons and
 * read-only status lines. Shared by the cover, light and sensor popups so a
 * card can carry things like a shading lock or a scene button without needing
 * a tile of its own.
 *
 * Status rows are rendered by the host popup instead, via `statusRows`, so they
 * can join an existing information block.
 */
export default function CustomRowsPanel({
  rows,
  entities,
  callService,
  translate,
  className = '',
}) {
  const allEntities = entities || EMPTY_ENTITIES;

  const toggleRows = useMemo(
    () => getRenderableRows(rows, allEntities, 'toggle'),
    [rows, allEntities]
  );
  const actionRows = useMemo(
    () => getRenderableRows(rows, allEntities, 'action'),
    [rows, allEntities]
  );

  const rowLabel = useCallback(
    (row) =>
      row.label?.trim() || allEntities[row.entityId]?.attributes?.friendly_name || row.entityId,
    [allEntities]
  );

  const handleToggleRow = useCallback(
    (rowEntityId, isActive) => {
      const { domain, service } = getToggleServiceCall(rowEntityId, isActive);
      callService(domain, service, { entity_id: rowEntityId });
    },
    [callService]
  );

  const handleActionRow = useCallback(
    (rowEntityId) => {
      const { domain, service } = getActionServiceCall(rowEntityId);
      callService(domain, service, { entity_id: rowEntityId });
    },
    [callService]
  );

  if (toggleRows.length === 0 && actionRows.length === 0) return null;

  return (
    <div className={className}>
      {toggleRows.length > 0 && (
        <div>
          <h3 className="mb-2 pl-1 text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase md:mb-4">
            {translate('cover.controls')}
          </h3>
          <div className="space-y-2">
            {toggleRows.map((row) => (
              <CustomToggleRow
                key={row.id}
                label={rowLabel(row)}
                entity={allEntities[row.entityId]}
                entityId={row.entityId}
                onToggle={(isActive) => handleToggleRow(row.entityId, isActive)}
                translate={translate}
              />
            ))}
          </div>
        </div>
      )}

      {actionRows.length > 0 && (
        <div className={toggleRows.length > 0 ? 'mt-4 md:mt-6' : ''}>
          <h3 className="mb-2 pl-1 text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase md:mb-4">
            {translate('cover.actions')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {actionRows.map((row) => (
              <button
                key={row.id}
                onClick={() => handleActionRow(row.entityId)}
                className="rounded-xl border border-transparent bg-[var(--glass-bg)] px-3 py-2.5 text-center text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-all duration-200 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              >
                {rowLabel(row)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Status rows plus their formatted value, for the host popup's info block. */
export const useStatusRows = (rows, entities, translate) => {
  const allEntities = entities || EMPTY_ENTITIES;
  return useMemo(
    () =>
      getRenderableRows(rows, allEntities, 'status').map((row) => {
        const rowEntity = allEntities[row.entityId];
        const rowState = rowEntity?.state;
        let value;
        if (!rowState || rowState === 'unavailable' || rowState === 'unknown') {
          value = translate('status.unavailable');
        } else if (rowState === 'on') {
          value = translate('status.on');
        } else if (rowState === 'off') {
          value = translate('status.off');
        } else {
          const unit = rowEntity?.attributes?.unit_of_measurement;
          value = unit ? `${rowState} ${unit}` : rowState;
        }
        return {
          id: row.id,
          label: row.label?.trim() || rowEntity?.attributes?.friendly_name || row.entityId,
          value,
        };
      }),
    [rows, allEntities, translate]
  );
};
