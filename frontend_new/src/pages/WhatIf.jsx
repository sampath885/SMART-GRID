import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { Zap, AlertCircle, TrendingDown } from 'lucide-react'
import { useGridData } from '../context/GridDataContext'
import { THEME } from '../theme'

export default function WhatIf() {
  const navigate = useNavigate()
  const { whatIfData, lastUpdate } = useGridData()
  const [shiftPercentage, setShiftPercentage] = useState(0)
  const [results, setResults] = useState(whatIfData)

  const whatIfStyles = {
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
    slider: {
      width: '100%',
      height: '8px',
      borderRadius: '5px',
      background: THEME.colors.border.primary,
      outline: 'none',
      appearance: 'none',
      WebkitAppearance: 'none',
    },
    sliderLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: THEME.spacing.md,
    },
    comparisonGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: THEME.spacing.lg,
    }
  }

  const handleSliderChange = async (e) => {
    const value = parseFloat(e.target.value)
    setShiftPercentage(value)

    // Fetch what-if scenario
    try {
      const response = await fetch(`/api/what-if-scenario?shift_percentage=${value}`)
      const data = await response.json()
      if (!data.error) {
        setResults(data)
      }
    } catch (err) {
      console.error('Error fetching what-if scenario:', err)
    }
  }

  if (!results) {
    return (
      <div style={whatIfStyles.container} className="fade-in">
        <div style={whatIfStyles.fullWidth}>
          <h1 style={whatIfStyles.title}>What-If Simulation Reactor</h1>
          <p style={whatIfStyles.subtitle}>
            Optimize your grid by simulating load shifting strategies
          </p>
        </div>

        <Card style={whatIfStyles.fullWidth}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: THEME.spacing.lg, minHeight: '300px', justifyContent: 'center' }}>
            <AlertCircle size={48} style={{ opacity: 0.3, color: THEME.colors.accent.primary }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', color: THEME.colors.text.primary, marginBottom: THEME.spacing.md }}>
                No simulation data yet
              </div>
              <div style={{ fontSize: '14px', color: THEME.colors.text.secondary, marginBottom: THEME.spacing.lg }}>
                Upload a CSV file from the Dashboard to start testing load shifting scenarios
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
    <div style={whatIfStyles.container} className="fade-in">
      <div style={whatIfStyles.fullWidth}>
        <h1 style={whatIfStyles.title}>What-If Simulation Reactor</h1>
        <p style={whatIfStyles.subtitle}>
          Optimize your grid by simulating load shifting strategies
        </p>
        {lastUpdate && (
          <div style={{ fontSize: '13px', color: THEME.colors.text.secondary, marginTop: THEME.spacing.md }}>
            Generated: <strong>{lastUpdate}</strong>
          </div>
        )}
      </div>

      <Card style={whatIfStyles.fullWidth}>
        <div>
          <div style={whatIfStyles.sliderLabel}>
            <label style={{ fontSize: '14px', fontWeight: '600' }}>
              Load Shift Percentage
            </label>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              color: THEME.colors.accent.primary 
            }}>
              {shiftPercentage.toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={shiftPercentage}
            onChange={handleSliderChange}
            style={whatIfStyles.slider}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: THEME.spacing.md,
            fontSize: '12px',
            color: THEME.colors.text.secondary
          }}>
            <span>No Shift</span>
            <span>100% Shift</span>
          </div>
        </div>
      </Card>

      {results && (
        <>
          <Card style={whatIfStyles.fullWidth}>
            <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
              <TrendingDown size={20} color={THEME.colors.accent.primary} />
              Scenario Impact Analysis
            </h3>
            <div style={{
              background: `rgba(16, 185, 129, 0.1)`,
              border: `1px solid ${THEME.colors.success}`,
              borderRadius: '8px',
              padding: THEME.spacing.lg,
              color: THEME.colors.success,
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <strong>💡 Recommendation:</strong>
              <p style={{ marginTop: THEME.spacing.md, marginBottom: 0 }}>
                {results.recommendation}
              </p>
            </div>
          </Card>

          <div style={whatIfStyles.comparisonGrid}>
            <Card>
              <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.md, fontSize: '14px', color: THEME.colors.text.secondary }}>Original Loads</h4>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: getStatusColor(results.original.status),
                marginBottom: THEME.spacing.md,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {results.original.status}
              </div>
              <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: '1.6' }}>
                <div style={{ marginBottom: THEME.spacing.sm }}>Peak Load: <strong>{results.original.max_load?.toLocaleString()} KW</strong></div>
                <div>Grid Stress: <strong>{results.original.stress_percentage?.toFixed(1)}%</strong></div>
              </div>
            </Card>

            <Card>
              <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.md, fontSize: '14px', color: THEME.colors.text.secondary }}>After Load Shift ({shiftPercentage}%)</h4>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: getStatusColor(results.with_shift.status),
                marginBottom: THEME.spacing.md,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {results.with_shift.status}
              </div>
              <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: '1.6' }}>
                <div style={{ marginBottom: THEME.spacing.sm }}>Peak Load: <strong>{results.with_shift.max_load?.toLocaleString()} KW</strong></div>
                <div>Grid Stress: <strong>{results.with_shift.stress_percentage?.toFixed(1)}%</strong></div>
              </div>
            </Card>
          </div>

          <Card style={whatIfStyles.fullWidth}>
            <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
              <Zap size={18} color={THEME.colors.success} />
              Shift Impact Metrics
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: THEME.spacing.lg, fontSize: '14px' }}>
              <div>
                <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>Load Shifted</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.accent.primary }}>
                  {results.load_shifted_kw?.toLocaleString()} KW
                </div>
              </div>
              <div>
                <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>Stress Reduction</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.success }}>
                  {(results.original?.stress_percentage - results.with_shift?.stress_percentage)?.toFixed(1)}pp
                </div>
              </div>
              <div>
                <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>Peak Reduction</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.success }}>
                  {(results.original?.max_load - results.with_shift?.max_load)?.toLocaleString()} KW
                </div>
              </div>
            </div>
          </Card>

          <Card style={whatIfStyles.fullWidth}>
            <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg }}>Raw Scenario Data</h3>
            <div style={{
              background: THEME.colors.bg.tertiary,
              border: `1px solid ${THEME.colors.border.primary}`,
              borderRadius: '8px',
              padding: THEME.spacing.lg,
              fontFamily: 'monospace',
              fontSize: '12px',
              color: THEME.colors.accent.primary,
              overflow: 'auto',
              maxHeight: '400px',
            }}>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function getStatusColor(status) {
  if (status?.includes('CRITICAL')) return THEME.colors.error
  if (status?.includes('HIGH')) return THEME.colors.warning
  if (status?.includes('MODERATE')) return THEME.colors.warning
  return THEME.colors.success
}
