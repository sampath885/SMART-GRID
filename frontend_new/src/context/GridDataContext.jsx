import React, { createContext, useState, useContext } from 'react'

// Create context
const GridDataContext = createContext()

// Provider component
export function GridDataProvider({ children }) {
  const [analysisData, setAnalysisData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [whatIfData, setWhatIfData] = useState(null)
  const [currentFile, setCurrentFile] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const value = {
    analysisData,
    setAnalysisData,
    forecastData,
    setForecastData,
    whatIfData,
    setWhatIfData,
    currentFile,
    setCurrentFile,
    lastUpdate,
    setLastUpdate,
  }

  return (
    <GridDataContext.Provider value={value}>
      {children}
    </GridDataContext.Provider>
  )
}

// Custom hook to use context
export function useGridData() {
  const context = useContext(GridDataContext)
  if (!context) {
    throw new Error('useGridData must be used within GridDataProvider')
  }
  return context
}
