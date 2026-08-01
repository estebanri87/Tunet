import React from 'react';
import { Check, Search } from 'lucide-react';
import { MAX_STATUS_ENTITIES, getStatusEntityIds } from '../../components/cards/statusCardUtils';

/**
 * Editor for the status card: pick the entities to watch, then decide which
 * of their states counts as worth showing.
 */
export function StatusCardSection({ t, entities, editSettings, editSettingsKey, saveCardSetting }) {
  const [query, setQuery] = React.useState('');
  const selectedIds = React.useMemo(() => getStatusEntityIds(editSettings), [editSettings]);

  const options = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.keys(entities || {})
      .filter((id) => {
        if (!q) return true;
        const name = entities[id]?.attributes?.friendly_name || id;
        return id.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const nameA = entities[a]?.attributes?.friendly_name || a;
        const nameB = entities[b]?.attributes?.friendly_name || b;
        return nameA.localeCompare(nameB);
      })
      .slice(0, 200);
  }, [entities, query]);

  const persist = (key, value) => {
    if (!editSettingsKey) return;
    saveCardSetting(editSettingsKey, key, value);
  };

  const toggleEntity = (id) => {
    const exists = selectedIds.includes(id);
    if (!exists && selectedIds.length >= MAX_STATUS_ENTITIES) return;
    persist(
      'entityIds',
      exists ? selectedIds.filter((entry) => entry !== id) : [...selectedIds, id]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="px-1">
          <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('statusCard.entities')}
          </span>
          <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">
            {t('statusCard.entitiesHint')}
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id) => (
              <button
                key={id}
                onClick={() => toggleEntity(id)}
                className="flex items-center gap-2 rounded-xl bg-[var(--glass-bg-hover)] px-3 py-1.5 text-[11px] text-[var(--text-primary)]"
              >
                {entities[id]?.attributes?.friendly_name || id}
                <span className="text-[var(--text-muted)]">×</span>
              </button>
            ))}
          </div>
        )}

        <div className="popup-surface flex items-center gap-2 rounded-2xl px-4 py-2">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('form.search')}
            className="w-full bg-transparent py-1 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>

        <div className="popup-surface custom-scrollbar max-h-56 space-y-1 overflow-y-auto rounded-2xl p-2">
          {options.length === 0 && (
            <p className="py-4 text-center text-xs text-[var(--text-muted)]">
              {t('form.noResults')}
            </p>
          )}
          {options.map((id) => {
            const isSelected = selectedIds.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleEntity(id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${isSelected ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'border-gray-500'}`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent-color)]" />}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-[var(--text-primary)]">
                    {entities[id]?.attributes?.friendly_name || id}
                  </span>
                  <span className="truncate font-mono text-[10px] text-[var(--text-muted)]">
                    {id}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 border-t border-[var(--glass-border)] pt-4">
        <label className="ml-1 text-xs font-bold text-[var(--text-muted)] uppercase">
          {t('statusCard.activeStates')}
        </label>
        <input
          type="text"
          defaultValue={editSettings.activeStates || ''}
          onBlur={(e) => persist('activeStates', e.target.value.trim() || null)}
          placeholder={t('statusCard.activeStatesPlaceholder')}
          className="popup-surface w-full rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        <p className="ml-1 text-[11px] text-[var(--text-muted)] opacity-70">
          {t('statusCard.activeStatesHint')}
        </p>
      </div>

      <div className="popup-surface flex items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <span className="block text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('statusCard.invert')}
          </span>
          <span className="mt-1 block text-[11px] text-[var(--text-muted)] opacity-70">
            {t('statusCard.invertHint')}
          </span>
        </div>
        <button
          onClick={() => persist('invertSelection', !(editSettings.invertSelection === true))}
          className="relative h-6 w-12 flex-shrink-0 rounded-full bg-[var(--glass-bg-hover)] transition-colors"
        >
          <div
            className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--text-primary)] transition-all ${editSettings.invertSelection === true ? 'left-7' : 'left-1'}`}
          />
        </button>
      </div>

      <div className="space-y-2">
        <label className="ml-1 text-xs font-bold text-[var(--text-muted)] uppercase">
          {t('statusCard.emptyText')}
        </label>
        <input
          type="text"
          defaultValue={editSettings.emptyText || ''}
          onBlur={(e) => persist('emptyText', e.target.value.trim() || null)}
          placeholder={t('statusCard.allClear')}
          className="popup-surface w-full rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div className="popup-surface flex items-center justify-between gap-4 rounded-2xl p-4">
        <span className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {t('statusCard.showState')}
        </span>
        <button
          onClick={() => persist('showState', editSettings.showState === false)}
          className="relative h-6 w-12 flex-shrink-0 rounded-full bg-[var(--glass-bg-hover)] transition-colors"
        >
          <div
            className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--text-primary)] transition-all ${editSettings.showState !== false ? 'left-7' : 'left-1'}`}
          />
        </button>
      </div>
    </div>
  );
}

export default StatusCardSection;
