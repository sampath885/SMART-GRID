import React, { useState } from 'react'
import Card from '../components/Card'
import { BrainCircuit, BarChart3, AlertTriangle } from 'lucide-react'
import { THEME } from '../theme'

export default function ApiDocs() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pageStyles = {
    container: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
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
    button: {
      padding: `${THEME.spacing.sm} ${THEME.spacing.lg}`,
      borderRadius: '8px',
      border: 'none',
      background: THEME.colors.gradient.teal,
      color: '#0a0e15',
      fontWeight: 700,
      cursor: 'pointer',
      transition: THEME.transitions.smooth,
    },
  }

  const runComparison = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/model-comparison')
      const data = await response.json()
      if (!response.ok || data.error) {
        setError(data.error || 'Failed to run model comparison.')
        setRows([])
        setMeta(null)
        return
      }
      setRows(Array.isArray(data.models) ? data.models : [])
      setMeta(data)
    } catch (err) {
      setError('Network error while running model comparison.')
      setRows([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyles.container} className="fade-in">
      <div style={pageStyles.fullWidth}>
        <h1 style={pageStyles.title}>Model Comparison</h1>
        <p style={pageStyles.subtitle}>
          Compare Random Forest against two separate benchmark models using the same uploaded dataset.
        </p>
      </div>

      <Card style={pageStyles.fullWidth}>
        <h3 style={{ fontWeight: 600, marginBottom: THEME.spacing.md, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
          <BrainCircuit size={18} color={THEME.colors.accent.primary} />
          Run Separate Benchmark
        </h3>
        <p style={{ fontSize: '13px', color: THEME.colors.text.secondary, lineHeight: 1.6, marginBottom: THEME.spacing.lg }}>
          This benchmark runs independently from your live Random Forest inference flow and does not overwrite production model files.
        </p>
        <button type="button" style={pageStyles.button} onClick={runComparison} disabled={loading}>
          {loading ? 'Running...' : 'Run Model Accuracy Test'}
        </button>
      </Card>

      {error && (
        <Card style={pageStyles.fullWidth}>
          <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.md, color: THEME.colors.error }}>
            <AlertTriangle size={18} />
            <div style={{ fontSize: '13px' }}>{error}</div>
          </div>
        </Card>
      )}

      {rows.length > 0 && (
        <Card style={pageStyles.fullWidth}>
          <h3 style={{ fontWeight: 600, marginBottom: THEME.spacing.md, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
            <BarChart3 size={18} color={THEME.colors.accent.primary} />
            Accuracy Results
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: THEME.colors.text.secondary }}>
                  <th style={tableHeadStyle}>Rank</th>
                  <th style={tableHeadStyle}>Model</th>
                  <th style={tableHeadStyle}>RMSE (kW)</th>
                  <th style={tableHeadStyle}>MAE (kW)</th>
                  <th style={tableHeadStyle}>MAPE (%)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.model} style={{ borderTop: `1px solid ${THEME.colors.border.secondary}` }}>
                    <td style={tableCellStyle}>#{index + 1}</td>
                    <td style={tableCellStyle}>{row.model}</td>
                    <td style={tableCellStyle}>{Number(row.rmse_kw).toLocaleString()}</td>
                    <td style={tableCellStyle}>{Number(row.mae_kw).toLocaleString()}</td>
                    <td style={tableCellStyle}>{Number(row.mape_pct).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && (
            <div style={{ marginTop: THEME.spacing.md, fontSize: '12px', color: THEME.colors.text.secondary }}>
              Split: {meta.split_method} | Train rows: {meta.train_rows} | Test rows: {meta.test_rows}
            </div>
          )}
      </Card>
      )}
    </div>
  )
}

const tableHeadStyle = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: `1px solid ${THEME.colors.border.primary}`,
  fontWeight: 600,
}

const tableCellStyle = {
  padding: '10px 8px',
  color: THEME.colors.text.secondary,
}
