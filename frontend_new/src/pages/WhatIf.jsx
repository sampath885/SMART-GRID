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
  const [pendingShiftPercentage, setPendingShiftPercentage] = useState(() =>
    Number(whatIfData?.shift_percentage) || 0
  )
  const [results, setResults] = useState(whatIfData)
  const [isSimulating, setIsSimulating] = useState(false)
  /** Only reset results from context when a new file upload completes (lastUpdate changes), not on every render. */
  const syncedLastUpdateRef = useRef(null)

  useEffect(() => {
    if (!whatIfData || !lastUpdate) return
    if (syncedLastUpdateRef.current === lastUpdate) return
    syncedLastUpdateRef.current = lastUpdate
    setResults(whatIfData)
    const initialShift = Number(whatIfData.shift_percentage) || 0
    setShiftPercentage(initialShift)
    setPendingShiftPercentage(initialShift)
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

  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value)
    setPendingShiftPercentage(value)
  }

  const runSimulation = async () => {
    setIsSimulating(true)
    try {
      const response = await fetch(
        `/api/what-if-scenario?shift_percentage=${encodeURIComponent(pendingShiftPercentage)}`
      )
      const data = await response.json()
      if (data.error) {
        console.warn('What-if API:', data.error)
        setIsSimulating(false)
        return
      }
      setResults(data)
      if (data.shift_percentage != null) {
        const applied = Number(data.shift_percentage)
        setShiftPercentage(applied)
        setPendingShiftPercentage(applied)
      }
    } catch (err) {
      console.error('Error fetching what-if scenario:', err)
    } finally {
      setIsSimulating(false)
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
            Stress and metrics below are <strong style={{ color: THEME.colors.accent.lighter }}>model outputs</strong> from your latest upload (baseline prediction + shift rules). For each slider value, the simulator evaluates peak-solar target hours (10 AM-4 PM) and shows the best tradeoff between CO₂ savings and projected stress at the shifted hour.
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
              {pendingShiftPercentage.toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={pendingShiftPercentage}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.md, marginTop: THEME.spacing.lg }}>
            <button
              type="button"
              onClick={runSimulation}
              disabled={isSimulating}
              style={{
                padding: `${THEME.spacing.sm} ${THEME.spacing.lg}`,
                borderRadius: '8px',
                border: 'none',
                background: THEME.colors.gradient.teal,
                color: '#0a0e15',
                fontWeight: '700',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                opacity: isSimulating ? 0.7 : 1,
                transition: THEME.transitions.smooth,
              }}
            >
              {isSimulating ? 'Running...' : 'Run Simulation'}
            </button>
            <span style={{ fontSize: '12px', color: THEME.colors.text.secondary }}>
              Applied: <strong style={{ color: THEME.colors.text.primary }}>{shiftPercentage.toFixed(0)}%</strong>
            </span>
          </div>
        </div>
      </Card>

      {results && (
        <>
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
              {results.best_solar_hour_name && (
                <div style={{ marginTop: THEME.spacing.md, fontSize: '12px', color: THEME.colors.text.secondary }}>
                  Best solar target for this slider value:{' '}
                  <strong style={{ color: THEME.colors.accent.lighter }}>
                    {results.best_solar_hour_name}
                  </strong>{' '}
                  ({results.best_solar_hour}:00) • projected target stress:{' '}
                  <strong style={{ color: THEME.colors.text.primary }}>
                    {results.projected_target_stress_pct?.toFixed(1)}%
                  </strong>
                </div>
              )}
            </Card>
          )}

          {results.solar_shift_analysis?.all_options?.length > 0 && (
            <Card style={whatIfStyles.fullWidth}>
              <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
                <TrendingDown size={18} color={THEME.colors.accent.primary} />
                Solar Window Tradeoff (10 AM-4 PM)
              </h4>
              <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, marginBottom: THEME.spacing.md, lineHeight: 1.5 }}>
                Source hour: <strong>{results.solar_shift_analysis.source_hour_name}</strong>. The table compares every peak-solar target hour for the selected shift percentage.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ color: THEME.colors.text.secondary }}>
                      <th style={tableHeadStyle}>Target Hour</th>
                      <th style={tableHeadStyle}>CO₂ Saved</th>
                      <th style={tableHeadStyle}>Reduction</th>
                      <th style={tableHeadStyle}>Projected Target Stress</th>
                      <th style={tableHeadStyle}>Risk Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.solar_shift_analysis.all_options.map((opt) => {
                      const best = opt.shifted_hour === results.best_solar_hour
                      const risk = classifyStress(opt.projected_target_stress_pct)
                      return (
                        <tr key={opt.shifted_hour} style={{ borderTop: `1px solid ${THEME.colors.border.secondary}` }}>
                          <td style={{ ...tableCellStyle, color: best ? THEME.colors.accent.lighter : THEME.colors.text.primary, fontWeight: best ? 700 : 500 }}>
                            {opt.shifted_hour_name}{best ? ' (best)' : ''}
                          </td>
                          <td style={tableCellStyle}>{opt.co2_saved_kg.toFixed(2)} kg</td>
                          <td style={tableCellStyle}>{opt.percentage_reduction.toFixed(1)}%</td>
                          <td style={tableCellStyle}>{opt.projected_target_stress_pct.toFixed(1)}%</td>
                          <td style={{ ...tableCellStyle, color: stressBandColor(risk) }}>{risk}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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

function classifyStress(stressPct) {
  if (stressPct >= 95) return 'CRITICAL'
  if (stressPct >= 85) return 'HIGH'
  if (stressPct >= 70) return 'CAUTION'
  return 'SAFE'
}

function stressBandColor(band) {
  if (band === 'CRITICAL') return THEME.colors.error
  if (band === 'HIGH') return THEME.colors.warning
  if (band === 'CAUTION') return THEME.colors.warning
  return THEME.colors.success
}

const tableHeadStyle = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: `1px solid ${THEME.colors.border.primary}`,
  fontWeight: 600,
  letterSpacing: '0.02em',
}

const tableCellStyle = {
  padding: '10px 8px',
  color: THEME.colors.text.secondary,
}
