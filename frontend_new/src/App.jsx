import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Analysis from './pages/Analysis'
import Forecast from './pages/Forecast'
import WhatIf from './pages/WhatIf'
import ModelComparison from './pages/ApiDocs'
import { THEME } from './theme'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const appStyles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: THEME.colors.bg.primary,
      color: THEME.colors.text.primary,
      fontFamily: '"Inter", sans-serif',
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: `${THEME.spacing.xl} ${THEME.spacing['2xl']}`,
    },
  }

  return (
    <div style={appStyles.container}>
      <Sidebar 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div style={appStyles.main}>
        <Header />
        <div style={appStyles.content}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/what-if" element={<WhatIf />} />
            <Route path="/model-comparison" element={<ModelComparison />} />
            <Route path="/api-docs" element={<ModelComparison />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default AppContent
