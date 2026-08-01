import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown, X } from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { getIconComponent } from '../icons';
import CustomRowsPanel, { useStatusRows } from '../components/ui/CustomRowsPanel';
import {
  DEFAULT_POSITION_PRESETS,
  DEFAULT_TILT_PRESETS,
  normalizePresets,
  resolveShowTilt,
} from './editCard/coverRowTypes';

const EMPTY_ENTITIES = {};

// Home Assistant CoverEntityFeature bits.
const FEATURE_OPEN = 1;
const FEATURE_CLOSE = 2;
const FEATURE_SET_POSITION = 4;
const FEATURE_STOP = 8;
const FEATURE_OPEN_TILT = 16;
const FEATURE_CLOSE_TILT = 32;
const FEATURE_STOP_TILT = 64;
const FEATURE_SET_TILT_POSITION = 128;

// Step used for the slat arrows when the device only supports set_cover_tilt_position.
const TILT_STEP = 10;

/* -- Interactive Visual Blind ---------------------------------------- */
const InteractiveBlind = ({
  position,
  onPositionChange,
  accent,
  disabled,
  slatCount = 12,
  translate,
}) => {
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const closedAmount = 100 - (position ?? 0);
  const visibleSlats = Math.round((closedAmount / 100) * slatCount);

  const calcPositionFromEvent = useCallback((clientY) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const pct = Math.round(Math.max(0, Math.min(100, 100 - (y / rect.height) * 100)));
    return pct;
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;
      isDragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = calcPositionFromEvent(e.clientY);
      if (pos !== null) onPositionChange(pos);
    },
    [disabled, calcPositionFromEvent, onPositionChange]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging.current || disabled) return;
      const pos = calcPositionFromEvent(e.clientY);
      if (pos !== null) onPositionChange(pos);
    },
    [disabled, calcPositionFromEvent, onPositionChange]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled || !onPositionChange) return;
      const current = Number.isFinite(position) ? position : 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        onPositionChange(Math.min(100, current + 5));
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        onPositionChange(Math.max(0, current - 5));
      }
      if (e.key === 'Home') {
        e.preventDefault();
        onPositionChange(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        onPositionChange(100);
      }
    },
    [disabled, onPositionChange, position]
  );

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full touch-none overflow-hidden rounded-2xl border-2 select-none ${disabled ? 'opacity-50' : 'cursor-ns-resize'}`}
      style={{ borderColor: accent.border, backgroundColor: 'rgba(135,206,235,0.04)' }}
      role="slider"
      aria-label={translate?.('cover.aria.position') || 'Cover position'}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={position ?? 0}
      aria-valuetext={`${position ?? 0}%`}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      {/* Window cross-pane lines */}
      <div className="pointer-events-none absolute inset-0 flex">
        <div className="flex-1 border-r" style={{ borderColor: 'rgba(255,255,255,0.03)' }} />
        <div className="flex-1" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="w-full border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }} />
      </div>

      {/* Slats from top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex flex-col">
        {Array.from({ length: slatCount }).map((_, i) => (
          <div
            key={i}
            className="w-full transition-all duration-300 ease-out"
            style={{
              height: `${100 / slatCount}%`,
              opacity: i < visibleSlats ? 1 : 0,
              transform: i < visibleSlats ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'top',
              backgroundColor: accent.slat,
              borderBottom: i < visibleSlats ? `1px solid ${accent.slatBorder}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Draggable rail handle */}
      {!disabled && (
        <div
          className="pointer-events-none absolute right-2 left-2 flex items-center justify-center transition-all duration-300"
          style={{ top: `calc(${100 - (position ?? 0)}% - 10px)` }}
        >
          <div
            className="h-[6px] w-full rounded-full shadow-lg"
            style={{
              backgroundColor: accent.text,
              opacity: 0.7,
              boxShadow: `0 0 12px ${accent.text}40`,
            }}
          />
          {/* Grip dots */}
          <div className="absolute flex gap-1">
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: accent.text, opacity: 0.9 }}
            />
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: accent.text, opacity: 0.9 }}
            />
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: accent.text, opacity: 0.9 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* -- Square icon button used by the control columns ------------------- */
const ControlButton = ({ onClick, disabled, label, active, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 disabled:opacity-30 md:h-12 md:w-12 ${
      active
        ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm'
        : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
    }`}
  >
    {children}
  </button>
);

export default function CoverModal({
  show,
  onClose,
  entityId,
  entity,
  entities,
  callService,
  customIcons,
  settings,
  t,
}) {
  const activeEntityId = entityId || '';
  const activeEntity = entity || { state: 'unknown', attributes: {} };

  const invertPosition = settings?.invertPosition === true;
  const invertTilt = settings?.invertTilt === true;

  const state = activeEntity.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOpen = state === 'open';
  const isClosed = state === 'closed';
  const isOpening = state === 'opening';
  const isClosing = state === 'closing';
  const isMoving = isOpening || isClosing;

  const rawPosition = activeEntity.attributes?.current_position;
  const hasPosition = typeof rawPosition === 'number';
  const position = hasPosition ? (invertPosition ? 100 - rawPosition : rawPosition) : rawPosition;
  const rawTiltPosition = activeEntity.attributes?.current_tilt_position;
  const hasTilt = typeof rawTiltPosition === 'number';
  const tiltPosition = hasTilt
    ? invertTilt
      ? 100 - rawTiltPosition
      : rawTiltPosition
    : rawTiltPosition;

  // Status (open/closed/opening/closing) always reflects Home Assistant's raw,
  // physical state. invertPosition/invertTilt are purely display-label
  // preferences for the percentage NUMBER and must never affect the status text,
  // the visual, or the actual service calls.
  const effectiveOpen = isOpen;
  const effectiveClosed = isClosed;
  const effectiveOpening = isOpening;
  const effectiveClosing = isClosing;

  const supportedFeatures = activeEntity.attributes?.supported_features ?? 0;
  const supportsPosition = (supportedFeatures & FEATURE_SET_POSITION) !== 0;
  const supportsOpenClose = (supportedFeatures & (FEATURE_OPEN | FEATURE_CLOSE)) !== 0;
  const supportsStop = (supportedFeatures & FEATURE_STOP) !== 0;
  const supportsTiltPosition = (supportedFeatures & FEATURE_SET_TILT_POSITION) !== 0;
  const supportsTiltButtons = (supportedFeatures & (FEATURE_OPEN_TILT | FEATURE_CLOSE_TILT)) !== 0;
  const supportsStopTilt = (supportedFeatures & FEATURE_STOP_TILT) !== 0;
  // Detecting real slats from the feature bits alone does not work: roller
  // shutters exist that advertise OPEN_TILT/CLOSE_TILT/STOP_TILT (127) without
  // having slats at all. Devices with actual slats report a tilt position,
  // either as the SET_TILT_POSITION feature or as a current_tilt_position
  // attribute, so that is what the detection keys on. Cards may override it.
  const detectedTilt = supportsTiltPosition || hasTilt;
  const supportsTilt = resolveShowTilt(settings?.tiltMode, detectedTilt);

  const deviceClass = activeEntity.attributes?.device_class || 'cover';
  const name = activeEntity.attributes?.friendly_name || activeEntityId;

  const coverIconName = customIcons?.[activeEntityId] || activeEntity.attributes?.icon;
  const Icon = coverIconName ? getIconComponent(coverIconName) || ArrowUpDown : ArrowUpDown;
  const modalTitleId = `cover-modal-title-${activeEntityId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  // localPosition/localTilt always operate in raw HA space (0 = closed, 100 =
  // open) so the visual slider and drag interaction stay physically accurate.
  // The percentage shown to the user is derived separately below via
  // localDisplayPosition/localDisplayTilt, honoring invertPosition/invertTilt.
  const [localPosition, setLocalPosition] = useState(rawPosition ?? 0);
  const [localTilt, setLocalTilt] = useState(rawTiltPosition ?? 0);
  const commitTimerPos = useRef(null);
  const commitTimerTilt = useRef(null);

  useEffect(() => {
    if (!show) return;
    if (typeof rawPosition === 'number') setLocalPosition(rawPosition);
  }, [rawPosition, show]);

  useEffect(() => {
    if (!show) return;
    if (typeof rawTiltPosition === 'number') setLocalTilt(rawTiltPosition);
  }, [rawTiltPosition, show]);

  const localDisplayPosition = invertPosition ? 100 - localPosition : localPosition;
  const localDisplayTilt = invertTilt ? 100 - localTilt : localTilt;

  // Memoized so the hooks depending on it keep stable dependencies.
  const translate = useMemo(() => t || ((key) => key), [t]);

  const getAccent = () => {
    if (isUnavailable)
      return {
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
        border: 'rgba(239,68,68,0.2)',
        slat: 'rgba(239,68,68,0.25)',
        slatBorder: 'rgba(239,68,68,0.15)',
      };
    if (isMoving)
      return {
        color: '#60a5fa',
        bg: 'rgba(59,130,246,0.1)',
        border: 'rgba(59,130,246,0.2)',
        slat: 'rgba(59,130,246,0.3)',
        slatBorder: 'rgba(59,130,246,0.15)',
      };
    if (effectiveOpen)
      return {
        color: '#34d399',
        bg: 'rgba(16,185,129,0.1)',
        border: 'rgba(16,185,129,0.2)',
        slat: 'rgba(16,185,129,0.25)',
        slatBorder: 'rgba(16,185,129,0.12)',
      };
    return {
      color: 'var(--text-secondary)',
      bg: 'var(--glass-bg)',
      border: 'var(--glass-border)',
      slat: 'rgba(148,163,184,0.35)',
      slatBorder: 'rgba(148,163,184,0.15)',
    };
  };
  const accent = getAccent();

  const getStateLabel = () => {
    if (isUnavailable) return translate('status.unavailable');
    if (effectiveOpening) return translate('cover.opening');
    if (effectiveClosing) return translate('cover.closing');
    if (effectiveOpen) return translate('cover.open');
    if (effectiveClosed) return translate('cover.closed');
    return state;
  };

  const getDeviceTypeLabel = () => {
    const key = `cover.deviceClass.${deviceClass}`;
    const result = translate(key);
    return result !== key ? result : translate('cover.title');
  };

  const handleSetPosition = useCallback(
    (val) => {
      if (!show || !activeEntityId || !entity) return;
      setLocalPosition(val);
      clearTimeout(commitTimerPos.current);
      commitTimerPos.current = setTimeout(() => {
        callService('cover', 'set_cover_position', { entity_id: activeEntityId, position: val });
      }, 200);
    },
    [callService, activeEntityId, show, entity]
  );

  const handleSetTilt = useCallback(
    (val) => {
      if (!show || !activeEntityId || !entity) return;
      setLocalTilt(val);
      clearTimeout(commitTimerTilt.current);
      commitTimerTilt.current = setTimeout(() => {
        callService('cover', 'set_cover_tilt_position', {
          entity_id: activeEntityId,
          tilt_position: val,
        });
      }, 200);
    },
    [callService, activeEntityId, show, entity]
  );

  const handleCoverCommand = useCallback(
    (service) => {
      if (isUnavailable) return;
      callService('cover', service, { entity_id: activeEntityId });
    },
    [callService, activeEntityId, isUnavailable]
  );

  // Slat arrows use the dedicated tilt services when available and fall back to
  // stepping the tilt position for devices that only expose SET_TILT_POSITION.
  const handleTiltStep = useCallback(
    (direction) => {
      if (isUnavailable) return;
      if (supportsTiltButtons) {
        handleCoverCommand(direction > 0 ? 'open_cover_tilt' : 'close_cover_tilt');
        return;
      }
      const current = Number.isFinite(localTilt) ? localTilt : 0;
      handleSetTilt(Math.max(0, Math.min(100, current + direction * TILT_STEP)));
    },
    [isUnavailable, supportsTiltButtons, handleCoverCommand, localTilt, handleSetTilt]
  );
  // User-defined rows configured in the card editor. Toggles and actions are
  // rendered by CustomRowsPanel; the status rows join the info block below.
  const allEntities = entities || EMPTY_ENTITIES;
  const customRows = settings?.customRows;
  const statusRows = useStatusRows(customRows, allEntities, translate);

  const presets = useMemo(
    () =>
      normalizePresets(settings?.positionPresets, DEFAULT_POSITION_PRESETS).map((value) => ({
        value,
        label:
          value === 0
            ? translate('cover.presetClosed')
            : value === 100
              ? translate('cover.presetOpen')
              : `${value}%`,
      })),
    [settings?.positionPresets, translate]
  );

  const tiltPresets = useMemo(
    () =>
      normalizePresets(settings?.tiltPresets, DEFAULT_TILT_PRESETS).map((value) => ({
        value,
        label:
          value === 0
            ? translate('cover.tiltClosed')
            : value === 100
              ? translate('cover.tiltOpen')
              : `${value}%`,
      })),
    [settings?.tiltPresets, translate]
  );

  if (!show || !activeEntityId || !entity) return null;

  return (
    <AccessibleModalShell
      open={show && !!activeEntityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl md:h-auto md:min-h-[480px] md:rounded-[3rem] lg:grid lg:grid-cols-5"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          {/* Close Button */}
          <div className="absolute top-6 right-6 z-50 md:top-10 md:right-10">
            <button
              onClick={onClose}
              className="modal-close"
              aria-label={translate('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* LEFT PANEL: Visual blind & controls */}
          <div
            className="relative flex min-h-0 shrink-0 flex-col justify-between overflow-hidden border-b p-4 md:p-8 lg:col-span-3 lg:border-r lg:border-b-0"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            {/* Ambient Glow */}
            <div
              className="pointer-events-none absolute top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-[100px] transition-all duration-1000"
              style={{ backgroundColor: accent.color }}
            />

            {/* Header */}
            <div className="relative z-10 mb-4 flex shrink-0 items-center gap-4">
              <div
                className="rounded-2xl p-4 transition-all duration-500"
                style={{ backgroundColor: accent.bg, color: accent.color }}
              >
                <Icon className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <h2
                  id={modalTitleId}
                  className="truncate pr-1 text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic"
                >
                  {name}
                </h2>
                <div
                  className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1"
                  style={{ backgroundColor: accent.bg, borderColor: accent.border }}
                >
                  {isMoving && (
                    <div
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ backgroundColor: accent.color }}
                    />
                  )}
                  {!isMoving && (
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: isUnavailable
                          ? '#ef4444'
                          : effectiveOpen
                            ? '#34d399'
                            : '#64748b',
                        boxShadow: effectiveOpen ? '0 0 6px rgba(52,211,153,0.5)' : 'none',
                      }}
                    />
                  )}
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase italic"
                    style={{ color: accent.color }}
                  >
                    {getStateLabel()}
                  </span>
                  {hasPosition && (
                    <span
                      className="border-l pl-2 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase italic"
                      style={{ borderColor: 'var(--glass-border)' }}
                    >
                      {localDisplayPosition}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Center: height controls | visual blind | slat controls */}
            <div className="relative z-10 my-2 flex min-h-[180px] flex-1 items-center justify-center gap-3 md:my-4 md:min-h-[200px] md:gap-5">
              {/* Height (position) */}
              <div className="flex shrink-0 flex-col items-center gap-2">
                <span className="mb-1 text-[9px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                  {translate('cover.position')}
                </span>
                {supportsOpenClose && (
                  <ControlButton
                    onClick={() => handleCoverCommand('open_cover')}
                    disabled={isUnavailable}
                    label={translate('cover.open')}
                    active={effectiveOpen}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </ControlButton>
                )}
                {supportsStop && (
                  <ControlButton
                    onClick={() => handleCoverCommand('stop_cover')}
                    disabled={isUnavailable}
                    label={translate('cover.stop')}
                  >
                    <div className="h-3 w-3 rounded-sm bg-current" />
                  </ControlButton>
                )}
                {supportsOpenClose && (
                  <ControlButton
                    onClick={() => handleCoverCommand('close_cover')}
                    disabled={isUnavailable}
                    label={translate('cover.closed')}
                    active={effectiveClosed}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </ControlButton>
                )}
                {hasPosition && (
                  <span
                    className="mt-1 font-mono text-xs font-bold"
                    style={{ color: accent.color }}
                  >
                    {localDisplayPosition}%
                  </span>
                )}
              </div>

              {/* Visual blind */}
              <div className="flex h-52 w-36 flex-col items-center md:h-60 md:w-48">
                <div className="w-full flex-1">
                  <InteractiveBlind
                    position={localPosition}
                    onPositionChange={supportsPosition ? handleSetPosition : undefined}
                    accent={{ ...accent, text: accent.color }}
                    disabled={isUnavailable || !supportsPosition}
                    translate={translate}
                  />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase opacity-50"
                    style={{ color: accent.color }}
                  >
                    {getDeviceTypeLabel()}
                  </span>
                  {supportsPosition && (
                    <span className="font-mono text-sm font-bold" style={{ color: accent.color }}>
                      {localDisplayPosition}%
                    </span>
                  )}
                </div>
              </div>

              {/* Slats (tilt) */}
              {supportsTilt && (
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <span className="mb-1 text-[9px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                    {translate('cover.tilt')}
                  </span>
                  <ControlButton
                    onClick={() => handleTiltStep(1)}
                    disabled={isUnavailable}
                    label={translate('cover.aria.tiltUp')}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </ControlButton>
                  {supportsStopTilt && (
                    <ControlButton
                      onClick={() => handleCoverCommand('stop_cover_tilt')}
                      disabled={isUnavailable}
                      label={translate('cover.aria.tiltStop')}
                    >
                      <div className="h-3 w-3 rounded-sm bg-current" />
                    </ControlButton>
                  )}
                  <ControlButton
                    onClick={() => handleTiltStep(-1)}
                    disabled={isUnavailable}
                    label={translate('cover.aria.tiltDown')}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </ControlButton>
                  {hasTilt && (
                    <span
                      className="mt-1 font-mono text-xs font-bold"
                      style={{ color: accent.color }}
                    >
                      {localDisplayTilt}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Presets, Tilt, Info.
            min-h-0 is required: without it this grid/flex item keeps its
            automatic minimum height, the overflow-y-auto below never engages
            and long content is cut off at the bottom of the modal instead. */}
          <div className="flex h-full min-h-0 flex-col lg:col-span-2">
            <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:space-y-6 md:p-8 lg:pt-16">
              {/* Position Presets */}
              {supportsPosition && presets.length > 0 && (
                <div className="space-y-2 md:space-y-3">
                  <label className="px-1 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                    {translate('cover.presets')}
                  </label>
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(presets.length, 5)}, minmax(0, 1fr))`,
                    }}
                  >
                    {presets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => !isUnavailable && handleSetPosition(preset.value)}
                        disabled={isUnavailable}
                        className={`rounded-xl border py-2.5 text-center text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                          localPosition === preset.value
                            ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm'
                            : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tilt presets. The tilt control itself lives next to the visual. */}
              {supportsTilt && supportsTiltPosition && tiltPresets.length > 0 && (
                <div className="border-t border-[var(--glass-border)] pt-4 md:pt-6">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-end justify-between px-1">
                      <label className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                        {translate('cover.tilt')}
                      </label>
                      <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                        {localDisplayTilt}%
                      </span>
                    </div>
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(tiltPresets.length, 4)}, minmax(0, 1fr))`,
                      }}
                    >
                      {tiltPresets.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => !isUnavailable && handleSetTilt(preset.value)}
                          disabled={isUnavailable}
                          className={`rounded-xl border py-2 text-center text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                            localTilt === preset.value
                              ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm'
                              : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Card-defined rows: locks, scenes, extra status lines */}
              <CustomRowsPanel
                rows={customRows}
                entities={allEntities}
                callService={callService}
                translate={translate}
                className="border-t border-[var(--glass-border)] pt-4 md:pt-6"
              />

              {/* Entity Info */}
              <div className="border-t border-[var(--glass-border)] pt-4 md:pt-6">
                <h3 className="mb-2 pl-1 text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase md:mb-4">
                  {translate('cover.info')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-[var(--text-secondary)] opacity-70">
                      {translate('cover.state')}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {getStateLabel()}
                    </span>
                  </div>
                  {hasPosition && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-[var(--text-secondary)] opacity-70">
                        {translate('cover.position')}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {position}%
                      </span>
                    </div>
                  )}
                  {hasTilt && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-[var(--text-secondary)] opacity-70">
                        {translate('cover.tilt')}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {tiltPosition}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-[var(--text-secondary)] opacity-70">
                      {translate('cover.deviceType')}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {getDeviceTypeLabel()}
                    </span>
                  </div>
                  {statusRows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 px-1">
                      <span className="truncate text-xs text-[var(--text-secondary)] opacity-70">
                        {row.label}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-[var(--text-primary)]">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AccessibleModalShell>
  );
}
