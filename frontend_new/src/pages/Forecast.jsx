import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import AnomalyDetection from '../components/AnomalyDetection'
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react'
import { useGridData } from '../context/GridDataContext'
import { THEME } from '../theme'

export default function Forecast() {
  const navigate = useNavigate()
  const { forecastData, lastUpdate } = useGridData()

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
            <div style={{ fontSize: '12px', color: THEME.colors.text.secondary }}>
              Maximum predicted load in next 24 hours
            </div>
          </Card>

          <Card>
            <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Average Load (24h)</h3>
            <div style={{ fontSize: '32px', fontWeight: '700', color: THEME.colors.accent.lighter, marginBottom: THEME.spacing.md }}>
              {forecastData.stress_metrics.avg_load?.toLocaleString()} KW
            </div>
            <div style={{ fontSize: '12px', color: THEME.colors.text.secondary }}>
              Average predicted load over 24 hours
            </div>
          </Card>

          {/* Grid Stress - Commented out (under review)
          <Card>
            <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Grid Stress</h3>
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
            <div style={{ fontSize: '12px', color: THEME.colors.text.secondary }}>
              Grid capacity stress level
            </div>
          </Card>
          */}
        </>
      )}

      {/* Hourly Summary */}
      {forecastData.hourly_summary && (
        <Card style={forecastStyles.fullWidth}>
          <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
            <Calendar size={20} color={THEME.colors.accent.primary} />
            Hourly Load Summary (144 predictions across 24 hours)
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '12px',
            marginBottom: THEME.spacing.lg,
          }}>
            {forecastData.hourly_summary.map((hourData, idx) => (
              <div 
                key={idx}
                style={{
                  background: THEME.colors.bg.tertiary,
                  border: `1px solid ${THEME.colors.border.primary}`,
                  borderRadius: '8px',
                  padding: `${THEME.spacing.md} ${THEME.spacing.sm}`,
                  textAlign: 'center',
                  transition: THEME.transitions.smooth,
                  cursor: 'pointer',
                }}
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
                <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.accent.primary, marginBottom: '6px' }}>
                  {(hourData / 1000).toFixed(1)}
                </div>
                <div style={{ fontSize: '11px', color: THEME.colors.text.secondary, fontWeight: '500' }}>
                  KW
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


    </div>
  )
}

/* Grid Stress Color - Commented out (stress section under review)
function getStressColor(status) {
  if (status?.includes('CRITICAL')) return THEME.colors.error
  if (status?.includes('HIGH')) return THEME.colors.warning
  if (status?.includes('MODERATE')) return THEME.colors.warning
  return THEME.colors.success
}
*/
