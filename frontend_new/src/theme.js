// Professional Midnight Slate Theme
export const THEME = {
  colors: {
    // Primary palette
    bg: {
      primary: '#0B1220',
      secondary: '#111A2E',
      tertiary: '#16233A',
      surface: '#1B2A44',
    },

    accent: {
      primary: '#3B82F6',
      light: '#60A5FA',
      lighter: '#BFDBFE',
    },

    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#38BDF8',

    // Text
    text: {
      primary: '#E5EDF8',
      secondary: '#A8B4C8',
      tertiary: '#7E8DA8',
    },

    // Borders
    border: {
      primary: '#253752',
      secondary: '#1B2B43',
    },

    // Keep key names for compatibility; use solid professional tones.
    gradient: {
      teal: '#3B82F6',
      slate: '#111A2E',
    }
  },

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  
  shadows: {
    sm: '0 1px 3px rgba(3, 8, 20, 0.35)',
    md: '0 8px 20px rgba(3, 8, 20, 0.45)',
    lg: '0 18px 42px rgba(3, 8, 20, 0.55)',
    glow: '0 0 0 1px rgba(96, 165, 250, 0.18), 0 10px 30px rgba(59, 130, 246, 0.15)',
  },

  transitions: {
    smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fast: 'all 0.15s ease-out',
  }
}

export const getContrastColor = (bgColor) => {
  return bgColor === 'light' ? THEME.colors.text.primary : THEME.colors.text.primary
}
