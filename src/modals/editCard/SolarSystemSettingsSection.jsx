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

const NumberField = ({ label, value, onBlur, placeholder }) => (
  <div className="space-y-2">
    <label className="ml-1 text-xs font-bold text-[var(--text-muted)] uppercase">{label}</label>
    <input
      type="number"
      step="0.1"
      className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
      defaultValue={value ?? ''}
      onBlur={(e) => {
        const trimmed = e.target.value.trim();
        onBlur(trimmed === '' ? null : Number(trimmed));
      }}
      placeholder={placeholder}
    />
  </div>
);

const SectionLabel = ({ title }) => (
  <span className="block px-1 text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
    {title}
  </span>
);

export function SolarSystemSettingsSection({ t, entities, editSettings, editSettingsKey, saveCardSetting }) {
  const persist = React.useCallback(
    (key, value) => {
      if (!editSettingsKey) return;
      saveCardSetting(editSettingsKey, key, value);
    },
    [editSettingsKey, saveCardSetting]
  );

  const allIds = React.useMemo(() => Object.keys(entities || {}), [entities]);
  const sensorOptions = React.useMemo(
    () => allIds.filter((id) => ['sensor', 'input_number', 'number'].includes(id.split('.')[0])),
    [allIds]
  );
  const switchOptions = React.useMemo(() => allIds.filter((id) => id.startsWith('switch.')), [allIds]);

  const picker = (key, label) => (
    <SearchableSelect
      label={label}
      value={editSettings[key]}
      options={sensorOptions}
      onChange={(value) => persist(key, value)}
      placeholder={t('dropdown.noneSelected')}
      entities={entities}
      t={t}
      maxOptions={150}
    />
  );

  return (
    <div className="space-y-5">
      <TextField
        label={t('solarSystem.heading')}
        value={editSettings.heading}
        onBlur={(value) => persist('heading', value)}
        placeholder={t('solarSystem.title')}
      />

      <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
        <SectionLabel title={t('solarSystem.production')} />
        {picker('pvPowerId', t('solarSystem.pvPower'))}
        {picker('todayProductionId', t('solarSystem.today'))}
        {picker('lifetimeProductionId', t('solarSystem.lifetime'))}
      </div>

      <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
        <SectionLabel title={t('solarSystem.battery')} />
        {picker('batteryPowerId', t('solarSystem.batteryPower'))}
        {picker('batteryModeId', t('solarSystem.batteryMode'))}
        {picker('batterySocId', t('solarSystem.batterySoc'))}
        <NumberField
          label={t('solarSystem.batteryCapacityKwh')}
          value={editSettings.batteryCapacityKwh}
          onBlur={(value) => persist('batteryCapacityKwh', value)}
          placeholder="10"
        />
        {picker('batteryReserveId', t('solarSystem.batteryReserve'))}
      </div>

      <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
        <SectionLabel title={t('solarSystem.gridAndHealth')} />
        {picker('gridPowerId', t('solarSystem.grid'))}
        {picker('healthStateId', t('solarSystem.healthState'))}
        {picker('healthAlarmId', t('solarSystem.healthAlarm'))}
        {picker('healthFaultId', t('solarSystem.healthFault'))}
        <SearchableSelect
          label={t('solarSystem.controlSwitch')}
          value={editSettings.controlSwitchId}
          options={switchOptions}
          onChange={(value) => persist('controlSwitchId', value)}
          placeholder={t('dropdown.noneSelected')}
          entities={entities}
          t={t}
          maxOptions={150}
        />
      </div>
    </div>
  );
}

export default SolarSystemSettingsSection;
