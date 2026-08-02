import { SolarSystemCard } from '../../components';
import { getSettings } from '../helpers';

export function renderSolarSystemCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, callService, isMobile, t } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  return (
    <SolarSystemCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      callService={callService}
      customNames={customNames}
      customIcons={customIcons}
      settings={settings}
      isMobile={isMobile}
      t={t}
    />
  );
}
