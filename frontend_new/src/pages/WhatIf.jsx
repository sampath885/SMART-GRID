import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import CommitmentButton from '../components/CommitmentButton'
import { Zap, Calendar, TrendingDown, Info } from 'lucide-react'
import { useGridData } from '../context/GridDataContext'
import { THEME } from '../theme'

export default function WhatIf() {
  const navigate = useNavigate()
  const { whatIfData, lastUpdate } = useGridData()
  const [shiftPercentage, setShiftPercentage] = useState(() =>
    Number(whatIfData?.shift_percentage) || 0
  )
  const [results, setResults] = useState(whatIfData)
  /** Only reset results from context when a new file upload completes (lastUpdate changes), not on every render. */
  const syncedLastUpdateRef = useRef(null)

  useEffect(() => {
    if (!whatIfData || !lastUpdate) return
    if (syncedLastUpdateRef.current === lastUpdate) return
    syncedLastUpdateRef.current = lastUpdate
    setResults(whatIfData)
    setShiftPercentage(Number(whatIfData.shift_percentage) || 0)
  }, [lastUpdate, whatIfData])

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

    try {
      const response = await fetch(
        `/api/what-if-scenario?shift_percentage=${encodeURIComponent(value)}`
      )
      const data = await response.json()
      if (data.error) {
        console.warn('What-if API:', data.error)
        return
      }
      setResults(data)
      if (data.shift_percentage != null) {
        setShiftPercentage(Number(data.shift_percentage))
      }
    } catch (err) {
      console.error('Error fetching what-if scenario:', err)
    }
  }

  if (!results) {
    return (
      <div style={whatIfStyles.container} className="fade-in">
        <div style={whatIfStyles.fullWidth}>
          <h1 style={whatIfStyles.title}>What-If Analysis</h1>
          <p style={whatIfStyles.subtitle}>
            Simulate shifting data-center load to see grid stress and sustainability impact
          </p>
        </div>

        <Card style={whatIfStyles.fullWidth}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: THEME.spacing.lg, minHeight: '300px', justifyContent: 'center' }}>
            <Calendar size={48} style={{ opacity: 0.3, color: THEME.colors.accent.primary }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', color: THEME.colors.text.primary, marginBottom: THEME.spacing.md }}>
                No what-if data yet
              </div>
              <div style={{ fontSize: '14px', color: THEME.colors.text.secondary, marginBottom: THEME.spacing.lg }}>
                Upload a CSV file from the Dashboard to run load-shift scenarios
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
        <h1 style={whatIfStyles.title}>What-If Analysis</h1>
        <p style={whatIfStyles.subtitle}>
          Simulate shifting data-center load to see grid stress and sustainability impact
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
            <strong style={{ color: THEME.colors.text.primary }}>Simulation scope:</strong>{' '}
            Stress and metrics below are <strong style={{ color: THEME.colors.accent.lighter }}>model outputs</strong> from your latest upload (baseline prediction + shift rules). They are <strong style={{ color: THEME.colors.text.primary }}>not</strong> live grid readings at the current moment.
          </div>
        </div>
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
              <strong>Recommendation</strong>
              <p style={{ marginTop: THEME.spacing.md, marginBottom: 0 }}>
                {results.grid_recommendation ||
                  results.combined_advisory ||
                  results.sustainability_recommendation}
              </p>
            </div>
          </Card>

          <div style={whatIfStyles.comparisonGrid}>
            <Card>
              <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.md, fontSize: '14px', color: THEME.colors.text.secondary }}>Original Loads</h4>
              {/* Status display - ACTIVE with new grid stress */}
              <div style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                color: getStatusColor(results.original_stress?.status),
                marginBottom: THEME.spacing.md,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {results.original_stress?.status}
              </div>
              <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: '1.6' }}>
                <div style={{ marginBottom: THEME.spacing.sm }}>Peak Load: <strong>{results.original_stress?.max_load?.toLocaleString()} KW</strong></div>
                <div style={{ marginBottom: THEME.spacing.sm }}>Grid Stress: <strong>{results.original_stress?.combined_stress?.toFixed(1)}%</strong></div>
                {results.original_stress?.max_ramp_rate_kw_per_10min != null && (
                  <div style={{ marginBottom: THEME.spacing.sm }}>
                    Ramp Rate:{' '}
                    <strong>
                      {results.original_stress.max_ramp_rate_kw_per_10min.toLocaleString()} KW/10min
                    </strong>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.md, fontSize: '14px', color: THEME.colors.text.secondary }}>After Load Shift ({shiftPercentage}%)</h4>
              {/* Status display - ACTIVE with new grid stress */}
              <div style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                color: getStatusColor(results.new_stress_after_shift?.status),
                marginBottom: THEME.spacing.md,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {results.new_stress_after_shift?.status}
              </div>
              <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, lineHeight: '1.6' }}>
                <div style={{ marginBottom: THEME.spacing.sm }}>Peak Load: <strong>{results.new_stress_after_shift?.max_load?.toLocaleString()} KW</strong></div>
                <div style={{ marginBottom: THEME.spacing.sm }}>Grid Stress: <strong>{results.new_stress_after_shift?.combined_stress?.toFixed(1)}%</strong></div>
                {results.new_stress_after_shift?.max_ramp_rate_kw_per_10min != null && (
                  <div style={{ marginBottom: THEME.spacing.sm }}>
                    Ramp Rate:{' '}
                    <strong>
                      {results.new_stress_after_shift.max_ramp_rate_kw_per_10min.toLocaleString()}{' '}
                      KW/10min
                    </strong>
                  </div>
                )}
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
              
              {/* Stress Reduction - ACTIVE */}
              <div>
                <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>Stress Reduction</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.success }}>
                  {(results.original_stress?.combined_stress - results.new_stress_after_shift?.combined_stress)?.toFixed(1)}pp
                </div>
              </div>
              
              <div>
                <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>CO₂ Saved</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.success }}>
                  {results.sustainability_metrics?.co2_saved_kg?.toFixed(2)} kg
                </div>
              </div>
            </div>
          </Card>

          {/* Sustainability Impact Card - NEW */}
          {results.sustainability_metrics && (
            <Card style={whatIfStyles.fullWidth}>
              <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
                <TrendingDown size={18} color={THEME.colors.success} />
                Sustainability Impact
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: THEME.spacing.lg, fontSize: '14px' }}>
                <div>
                  <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>CO₂ Saved</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.success }}>
                    {results.sustainability_metrics?.co2_saved_kg?.toFixed(2)} kg
                  </div>
                </div>
                
                <div>
                  <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>Reduction</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.success }}>
                    {results.sustainability_metrics?.percentage_reduction?.toFixed(1)}%
                  </div>
                </div>
                
                <div>
                  <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>Score</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: THEME.colors.success }}>
                    {results.sustainability_metrics?.sustainability_score?.toFixed(1)}/100
                  </div>
                </div>
                
                <div>
                  <div style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.sm }}>Impact</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: THEME.colors.success, marginTop: THEME.spacing.sm }}>
                    {results.sustainability_metrics?.environmental_impact}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: THEME.colors.text.secondary, marginTop: THEME.spacing.md, fontStyle: 'italic', lineHeight: '1.4' }}>
                {results.sustainability_metrics?.message}
              </div>
            </Card>
          )}

          {/* Commitment Button - ACTIVE */}
          <Card style={whatIfStyles.fullWidth}>
            <CommitmentButton scenarioData={results} />
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
