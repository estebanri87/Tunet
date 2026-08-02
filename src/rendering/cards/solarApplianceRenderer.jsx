import { SolarApplianceCard } from '../../components';
import { getSettings } from '../helpers';
import { getLocaleForLanguage } from '../../i18n';

export function renderSolarApplianceCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, callService, isMobile, t, conn, language } =
    ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const locale = getLocaleForLanguage(language);
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
      locale={locale}
      t={t}
    />
  );
}
