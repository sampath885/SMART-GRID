import React from 'react'
import { THEME } from '../theme'

export default function Header() {
  const headerStyles = {
    container: {
      height: '70px',
      backgroundColor: THEME.colors.bg.secondary,
      borderBottom: `1px solid ${THEME.colors.border.primary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${THEME.spacing.xl}`,
      boxShadow: THEME.shadows.sm,
    },
    left: {
      display: 'flex',
      alignItems: 'center',
      gap: THEME.spacing.xl,
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: THEME.colors.text.primary,
    },
    status: {
      display: 'flex',
      alignItems: 'center',
      gap: THEME.spacing.sm,
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: THEME.colors.success,
      animation: 'pulse 2s infinite',
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
      gap: THEME.spacing.lg,
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
      </div>
    </div>
  )
}
