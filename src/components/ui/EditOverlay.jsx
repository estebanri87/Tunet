/**
 * Edit-mode overlay rendered on top of each card.
 * Contains move, edit, visibility, resize, delete buttons and the drag handle.
 *
 * Extracted from the inline `getControls` function in App.jsx.
 */
import { memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  Maximize2,
  Minimize2,
  Trash2,
} from '../../icons';
import { RESIZABLE_PREFIXES, getNextSize } from '../../config/cardSizing';

function canResize(editId, settings) {
  if (editId === 'car') return true;
  if (['entity', 'toggle', 'sensor', 'fan'].includes(settings?.type)) return true;
  return RESIZABLE_PREFIXES.some((p) => editId.startsWith(p));
}

function EditOverlay({
  cardId: _cardId,
  editId,
  settingsKey: _settingsKey,
  isHidden,
  currentSize,
  settings,
  canRemove,
  onMoveLeft,
  onMoveRight,
  onEdit,
  onToggleVisibility,
  onSaveSize,
  onRemove,
  dragHandleProps,
  t,
}) {
  const isSpacerCard = editId?.startsWith('spacer_card_');
  const isCompactSpacer =
    isSpacerCard && Number(settings?.heightPx || 0) > 0 && Number(settings?.heightPx || 0) <= 56;
  const showResize = canResize(editId, settings);
  const isSmall = currentSize === 'small';
  const isFull = currentSize === 'full';
  const topOffsetClass = isCompactSpacer ? 'top-1' : 'top-2';
  const sideOffsetClass = isCompactSpacer ? 'left-1' : 'left-2';
  const rightOffsetClass = isCompactSpacer ? 'right-1' : 'right-2';
  const gapClass = isCompactSpacer ? 'gap-1' : 'gap-2';
  const buttonClass = isCompactSpacer
    ? 'p-1 rounded-full text-white border border-white/20 shadow-lg bg-black/60'
    : 'p-2 rounded-full text-white border border-white/20 shadow-lg bg-black/60';
  const hoverButtonClass = isCompactSpacer
    ? 'p-1 rounded-full transition-colors hover:bg-[var(--accent-bg)] text-white border border-white/20 shadow-lg bg-black/60'
    : 'p-2 rounded-full transition-colors hover:bg-[var(--accent-bg)] text-white border border-white/20 shadow-lg bg-black/60';
  const iconClass = isCompactSpacer ? 'w-3 h-3' : 'w-4 h-4';
  const dragHandleClass = isCompactSpacer
    ? 'flex items-center justify-center p-1.5 rounded-full bg-black/50 border border-white/10 text-white/80 shadow-lg pointer-events-auto'
    : 'flex items-center justify-center p-3 rounded-full bg-black/50 border border-white/10 text-white/80 shadow-lg pointer-events-auto';
  const dragIconClass = isCompactSpacer ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <>
      {/* Move buttons – top left */}
      <div className={`absolute ${topOffsetClass} ${sideOffsetClass} z-50 flex ${gapClass}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveLeft();
          }}
          className={hoverButtonClass}
          title={t('tooltip.moveLeft')}
          aria-label={t('tooltip.moveLeft')}
        >
          <ChevronLeft className={iconClass} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveRight();
          }}
          className={hoverButtonClass}
          title={t('tooltip.moveRight')}
          aria-label={t('tooltip.moveRight')}
        >
          <ChevronRight className={iconClass} />
        </button>
      </div>

      {/* Action buttons – top right */}
      <div className={`absolute ${topOffsetClass} ${rightOffsetClass} z-50 flex ${gapClass}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={buttonClass}
          title={t('tooltip.editCard')}
          aria-label={t('tooltip.editCard')}
        >
          <Edit2 className={iconClass} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className={`${isCompactSpacer ? 'p-1' : 'p-2'} rounded-full border border-white/20 text-white shadow-lg transition-colors hover:bg-white/20`}
          style={{ backgroundColor: isHidden ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 0, 0, 0.6)' }}
          title={isHidden ? t('tooltip.showCard') : t('tooltip.hideCard')}
          aria-label={isHidden ? t('tooltip.showCard') : t('tooltip.hideCard')}
        >
          {isHidden ? <EyeOff className={iconClass} /> : <Eye className={iconClass} />}
        </button>
        {showResize && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveSize(getNextSize(currentSize));
            }}
            className={`${isCompactSpacer ? 'p-1' : 'p-2'} rounded-full border border-white/20 text-white shadow-lg transition-colors hover:bg-[var(--accent-color)]`}
            style={{ backgroundColor: isSmall ? 'var(--accent-color)' : 'rgba(0, 0, 0, 0.6)' }}
            title={t('tooltip.cycleSize') || 'Cycle size'}
            aria-label={t('tooltip.cycleSize') || 'Cycle size'}
          >
            {isFull ? <Minimize2 className={iconClass} /> : <Maximize2 className={iconClass} />}
          </button>
        )}
        {canRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={`${isCompactSpacer ? 'p-1' : 'p-2'} rounded-full border border-white/20 bg-black/60 text-white shadow-lg transition-colors hover:bg-red-500/80`}
            title={t('tooltip.removeCard')}
            aria-label={t('tooltip.removeCard')}
          >
            <Trash2 className={iconClass} />
          </button>
        )}
      </div>

      {/* Central drag handle */}
      <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
        <button
          type="button"
          data-drag-handle
          {...dragHandleProps}
          style={{ touchAction: 'none' }}
          className={dragHandleClass}
          aria-label={t('tooltip.reorderCard') || 'Reorder card'}
          title={t('tooltip.reorderCard') || 'Reorder card'}
        >
          <GripVertical className={dragIconClass} />
        </button>
      </div>
    </>
  );
}

export default memo(EditOverlay);
