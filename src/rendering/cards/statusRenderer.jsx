import { StatusCard } from '../../components';

/**
 * @param {string} cardId
 * @param {Record<string, any>} dragProps
 * @param {(id: string) => any} getControls
 * @param {Record<string, any>} cardStyle
 * @param {string} settingsKey
 * @param {Record<string, any>} ctx
 */
export function renderStatusCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { editMode, cardSettings, entities, customNames, customIcons, isMobile, t } = ctx;
  return (
    <StatusCard
      key={cardId}
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      cardSettings={cardSettings}
      settingsKey={settingsKey}
      entities={entities}
      customNames={customNames}
      customIcons={customIcons}
      editMode={editMode}
      isMobile={isMobile}
      t={t}
    />
  );
}
