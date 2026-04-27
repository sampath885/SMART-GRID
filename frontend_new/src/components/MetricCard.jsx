import React from 'react'
import Card from './Card'
import { THEME } from '../theme'

export default function MetricCard({ label, value, icon, trend, status = 'default' }) {
  const statusColors = {
    success: THEME.colors.success,
    warning: THEME.colors.warning,
    error: THEME.colors.error,
    moderate: '#06b6d4',
    default: THEME.colors.text.secondary,
  }

  const metricStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: THEME.spacing.md,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconContainer: {
      width: '46px',
      height: '46px',
      borderRadius: '14px',
      background: 'rgba(59, 130, 246, 0.14)',
      border: `1px solid ${THEME.colors.border.primary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: THEME.colors.accent.primary,
    },
    label: {
      fontSize: '12px',
      color: THEME.colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '500',
    },
    value: {
      fontSize: '26px',
      fontWeight: '700',
      color: THEME.colors.text.primary,
      lineHeight: '1.2',
      marginTop: '4px',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: THEME.spacing.md,
      borderTop: `1px solid ${THEME.colors.border.primary}`,
    },
    trend: {
      fontSize: '12px',
      color: statusColors[status],
      fontWeight: '600',
    },
  }

  return (
    <Card>
      <div style={metricStyles.container}>
        <div style={metricStyles.header}>
          <div>
            <div style={metricStyles.label}>{label}</div>
            <div style={metricStyles.value}>{value}</div>
          </div>
          <div style={metricStyles.iconContainer}>
            {icon}
          </div>
        </div>
        {trend && (
          <div style={metricStyles.footer}>
            <span style={metricStyles.trend}>{trend}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
