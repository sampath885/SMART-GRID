// Dark Slate & Teal Professional Theme
export const THEME = {
  colors: {
    // Primary palette - Dark slate base
    bg: {
      primary: '#0a0e15',    // Deep dark slate
      secondary: '#0f1419',  // Dark slate
      tertiary: '#151b24',   // Medium dark slate
      surface: '#1a2230',    // Surface slate
    },
    // Accent - Professional teal
    accent: {
      primary: '#0d9488',    // Professional teal
      light: '#14b8a6',      // Light teal
      lighter: '#99f6e4',    // Pale teal
    },
    // Supporting colors
    success: '#10b981',      // Emerald
    warning: '#f59e0b',      // Amber
    error: '#ef4444',        // Red
    info: '#06b6d4',         // Cyan
    
    // Text
    text: {
      primary: '#f5f5f7',    // Nearly white
      secondary: '#a8aaaf',  // Muted
      tertiary: '#6b7280',   // Dark muted
    },
    
    // Borders
    border: {
      primary: '#2a3540',
      secondary: '#1f2937',
    },
    
    // Gradients
    gradient: {
      teal: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
      slate: 'linear-gradient(135deg, #1a2230 0%, #0f1419 100%)',
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
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px 0 rgba(0, 0, 0, 0.4)',
    lg: '0 12px 24px 0 rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(13, 148, 136, 0.15)',
  },
  
  transitions: {
    smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fast: 'all 0.15s ease-out',
  }
}

export const getContrastColor = (bgColor) => {
  return bgColor === 'light' ? THEME.colors.text.primary : THEME.colors.text.primary
}
