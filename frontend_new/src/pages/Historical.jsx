import React from 'react'
import Card from '../components/Card'
import { History, BarChart3 } from 'lucide-react'
import { THEME } from '../theme'

export default function Historical() {
  const historicalStyles = {
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

  const sampleHistory = [
    { date: '2024-03-26', maxLoad: 45200, status: 'HIGH STRESS', efficiency: '92.1%' },
    { date: '2024-03-25', maxLoad: 42100, status: 'MODERATE', efficiency: '94.3%' },
    { date: '2024-03-24', maxLoad: 38500, status: 'SAFE', efficiency: '96.2%' },
    { date: '2024-03-23', maxLoad: 41200, status: 'MODERATE', efficiency: '93.8%' },
    { date: '2024-03-22', maxLoad: 39800, status: 'MODERATE', efficiency: '94.9%' },
  ]

  const getStatusColor = (status) => {
    if (status.includes('HIGH')) return THEME.colors.error
    if (status.includes('MODERATE')) return THEME.colors.warning
    return THEME.colors.success
  }

  return (
    <div style={historicalStyles.container} className="fade-in">
      <div style={historicalStyles.fullWidth}>
        <h1 style={historicalStyles.title}>Historical Data & Trends</h1>
        <p style={historicalStyles.subtitle}>
          Track grid performance over time and identify patterns
        </p>
      </div>

      <Card style={historicalStyles.fullWidth}>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
          <History size={20} color={THEME.colors.accent.primary} />
          Analysis History
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${THEME.colors.border.primary}` }}>
                <th style={{ padding: THEME.spacing.md, textAlign: 'left', color: THEME.colors.text.secondary, fontWeight: '600' }}>Date</th>
                <th style={{ padding: THEME.spacing.md, textAlign: 'left', color: THEME.colors.text.secondary, fontWeight: '600' }}>Max Load</th>
                <th style={{ padding: THEME.spacing.md, textAlign: 'left', color: THEME.colors.text.secondary, fontWeight: '600' }}>Status</th>
                <th style={{ padding: THEME.spacing.md, textAlign: 'left', color: THEME.colors.text.secondary, fontWeight: '600' }}>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {sampleHistory.map((record, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${THEME.colors.border.secondary}` }}>
                  <td style={{ padding: THEME.spacing.md, color: THEME.colors.text.primary }}>{record.date}</td>
                  <td style={{ padding: THEME.spacing.md, color: THEME.colors.accent.primary, fontWeight: '600' }}>
                    {record.maxLoad.toLocaleString()} KW
                  </td>
                  <td style={{ 
                    padding: THEME.spacing.md, 
                    color: getStatusColor(record.status),
                    fontWeight: '600'
                  }}>
                    {record.status}
                  </td>
                  <td style={{ padding: THEME.spacing.md, color: THEME.colors.text.secondary }}>{record.efficiency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Avg Peak Load</h4>
        <div style={{ fontSize: '24px', fontWeight: '700', color: THEME.colors.accent.primary }}>
          41,360 KW
        </div>
        <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, marginTop: THEME.spacing.md }}>
          Last 5 days
        </div>
      </Card>

      <Card>
        <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.md }}>Avg Efficiency</h4>
        <div style={{ fontSize: '24px', fontWeight: '700', color: THEME.colors.success }}>
          94.3%
        </div>
        <div style={{ fontSize: '12px', color: THEME.colors.text.secondary, marginTop: THEME.spacing.md }}>
          System performance
        </div>
      </Card>
    </div>
  )
}
