import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { THEME } from '../theme'
import { calculateGridStressForLoads } from '../utils/forecastStress'

function getStressColor(status) {
  if (status?.includes('CRITICAL')) return THEME.colors.error
  if (status?.includes('HIGH')) return THEME.colors.warning
  if (status?.includes('MODERATE')) return THEME.colors.warning
  return THEME.colors.success
}

function rampColor(score) {
  if (score > 70) return THEME.colors.error
  if (score > 40) return THEME.colors.warning
  return THEME.colors.success
}

const slotLabels = ['+0 min', '+10 min', '+20 min', '+30 min', '+40 min', '+50 min']

export default function ForecastHourModal({ hourIndex, loads, hourlyAverage, stressConfig, onClose }) {
  const stress = loads?.length === 6 ? calculateGridStressForLoads(loads, stressConfig || {}) : null

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (hourIndex === null || hourIndex === undefined) return null

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(10, 14, 21, 0.75)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  }

  const panelStyle = {
    backgroundColor: THEME.colors.bg.surface,
    border: `1px solid ${THEME.colors.border.primary}`,
    borderRadius: '16px',
    boxShadow: THEME.shadows.lg,
    maxWidth: '520px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
  }

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: THEME.spacing.md,
    padding: `${THEME.spacing.sm} 0`,
    borderBottom: `1px solid ${THEME.colors.border.secondary}`,
    fontSize: '13px',
    color: THEME.colors.text.secondary,
  }

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="forecast-hour-modal-title"
        aria-modal="true"
      >
        <div
          style={{
            padding: THEME.spacing.xl,
            borderBottom: `1px solid ${THEME.colors.border.primary}`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: THEME.spacing.md,
          }}
        >
          <div>
            <h2
              id="forecast-hour-modal-title"
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: THEME.colors.text.primary,
              }}
            >
              Forecast — hour {hourIndex}
            </h2>
            <p
              style={{
                margin: `${THEME.spacing.sm} 0 0`,
                fontSize: '12px',
                color: THEME.colors.text.tertiary,
                lineHeight: 1.5,
              }}
            >
              Model output for this slice of the 24-hour forecast only — not live grid conditions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0,
              background: THEME.colors.bg.tertiary,
              border: `1px solid ${THEME.colors.border.primary}`,
              borderRadius: '8px',
              padding: THEME.spacing.sm,
              cursor: 'pointer',
              color: THEME.colors.text.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: THEME.transitions.fast,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: THEME.spacing.xl }}>
          {!loads || loads.length !== 6 ? (
            <p style={{ color: THEME.colors.text.secondary, fontSize: '14px', margin: 0 }}>
              Detailed steps are unavailable. Upload data again from the Dashboard to refresh the forecast.
            </p>
          ) : (
            <>
              <div
                style={{
                  background: 'rgba(13, 148, 136, 0.08)',
                  border: `1px solid ${THEME.colors.accent.primary}`,
                  borderRadius: '8px',
                  padding: THEME.spacing.md,
                  marginBottom: THEME.spacing.lg,
                  fontSize: '12px',
                  color: THEME.colors.accent.lighter,
                  lineHeight: 1.5,
                }}
              >
                Stress metrics below use the same rules as the summary cards, but applied only to these six
                ten-minute predictions (within this forecast hour).
              </div>

              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: THEME.colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: `0 0 ${THEME.spacing.md}`,
                }}
              >
                Load (kW)
              </h3>
              <div style={{ marginBottom: THEME.spacing.lg }}>
                <div style={rowStyle}>
                  <span>Average</span>
                  <strong style={{ color: THEME.colors.text.primary }}>
                    {hourlyAverage != null ? Number(hourlyAverage).toLocaleString(undefined, { maximumFractionDigits: 2 }) : stress.avg_load.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <div style={rowStyle}>
                  <span>Peak (this hour)</span>
                  <strong style={{ color: THEME.colors.accent.primary }}>
                    {stress.max_load.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <div style={{ ...rowStyle, borderBottom: 'none' }}>
                  <span>Minimum (this hour)</span>
                  <strong style={{ color: THEME.colors.text.primary }}>
                    {stress.min_load.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: THEME.colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: `0 0 ${THEME.spacing.md}`,
                }}
              >
                Grid stress (this hour)
              </h3>
              <div style={{ marginBottom: THEME.spacing.lg }}>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: getStressColor(stress.status),
                    marginBottom: THEME.spacing.md,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {stress.status}
                </div>
                <div style={rowStyle}>
                  <span>Combined stress</span>
                  <strong style={{ color: THEME.colors.text.primary }}>{stress.combined_stress.toFixed(1)}%</strong>
                </div>
                <div style={{ ...rowStyle, borderBottom: 'none' }}>
                  <span>Peak stress</span>
                  <strong style={{ color: THEME.colors.text.primary }}>{stress.peak_stress_pct.toFixed(1)}%</strong>
                </div>
              </div>

              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: THEME.colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: `0 0 ${THEME.spacing.md}`,
                }}
              >
                Ramp rate (this hour)
              </h3>
              <div style={{ marginBottom: THEME.spacing.lg }}>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: rampColor(stress.ramp_severity_score),
                    marginBottom: THEME.spacing.sm,
                  }}
                >
                  {stress.max_ramp_rate_kw_per_10min.toLocaleString(undefined, { maximumFractionDigits: 2 })} kW / 10 min
                </div>
                <div style={{ fontSize: '12px', color: THEME.colors.text.secondary }}>
                  Severity score:{' '}
                  <strong style={{ color: THEME.colors.text.primary }}>
                    {stress.ramp_severity_score.toFixed(0)}%
                  </strong>
                  {stress.ramp_pct_of_capacity != null && (
                    <span>
                      {' '}
                      · max step / usable capacity:{' '}
                      <strong style={{ color: THEME.colors.text.primary }}>
                        {Number(stress.ramp_pct_of_capacity).toFixed(2)}%
                      </strong>
                    </span>
                  )}
                  <span style={{ color: THEME.colors.text.tertiary, display: 'block', marginTop: THEME.spacing.sm }}>
                    Largest step between consecutive slots in this hour; same capacity-normalized scale as the summary cards.
                  </span>
                </div>
              </div>

              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: THEME.colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: `0 0 ${THEME.spacing.md}`,
                }}
              >
                Ten-minute predictions
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: THEME.spacing.sm,
                }}
              >
                {loads.map((kw, i) => (
                  <div
                    key={i}
                    style={{
                      background: THEME.colors.bg.tertiary,
                      border: `1px solid ${THEME.colors.border.primary}`,
                      borderRadius: '8px',
                      padding: THEME.spacing.md,
                    }}
                  >
                    <div style={{ fontSize: '11px', color: THEME.colors.text.tertiary, marginBottom: '4px' }}>
                      {slotLabels[i]}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: THEME.colors.accent.primary }}>
                      {Number(kw).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '10px', color: THEME.colors.text.secondary }}>kW</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
