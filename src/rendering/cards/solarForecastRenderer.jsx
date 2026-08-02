import { SolarForecastCard } from '../../components';
import { getSettings } from '../helpers';

export function renderSolarForecastCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, isMobile, t } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  return (
    <SolarForecastCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      settings={settings}
      isMobile={isMobile}
      t={t}
    />
  );
}
