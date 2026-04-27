import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, BarChart3, TrendingUp, Zap, 
  BrainCircuit, ChevronLeft, Cpu 
} from 'lucide-react'
import { THEME } from '../theme'

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/analysis', label: 'Analysis', icon: BarChart3 },
    { path: '/forecast', label: '24h Forecast', icon: TrendingUp },
    { path: '/what-if', label: 'What-If', icon: Zap },
    { path: '/model-comparison', label: 'Model Comparison', icon: BrainCircuit },
  ]

  const sidebarStyles = {
    container: {
      width: isOpen ? '280px' : '80px',
      backgroundColor: THEME.colors.bg.secondary,
      borderRight: `1px solid ${THEME.colors.border.primary}`,
      display: 'flex',
      flexDirection: 'column',
      transition: THEME.transitions.smooth,
      overflow: 'hidden',
    },
    header: {
      padding: THEME.spacing.lg,
      borderBottom: `1px solid ${THEME.colors.border.primary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
    },
    brand: {
      display: 'flex',
      alignItems: 'center',
      gap: THEME.spacing.md,
    },
    brandIcon: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: THEME.colors.accent.primary,
      display: 'grid',
      placeItems: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#eaf2ff',
      fontWeight: 'bold',
    },
    brandText: {
      opacity: isOpen ? 1 : 0,
      transition: THEME.transitions.smooth,
      lineHeight: '1.2',
    },
    brandName: {
      fontSize: '16px',
      fontWeight: '700',
      color: THEME.colors.text.primary,
    },
    brandSub: {
      fontSize: '10px',
      color: THEME.colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    toggleBtn: {
      background: 'none',
      border: 'none',
      color: THEME.colors.accent.primary,
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      opacity: isOpen ? 1 : 0,
      transition: THEME.transitions.smooth,
    },
    nav: {
      flex: 1,
      padding: THEME.spacing.md,
      display: 'flex',
      flexDirection: 'column',
      gap: THEME.spacing.sm,
      overflow: 'auto',
    },
    navItem: (active) => ({
      display: 'flex',
      alignItems: 'center',
      gap: THEME.spacing.md,
      padding: `${THEME.spacing.md} ${THEME.spacing.lg}`,
      borderRadius: '8px',
      cursor: 'pointer',
      transition: THEME.transitions.smooth,
      textDecoration: 'none',
      color: active ? THEME.colors.text.primary : THEME.colors.text.secondary,
      backgroundColor: active ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
      borderLeft: active ? `3px solid ${THEME.colors.accent.primary}` : '3px solid transparent',
      paddingLeft: active ? 'calc(1.5rem - 3px)' : THEME.spacing.lg,
      fontWeight: active ? 600 : 500,
    }),
    navLabel: {
      opacity: isOpen ? 1 : 0,
      transition: THEME.transitions.smooth,
      fontSize: '14px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
    },
    footer: {
      padding: THEME.spacing.lg,
      borderTop: `1px solid ${THEME.colors.border.primary}`,
      fontSize: '11px',
      color: THEME.colors.text.tertiary,
      opacity: isOpen ? 1 : 0,
      transition: THEME.transitions.smooth,
    },
  }

  return (
    <div style={sidebarStyles.container} className="sidebar">
      <div style={sidebarStyles.header} onClick={onToggle}>
        <div style={sidebarStyles.brand}>
          <div style={sidebarStyles.brandIcon}>
            <Cpu size={18} />
          </div>
          {isOpen && (
            <div style={sidebarStyles.brandText}>
              <div style={sidebarStyles.brandName}>GRID<span style={{ color: THEME.colors.accent.primary }}>AI</span></div>
              <div style={sidebarStyles.brandSub}>Smart Grid</div>
            </div>
          )}
        </div>
        {isOpen && (
          <button style={sidebarStyles.toggleBtn}>
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      <nav style={sidebarStyles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              style={sidebarStyles.navItem(isActive)}
              title={!isOpen ? item.label : ''}
            >
              <Icon size={20} style={{ minWidth: '20px' }} />
              <span style={sidebarStyles.navLabel}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {isOpen && (
        <div style={sidebarStyles.footer}>
          <div style={{ opacity: 0.7 }}>Smart Grid Management</div>
          <div style={{ marginTop: THEME.spacing.sm }}>v1.0.0</div>
        </div>
      )}
    </div>
  )
}
