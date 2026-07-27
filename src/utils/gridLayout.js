/**
 * Grid layout algorithm – computes card positions & spans for the dashboard grid.
 * Pure functions with zero React / UI dependencies.
 */
import { SIZE_SPAN_TABLE, EXPANSIVE_SIZE_PREFIXES, RESIZABLE_PREFIXES } from '../config/cardSizing';

/**
 * Determine how many grid columns a card should span.
 *
 * @param {string} cardId
 * @param {Function} getCardSettingsKey  (cardId) => settingsKey
 * @param {Object}  cardSettings         Full card-settings map
 * @param {string}  activePage           Current active page id
 * @param {{rowPx?: number, gapPx?: number}} [layoutMetrics] Runtime layout metrics
 * @returns {number} 1+
 */
// Size-to-span mapping table (small/medium/large/full → row span), shared with
// EditOverlay's resize-button cycle. See src/config/cardSizing.js.
const SPAN_TABLE = SIZE_SPAN_TABLE;

// prefix match → category  (checked in order). Automation entities are
// handled separately below since their resizability also depends on `type`.
const CARD_SPAN_RULES = RESIZABLE_PREFIXES.map((prefix) => ({
  prefix,
  category: EXPANSIVE_SIZE_PREFIXES.includes(prefix) ? 'expansive' : 'compact',
}));

export const getCardGridSpan = (
  cardId,
  getCardSettingsKey,
  cardSettings,
  activePage,
  layoutMetrics = {}
) => {
  const settings = cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};
  const rowPx = Number.isFinite(layoutMetrics?.rowPx) ? layoutMetrics.rowPx : 100;
  const gapPx = Number.isFinite(layoutMetrics?.gapPx) ? layoutMetrics.gapPx : 20;

  if (cardId.startsWith('spacer_card_')) {
    const rawHeightPx = Number(settings.heightPx);
    if (Number.isFinite(rawHeightPx) && rawHeightPx > 0) {
      const estimatedRows = Math.ceil((rawHeightPx + gapPx) / (rowPx + gapPx));
      return Math.max(1, estimatedRows);
    }

    const rawHeightRows = Number(settings.heightRows);
    if (Number.isFinite(rawHeightRows) && rawHeightRows >= 1) {
      return Math.max(1, Math.round(rawHeightRows));
    }
  }

  // Automations have their own logic based on type sub-setting
  if (cardId.startsWith('automation.')) {
    if (['sensor', 'entity', 'toggle'].includes(settings.type)) {
      const sizeSetting = settings?.size;
      return SPAN_TABLE.compact[sizeSetting] ?? SPAN_TABLE.compact.default;
    }
    return 1;
  }

  // Exact-match for legacy 'car' id
  if (cardId === 'car') {
    const sizeSetting = settings?.size;
    return SPAN_TABLE.compact[sizeSetting] ?? SPAN_TABLE.compact.default;
  }

  // Table-driven lookup for prefix-matched card types
  for (const rule of CARD_SPAN_RULES) {
    if (cardId.startsWith(rule.prefix)) {
      const sizeSetting = settings?.size;
      const mapping = SPAN_TABLE[rule.category];
      return mapping[sizeSetting] ?? mapping.default;
    }
  }

  // Default behaviour for all other cards
  const sizeSetting = settings?.size;
  if (sizeSetting === 'small') return 1;
  if (activePage === 'settings' && cardId !== 'car' && !cardId.startsWith('media_player')) return 1;

  return SPAN_TABLE.compact[sizeSetting] ?? SPAN_TABLE.compact.default;
};

/**
 * Determine how many grid columns a card should occupy horizontally.
 *
 * @param {string}   cardId
 * @param {Function} getCardSettingsKey  (cardId) => settingsKey
 * @param {Object}   cardSettings        Full card-settings map
 * @returns {number} 1–4
 */
export const getCardColSpan = (cardId, getCardSettingsKey, cardSettings) => {
  const settings = cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};
  if (settings.colSpan === 'full') return Number.MAX_SAFE_INTEGER;
  return settings.colSpan || 1;
};

/**
 * Build a position map for a list of card ids.
 *
 * @param {string[]}  ids       Ordered card ids
 * @param {number}    columns   Number of grid columns
 * @param {Function}  spanFn    (cardId) => number  – pre-bound getCardGridSpan (row span)
 * @param {Function}  [colSpanFn] (cardId) => number  – pre-bound getCardColSpan
 * @returns {Object}  { [cardId]: { row, col, span, colSpan } }
 */
export const buildGridLayout = (ids, columns, spanFn, colSpanFn) => {
  if (!columns || columns < 1) return {};
  const occupancy = [];
  const positions = {};

  const ensureRow = (row) => {
    if (!occupancy[row]) occupancy[row] = Array(columns).fill(false);
  };

  const canPlace = (row, col, rowSpan, colSpan) => {
    if (col + colSpan > columns) return false;
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        if (occupancy[r][c]) return false;
      }
    }
    return true;
  };

  const place = (row, col, rowSpan, colSpan) => {
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        occupancy[r][c] = true;
      }
    }
  };

  const placeSingle = (id, rowSpan, colSpan) => {
    let placed = false;
    let row = 0;
    while (!placed) {
      ensureRow(row);
      for (let col = 0; col < columns; col += 1) {
        if (canPlace(row, col, rowSpan, colSpan)) {
          place(row, col, rowSpan, colSpan);
          positions[id] = { row: row + 1, col: col + 1, span: rowSpan, colSpan };
          placed = true;
          break;
        }
      }
      if (!placed) row += 1;
    }
  };

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const rowSpan = spanFn(id);
    const colSpan = colSpanFn ? Math.min(colSpanFn(id), columns) : 1;
    placeSingle(id, rowSpan, colSpan);
  }

  return positions;
};
