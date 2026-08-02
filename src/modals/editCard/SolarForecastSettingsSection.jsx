import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';

const MAX_INSTANCES = 3;

const createInstanceId = () => `fc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const TextField = ({ label, value, onBlur, placeholder }) => (
  <div className="space-y-2">
    <label className="ml-1 text-xs font-bold text-[var(--text-muted)] uppercase">{label}</label>
    <input
      type="text"
      className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
      defaultValue={value || ''}
      onBlur={(e) => onBlur(e.target.value.trim() || null)}
      placeholder={placeholder}
    />
  </div>
);

export function SolarForecastSettingsSection({
  t,
  entities,
  editSettings,
  editSettingsKey,
  saveCardSetting,
}) {
  const persist = React.useCallback(
    (key, value) => {
      if (!editSettingsKey) return;
      saveCardSetting(editSettingsKey, key, value);
    },
    [editSettingsKey, saveCardSetting]
  );

  const instances = Array.isArray(editSettings.instances) ? editSettings.instances : [];

  const sensorOptions = React.useMemo(
    () => Object.keys(entities || {}).filter((id) => id.startsWith('sensor.')),
    [entities]
  );

  const updateInstance = (id, patch) =>
    persist(
      'instances',
      instances.map((instance) => (instance.id === id ? { ...instance, ...patch } : instance))
    );

  const removeInstance = (id) =>
    persist(
      'instances',
      instances.filter((instance) => instance.id !== id)
    );

  const addInstance = () =>
    persist('instances', [...instances, { id: createInstanceId() }]);

  const picker = (instance, key, label) => (
    <SearchableSelect
      label={label}
      value={instance[key]}
      options={sensorOptions}
      onChange={(value) => updateInstance(instance.id, { [key]: value })}
      placeholder={t('dropdown.noneSelected')}
      entities={entities}
      t={t}
      maxOptions={150}
    />
  );

  return (
    <div className="space-y-5">
      <TextField
        label={t('solarForecast.heading')}
        value={editSettings.heading}
        onBlur={(value) => persist('heading', value)}
        placeholder={t('solarForecast.title')}
      />

      <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
        {instances.map((instance, index) => (
          <div
            key={instance.id}
            className="popup-surface space-y-3 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                {`${t('solarForecast.instance')} ${index + 1}`}
              </span>
              <button
                onClick={() => removeInstance(instance.id)}
                aria-label={t('solarForecast.removeInstance')}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {picker(instance, 'energyTodayId', t('solarForecast.today'))}
            {picker(instance, 'energyRemainingId', t('solarForecast.remaining'))}
            {picker(instance, 'energyNextHourId', t('solarForecast.nextHour'))}
            {picker(instance, 'energyTomorrowId', t('solarForecast.tomorrow'))}
          </div>
        ))}

        {instances.length < MAX_INSTANCES && (
          <button
            onClick={addInstance}
            className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('solarForecast.addInstance')}
          </button>
        )}
      </div>
    </div>
  );
}

export default SolarForecastSettingsSection;
