import { SolarApplianceCard } from '../../components';
import { getSettings } from '../helpers';

export function renderSolarApplianceCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, callService, isMobile, t, conn } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  return (
    <SolarApplianceCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      conn={conn}
      callService={callService}
      customNames={customNames}
      customIcons={customIcons}
      settings={settings}
      isMobile={isMobile}
      t={t}
    />
  );
}
