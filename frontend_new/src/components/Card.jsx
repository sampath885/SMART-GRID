import React from 'react'
import { THEME } from '../theme'

export default function Card({ children, style, onClick }) {
  const cardStyle = {
    backgroundColor: THEME.colors.bg.surface,
    border: `1px solid ${THEME.colors.border.primary}`,
    borderRadius: '18px',
    padding: THEME.spacing.xl,
    boxShadow: THEME.shadows.md,
    transition: THEME.transitions.smooth,
    cursor: onClick ? 'pointer' : 'default',
    backdropFilter: 'blur(4px)',
    ...style,
  }

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!onClick) return
        e.currentTarget.style.borderColor = THEME.colors.accent.light
        e.currentTarget.style.boxShadow = THEME.shadows.glow
      }}
      onMouseLeave={(e) => {
        if (!onClick) return
        e.currentTarget.style.borderColor = THEME.colors.border.primary
        e.currentTarget.style.boxShadow = THEME.shadows.md
      }}
    >
      {children}
    </div>
  )
}
