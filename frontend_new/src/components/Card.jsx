import React from 'react'
import { THEME } from '../theme'

export default function Card({ children, style, onClick }) {
  const cardStyle = {
    backgroundColor: THEME.colors.bg.surface,
    border: `1px solid ${THEME.colors.border.primary}`,
    borderRadius: '16px',
    padding: THEME.spacing.xl,
    boxShadow: THEME.shadows.sm,
    transition: THEME.transitions.smooth,
    cursor: onClick ? 'pointer' : 'default',
    ':hover': {
      borderColor: THEME.colors.accent.primary,
      boxShadow: THEME.shadows.glow,
    },
    ...style,
  }

  return (
    <div style={cardStyle} onClick={onClick}>
      {children}
    </div>
  )
}
