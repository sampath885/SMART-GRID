import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import AnalysisSafetyEnvelope from '../components/AnalysisSafetyEnvelope'
import AnalysisXaiRadar from '../components/AnalysisXaiRadar'
import { AlertCircle, TrendingUp, Zap, Leaf } from 'lucide-react'
import { useGridData } from '../context/GridDataContext'
import { THEME } from '../theme'

export default function Analysis() {
  const navigate = useNavigate()
  const { analysisData, currentFile, lastUpdate } = useGridData()

  const analysisStyles = {
    container: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: THEME.spacing.xl,
    },
    fullWidth: {
      gridColumn: '1 / -1',
    },
    chartsRow: {
      gridColumn: '1 / -1',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: THEME.spacing.xl,
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

  if (!analysisData) {
    return (
      <div style={analysisStyles.container} className="fade-in">
        <div style={analysisStyles.fullWidth}>
          <h1 style={analysisStyles.title}>Grid Analysis</h1>
          <p style={analysisStyles.subtitle}>
            AI-powered insights and predictions for your electricity grid
          </p>
        </div>

        <Card style={analysisStyles.fullWidth}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: THEME.spacing.lg, minHeight: '300px', justifyContent: 'center' }}>
            <TrendingUp size={48} style={{ opacity: 0.3, color: THEME.colors.accent.primary }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', color: THEME.colors.text.primary, marginBottom: THEME.spacing.md }}>
                No analysis data yet
              </div>
              <div style={{ fontSize: '14px', color: THEME.colors.text.secondary, marginBottom: THEME.spacing.lg }}>
                Upload a CSV file from the Dashboard to see analysis results
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
    <div style={analysisStyles.container} className="fade-in">
      <div style={analysisStyles.fullWidth}>
        <h1 style={analysisStyles.title}>Grid Analysis</h1>
        <p style={analysisStyles.subtitle}>
          AI-powered insights and predictions for your electricity grid
        </p>
        {currentFile && (
          <div style={{ fontSize: '13px', color: THEME.colors.text.secondary, marginTop: THEME.spacing.md }}>
            File: <strong>{currentFile}</strong> • Updated: <strong>{lastUpdate}</strong>
          </div>
        )}
      </div>

      {/* Main Metrics */}
      <Card>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
          <Zap size={20} color={THEME.colors.accent.primary} />
          Next Hour Prediction
        </h3>
        <div style={{ fontSize: '32px', fontWeight: '700', color: THEME.colors.accent.primary, marginBottom: THEME.spacing.md }}>
          {analysisData.prediction_next_hour_kw?.toLocaleString()} KW
        </div>
        <div style={{ fontSize: '12px', color: THEME.colors.text.secondary }}>
          Predicted load for the next 60 minutes
        </div>
      </Card>

      {/* <Card>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Grid Status</h3>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: '700',
          color: getStatusColor(analysisData.grid_status),
          marginBottom: THEME.spacing.md,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {analysisData.grid_status}
        </div>
        <div style={{ fontSize: '12px', color: THEME.colors.text.secondary }}>
          System operational status
        </div>
      </Card> */}

      {/* Sustainability Card - ACTIVE */}
      <Card>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
          <Leaf size={20} color={THEME.colors.success} />
          Sustainability Impact
        </h3>
        <div style={{ fontSize: '18px', fontWeight: '700', color: THEME.colors.success, marginBottom: THEME.spacing.md }}>
          {analysisData.sustainability_score}% Score
        </div>
        <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: '1.6' }}>
          <div style={{ marginBottom: THEME.spacing.sm }}><strong>CO₂ Savings:</strong> {analysisData.co2_saved_kg?.toFixed(2)} kg</div>
          <div style={{ marginBottom: THEME.spacing.sm }}><strong>Reduction:</strong> {analysisData.percentage_reduction?.toFixed(1)}%</div>
          <div style={{ marginBottom: THEME.spacing.sm }}>{analysisData.environmental_impact}</div>
          <div style={{ fontStyle: 'italic', color: THEME.colors.text.secondary, fontSize: '11px', marginTop: THEME.spacing.sm }}>
            {analysisData.sustainability_impact}
          </div>
        </div>
      </Card>

      {/* Thermal SOA + XAI radar */}
      {(analysisData.safety_envelope || analysisData.xai_radar) && (
        <div style={analysisStyles.chartsRow}>
          {analysisData.safety_envelope && (
            <AnalysisSafetyEnvelope data={analysisData.safety_envelope} />
          )}
          {analysisData.xai_radar && <AnalysisXaiRadar data={analysisData.xai_radar} />}
        </div>
      )}

      {/* AI Reason */}
      <Card style={analysisStyles.fullWidth}>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
          <AlertCircle size={20} color={THEME.colors.accent.primary} />
          AI Reason (Explainable AI)
        </h3>
        <div style={{ 
          background: `rgba(13, 148, 136, 0.1)`,
          border: `1px solid ${THEME.colors.accent.primary}`,
          borderRadius: '8px',
          padding: THEME.spacing.lg,
          color: THEME.colors.accent.lighter,
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <div>{analysisData.ai_reason}</div>
          {analysisData.xai_radar?.dominant_axis && (
            <div
              style={{
                marginTop: THEME.spacing.md,
                paddingTop: THEME.spacing.md,
                borderTop: `1px solid rgba(13, 148, 136, 0.25)`,
                fontSize: '13px',
                color: THEME.colors.text.secondary,
              }}
            >
              <strong style={{ color: THEME.colors.text.primary }}>Radar consensus:</strong>{' '}
              largest grouped contribution is{' '}
              <strong style={{ color: THEME.colors.accent.lighter }}>
                {analysisData.xai_radar.dominant_axis}
              </strong>{' '}
              (see chart above).
            </div>
          )}
        </div>
      </Card>

      {/* Advisory */}
      <Card style={analysisStyles.fullWidth}>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Prescriptive Advisory</h3>
        <div style={{ 
          background: `rgba(16, 185, 129, 0.1)`,
          border: `1px solid ${THEME.colors.success}`,
          borderRadius: '8px',
          padding: THEME.spacing.lg,
          color: THEME.colors.text.primary,
          fontSize: '14px',
          lineHeight: '1.8'
        }}>
          <strong style={{ color: THEME.colors.success }}>💡 Recommendation:</strong>
          <p style={{ marginTop: THEME.spacing.md, marginBottom: 0 }}>
            {analysisData.advisory}
          </p>
        </div>
      </Card>

    </div>
  )
}

function getStatusColor(status) {
  if (status.includes('CRITICAL')) return THEME.colors.error
  if (status.includes('HIGH')) return THEME.colors.warning
  if (status.includes('MODERATE')) return THEME.colors.warning
  return THEME.colors.success
}
