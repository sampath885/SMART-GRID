import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import AnomalyDetection from '../components/AnomalyDetection'
import ForecastHourModal from '../components/ForecastHourModal'
import { TrendingUp, Calendar, Info } from 'lucide-react'
import { useGridData } from '../context/GridDataContext'
import { THEME } from '../theme'
import { getForecastHourLoads } from '../utils/forecastStress'

function getStressColor(status) {
  if (status?.includes('CRITICAL')) return THEME.colors.error
  if (status?.includes('HIGH')) return THEME.colors.warning
  if (status?.includes('MODERATE')) return THEME.colors.warning
  return THEME.colors.success
}

export default function Forecast() {
  const navigate = useNavigate()
  const { forecastData, lastUpdate } = useGridData()
  const [hourModal, setHourModal] = useState(null)

  const closeHourModal = () => setHourModal(null)

  const forecastStyles = {
    container: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: THEME.spacing.xl,
    },
    fullWidth: {
      gridColumn: '1 / -1',
    },
    title: {
      fontSize: '22px',
      fontWeight: '700',
      marginBottom: THEME.spacing.lg,
      color: THEME.colors.text.primary,
    },
    subtitle: {
      fontSize: '14px',
      color: THEME.colors.text.secondary,
      marginBottom: THEME.spacing.lg,
    },
  }

  if (!forecastData) {
    return (
      <div style={forecastStyles.container} className="fade-in">
        <div style={forecastStyles.fullWidth}>
          <h1 style={forecastStyles.title}>24-Hour Forecast</h1>
          <p style={forecastStyles.subtitle}>
            Recursive multi-step electricity load predictions for the next 24 hours
          </p>
        </div>

        <Card style={forecastStyles.fullWidth}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: THEME.spacing.lg, minHeight: '300px', justifyContent: 'center' }}>
            <Calendar size={48} style={{ opacity: 0.3, color: THEME.colors.accent.primary }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', color: THEME.colors.text.primary, marginBottom: THEME.spacing.md }}>
                No forecast data yet
              </div>
              <div style={{ fontSize: '14px', color: THEME.colors.text.secondary, marginBottom: THEME.spacing.lg }}>
                Upload a CSV file from the Dashboard to generate a 24-hour forecast
              </div>
              <button 
                style={{
                  padding: `${THEME.spacing.md} ${THEME.spacing.lg}`,
                  borderRadius: '8px',
                  border: 'none',
                  background: THEME.colors.gradient.teal,
                  color: '#0a0e15',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: THEME.transitions.smooth,
                }}
                onClick={() => navigate('/')}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={forecastStyles.container} className="fade-in">
      <div style={forecastStyles.fullWidth}>
        <h1 style={forecastStyles.title}>24-Hour Forecast</h1>
        <p style={forecastStyles.subtitle}>
          Recursive multi-step electricity load predictions for the next 24 hours
        </p>
        {lastUpdate && (
          <div style={{ fontSize: '13px', color: THEME.colors.text.secondary, marginTop: THEME.spacing.md }}>
            Generated: <strong>{lastUpdate}</strong>
          </div>
        )}

        <div
          style={{
            marginTop: THEME.spacing.lg,
            display: 'flex',
            gap: THEME.spacing.md,
            alignItems: 'flex-start',
            padding: THEME.spacing.lg,
            background: 'rgba(13, 148, 136, 0.08)',
            border: `1px solid ${THEME.colors.border.primary}`,
            borderRadius: '12px',
          }}
        >
          <Info size={20} color={THEME.colors.accent.primary} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: THEME.colors.text.secondary, lineHeight: 1.55 }}>
            <strong style={{ color: THEME.colors.text.primary }}>Forecast scope:</strong>{' '}
            Peak load, averages, and stress below describe the <strong style={{ color: THEME.colors.accent.lighter }}>entire upcoming 24-hour prediction</strong> (all 144 ten-minute steps). They are <strong style={{ color: THEME.colors.text.primary }}>not</strong> live grid readings at the current moment.
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      {forecastData.stress_metrics && (
        <>
          <Card>
            <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
              <TrendingUp size={20} color={THEME.colors.accent.primary} />
              Peak Load (24h)
            </h3>
            <div style={{ fontSize: '32px', fontWeight: '700', color: THEME.colors.accent.primary, marginBottom: THEME.spacing.md }}>
              {forecastData.stress_metrics.max_load?.toLocaleString()} KW
            </div>
            <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: 1.5 }}>
              Highest predicted load at any ten-minute step across the full 24-hour forecast horizon.
            </div>
          </Card>

          <Card>
            <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Average Load (24h)</h3>
            <div style={{ fontSize: '32px', fontWeight: '700', color: THEME.colors.accent.lighter, marginBottom: THEME.spacing.md }}>
              {forecastData.stress_metrics.avg_load?.toLocaleString()} KW
            </div>
            <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: 1.5 }}>
              Mean of all 144 predicted loads for the next 24 hours.
            </div>
          </Card>

          {/* Grid Stress - ACTIVE */}
          <Card>
            <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Grid Stress Status</h3>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700',
              color: getStressColor(forecastData.stress_metrics.status),
              marginBottom: THEME.spacing.md,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {forecastData.stress_metrics.status}
            </div>
            <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: '1.6' }}>
              <div style={{ marginBottom: THEME.spacing.sm }}>Combined Stress: <strong>{forecastData.stress_metrics.combined_stress?.toFixed(1)}%</strong></div>
              <div style={{ marginBottom: THEME.spacing.sm }}>Peak Stress: <strong>{forecastData.stress_metrics.peak_stress_pct?.toFixed(1)}%</strong></div>
              <div style={{ fontSize: '11px', color: THEME.colors.text.tertiary, marginTop: THEME.spacing.sm }}>
                Derived from the full forecast curve vs. assumed capacity (90% of 100 MW usable).
              </div>
            </div>
          </Card>

          {/* NEW: Ramp-Rate Analysis */}
          <Card>
            <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Thermal Stress (Ramp-Rate)</h3>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700',
              color: forecastData.stress_metrics.ramp_severity_score > 70 ? THEME.colors.error : forecastData.stress_metrics.ramp_severity_score > 40 ? THEME.colors.warning : THEME.colors.success,
              marginBottom: THEME.spacing.md
            }}>
              {forecastData.stress_metrics.max_ramp_rate_kw_per_10min?.toLocaleString()} KW/10min
            </div>
            <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: '1.6' }}>
              <div style={{ marginBottom: THEME.spacing.sm }}>Severity Score: <strong>{forecastData.stress_metrics.ramp_severity_score?.toFixed(0)}%</strong></div>
              {forecastData.stress_metrics.ramp_pct_of_capacity != null && (
                <div style={{ marginBottom: THEME.spacing.sm }}>
                  Max step vs usable capacity:{' '}
                  <strong>{Number(forecastData.stress_metrics.ramp_pct_of_capacity).toFixed(2)}%</strong>
                </div>
              )}
              <div style={{ fontSize: '11px', fontStyle: 'italic', color: THEME.colors.text.tertiary, lineHeight: 1.45 }}>
                Largest load change between two consecutive ten-minute predictions in the forecast. Severity is{' '}
                <strong style={{ color: THEME.colors.text.secondary }}>normalized</strong> to assumed usable capacity (90% of nameplate): a step of about{' '}
                2.2% of that capacity in one interval scores 100.
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Hourly Summary */}
      {forecastData.hourly_summary && (
        <Card style={forecastStyles.fullWidth}>
          <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.sm, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
            <Calendar size={20} color={THEME.colors.accent.primary} />
            Hourly load summary
          </h3>
          <p style={{ fontSize: '13px', color: THEME.colors.text.secondary, marginBottom: THEME.spacing.md, lineHeight: 1.5 }}>
            Each value is the <strong style={{ color: THEME.colors.text.primary }}>average</strong> of six ten-minute predictions in that forecast hour. Click an hour for per-hour stress and all six steps.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '12px',
            marginBottom: THEME.spacing.lg,
          }}>
            {forecastData.hourly_summary.map((hourData, idx) => (
              <div 
                key={idx}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setHourModal({ hourIndex: idx, hourlyAverage: hourData })
                  }
                }}
                style={{
                  background: THEME.colors.bg.tertiary,
                  border: `1px solid ${THEME.colors.border.primary}`,
                  borderRadius: '8px',
                  padding: `${THEME.spacing.md} ${THEME.spacing.sm}`,
                  textAlign: 'center',
                  transition: THEME.transitions.smooth,
                  cursor: 'pointer',
                }}
                onClick={() => setHourModal({ hourIndex: idx, hourlyAverage: hourData })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.colors.bg.surface
                  e.currentTarget.style.borderColor = THEME.colors.accent.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = THEME.colors.bg.tertiary
                  e.currentTarget.style.borderColor = THEME.colors.border.primary
                }}
              >
                <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, marginBottom: '8px', fontWeight: '500', letterSpacing: '0.5px' }}>
                  Hour {idx}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: THEME.colors.accent.primary, marginBottom: '6px', lineHeight: 1.2 }}>
                  {Number(hourData).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: '11px', color: THEME.colors.text.secondary, fontWeight: '500' }}>
                  kW avg
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            background: `rgba(13, 148, 136, 0.1)`,
            border: `1px solid ${THEME.colors.accent.primary}`,
            borderRadius: '8px',
            padding: THEME.spacing.lg,
            color: THEME.colors.accent.lighter,
            fontSize: '12px'
          }}>
            <strong>Note:</strong> This forecast uses recursive multi-step prediction (auto-regressive model). Each 10-minute prediction becomes an input for the next prediction, creating a continuous chain forecast for 24 hours (144 data points at 10-minute intervals).
          </div>
        </Card>
      )}

      {/* Anomaly Detection */}
      {forecastData && (
        <div style={forecastStyles.fullWidth}>
          <AnomalyDetection forecastData={forecastData} />
        </div>
      )}

      {hourModal !== null && (
        <ForecastHourModal
          hourIndex={hourModal.hourIndex}
          hourlyAverage={hourModal.hourlyAverage}
          loads={getForecastHourLoads(forecastData.all_predictions_10m, hourModal.hourIndex)}
          onClose={closeHourModal}
        />
      )}

    </div>
  )
}
