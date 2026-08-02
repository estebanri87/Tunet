import React from 'react';
import { SearchableSelect } from './CarMappingsSection';

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

export function WaterHeaterSettingsSection({ t, entities, editSettings, editSettingsKey, saveCardSetting }) {
  const persist = React.useCallback(
    (key, value) => {
      if (!editSettingsKey) return;
      saveCardSetting(editSettingsKey, key, value);
    },
    [editSettingsKey, saveCardSetting]
  );

  const waterHeaterOptions = React.useMemo(
    () => Object.keys(entities || {}).filter((id) => id.startsWith('water_heater.')),
    [entities]
  );

  return (
    <div className="space-y-5">
      <TextField
        label={t('waterHeater.heading')}
        value={editSettings.heading}
        onBlur={(value) => persist('heading', value)}
        placeholder={t('waterHeater.title')}
      />
      <SearchableSelect
        label={t('waterHeater.entity')}
        value={editSettings.entityId}
        options={waterHeaterOptions}
        onChange={(value) => persist('entityId', value)}
        placeholder={t('dropdown.noneSelected')}
        entities={entities}
        t={t}
        maxOptions={150}
      />
    </div>
  );
}

export default WaterHeaterSettingsSection;
