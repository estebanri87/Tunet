import { EnergyFlowCard } from '../../components';
import { getSettings } from '../helpers';

export function renderEnergyFlowCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, isMobile, t } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  return (
    <EnergyFlowCard
      cardId={cardId}
      gridEntityId={settings.gridId}
      solarEntityId={settings.solarId}
      batteryEntityId={settings.batteryId}
      homeEntityId={settings.homeId}
      entities={entities}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      settings={settings}
      isMobile={isMobile}
      t={t}
    />
  );
}
