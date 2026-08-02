import React from 'react';
import { SearchableSelect } from './CarMappingsSection';
import IconPicker from '../../components/ui/IconPicker';
import { getIconComponent } from '../../icons';

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

const NumberField = ({ label, value, placeholder, onChange }) => (
  <div className="space-y-2">
    <label className="ml-1 text-xs font-bold text-[var(--text-muted)] uppercase">{label}</label>
    <input
      type="number"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] outline-none"
    />
  </div>
);

export function SolarApplianceSettingsSection({
  t,
  entities,
  editSettings,
  editSettingsKey,
  saveCardSetting,
}) {
  const [showIcons, setShowIcons] = React.useState(false);
  const persist = React.useCallback(
    (key, value) => {
      if (!editSettingsKey) return;
      saveCardSetting(editSettingsKey, key, value);
    },
    [editSettingsKey, saveCardSetting]
  );

  const allIds = React.useMemo(() => Object.keys(entities || {}), [entities]);
  const switchOptions = React.useMemo(() => allIds.filter((id) => id.startsWith('switch.')), [allIds]);
  const sensorOptions = React.useMemo(() => allIds.filter((id) => id.startsWith('sensor.')), [allIds]);
  const programOptions = React.useMemo(
    () => allIds.filter((id) => id.startsWith('sensor.') || id.startsWith('select.')),
    [allIds]
  );
  const SelectedIcon = editSettings.icon ? getIconComponent(editSettings.icon) : null;

  return (
    <div className="space-y-5">
      <TextField
        label={t('solarAppliance.label')}
        value={editSettings.label}
        onBlur={(value) => persist('label', value)}
        placeholder={t('solarAppliance.labelPlaceholder')}
      />

      <div>
        <button
          onClick={() => setShowIcons((prev) => !prev)}
          className="popup-surface popup-surface-hover flex w-full items-center justify-between rounded-2xl px-5 py-3"
        >
          <span className="flex items-center gap-3 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            {SelectedIcon ? <SelectedIcon className="h-5 w-5 text-[var(--text-primary)]" /> : null}
            {t('solarAppliance.icon')}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {editSettings.icon || t('dropdown.noneSelected')}
          </span>
        </button>
        {showIcons && (
          <div className="mt-2">
            <IconPicker
              value={editSettings.icon}
              onSelect={(iconName) => {
                persist('icon', iconName);
                setShowIcons(false);
              }}
              onClear={() => persist('icon', null)}
              t={t}
            />
          </div>
        )}
      </div>

      <SearchableSelect
        label={t('solarAppliance.switchEntity')}
        value={editSettings.switchEntityId}
        options={switchOptions}
        onChange={(value) => persist('switchEntityId', value)}
        placeholder={t('dropdown.noneSelected')}
        entities={entities}
        t={t}
        maxOptions={150}
      />

      <SearchableSelect
        label={t('solarAppliance.powerEntity')}
        value={editSettings.powerEntityId}
        options={sensorOptions}
        onChange={(value) => persist('powerEntityId', value)}
        placeholder={t('dropdown.noneSelected')}
        entities={entities}
        t={t}
        maxOptions={150}
      />

      <SearchableSelect
        label={t('solarAppliance.programEntity')}
        value={editSettings.programEntityId}
        options={programOptions}
        onChange={(value) => persist('programEntityId', value)}
        placeholder={t('dropdown.noneSelected')}
        entities={entities}
        t={t}
        maxOptions={150}
      />
      <p className="-mt-3 ml-1 text-[11px] text-[var(--text-muted)]">{t('solarAppliance.programEntityHint')}</p>

      <SearchableSelect
        label={t('solarAppliance.remainingTimeEntity')}
        value={editSettings.remainingTimeEntityId}
        options={sensorOptions}
        onChange={(value) => persist('remainingTimeEntityId', value)}
        placeholder={t('dropdown.noneSelected')}
        entities={entities}
        t={t}
        maxOptions={150}
      />

      <NumberField
        label={t('solarAppliance.typicalWattage')}
        value={editSettings.typicalWattage}
        placeholder="2000"
        onChange={(value) => persist('typicalWattage', value)}
      />
      <p className="-mt-3 ml-1 text-[11px] text-[var(--text-muted)]">{t('solarAppliance.typicalWattageHint')}</p>
    </div>
  );
}

export default SolarApplianceSettingsSection;
