import React from 'react'
import { THEME } from '../theme'

export default function Header() {
  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const headerStyles = {
    container: {
      height: '74px',
      backgroundColor: THEME.colors.bg.secondary,
      borderBottom: `1px solid ${THEME.colors.border.primary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${THEME.spacing.xl}`,
      boxShadow: THEME.shadows.sm,
      position: 'sticky',
      top: 0,
      zIndex: 20,
      backdropFilter: 'blur(8px)',
    },
    left: {
      display: 'flex',
      alignItems: 'center',
      gap: THEME.spacing.xl,
    },
    title: {
      fontSize: '21px',
      fontWeight: '700',
      color: THEME.colors.text.primary,
      letterSpacing: '0.01em',
    },
    status: {
      display: 'flex',
      alignItems: 'center',
      gap: THEME.spacing.sm,
    },
    statusDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: THEME.colors.success,
      animation: 'pulse 1.8s infinite',
      boxShadow: `0 0 0 5px rgba(34, 197, 94, 0.15)`,
    },
    statusText: {
      fontSize: '12px',
      color: THEME.colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    right: {
      display: 'flex',
      alignItems: 'center',
      gap: THEME.spacing.md,
      padding: `${THEME.spacing.sm} ${THEME.spacing.md}`,
      border: `1px solid ${THEME.colors.border.primary}`,
      borderRadius: '10px',
      color: THEME.colors.text.secondary,
      fontSize: '12px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    },
  }

  return (
    <div style={headerStyles.container}>
      <div style={headerStyles.left}>
        <div style={headerStyles.title}>Smart Grid Control Center</div>
        <div style={headerStyles.status}>
          <div style={headerStyles.statusDot} />
          <span style={headerStyles.statusText}>System Online</span>
        </div>
      </div>
      <div style={headerStyles.right}>
        {currentDate}
      </div>
    </div>
  )
}
