import { WaterHeaterCard } from '../../components';
import { getSettings } from '../helpers';

export function renderWaterHeaterCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, callService, isMobile, t, conn } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  return (
    <WaterHeaterCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      editMode={editMode}
      conn={conn}
      callService={callService}
      customNames={customNames}
      settings={settings}
      isMobile={isMobile}
      t={t}
    />
  );
}
