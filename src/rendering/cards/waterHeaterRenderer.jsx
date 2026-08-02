import { WaterHeaterCard } from '../../components';
import { getSettings } from '../helpers';

export function renderWaterHeaterCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, callService, isMobile, t } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  return (
    <WaterHeaterCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      callService={callService}
      customNames={customNames}
      settings={settings}
      isMobile={isMobile}
      t={t}
    />
  );
}
