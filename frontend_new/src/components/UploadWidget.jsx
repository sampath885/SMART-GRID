import React, { useRef, useState } from 'react'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGridData } from '../context/GridDataContext'
import { THEME } from '../theme'

export default function UploadWidget() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const { setAnalysisData, setForecastData, setWhatIfData, setCurrentFile, setLastUpdate } = useGridData()

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
      setMessage({ type: 'success', text: `Selected: ${file.name}` })
    } else {
      setMessage({ type: 'error', text: 'Please select a CSV file' })
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      // 1. Upload and get analysis
      const response = await fetch('/api/predict-and-advise', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (data.error) {
        setMessage({ type: 'error', text: `Error: ${data.error}` })
        setLoading(false)
        return
      }

      // Save analysis data to context
      setAnalysisData(data)
      setCurrentFile(selectedFile.name)
      setLastUpdate(new Date().toLocaleString())

      // 2. Fetch forecast data
      try {
        const forecastRes = await fetch('/api/forecast-24h')
        const forecastJson = await forecastRes.json()
        if (!forecastJson.error) {
          setForecastData(forecastJson)
        }
      } catch (err) {
        console.error('Forecast fetch error:', err)
      }

      // 3. Fetch what-if data (default 0% shift)
      try {
        const whatIfRes = await fetch('/api/what-if-scenario?shift_percentage=0')
        const whatIfJson = await whatIfRes.json()
        if (!whatIfJson.error) {
          setWhatIfData(whatIfJson)
        }
      } catch (err) {
        console.error('What-if fetch error:', err)
      }

      setMessage({ type: 'success', text: 'Analysis complete! Navigating to Analysis page...' })
      
      // Navigate to analysis page after 1.5 seconds
      setTimeout(() => {
        navigate('/analysis')
      }, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: `Upload failed: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const uploadStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: THEME.spacing.lg,
    },
    uploadBox: {
      border: `2px dashed ${THEME.colors.border.primary}`,
      borderRadius: '12px',
      padding: THEME.spacing.xl,
      textAlign: 'center',
      cursor: 'pointer',
      transition: THEME.transitions.smooth,
      background: `rgba(13, 148, 136, 0.03)`,
      ':hover': {
        borderColor: THEME.colors.accent.primary,
        background: `rgba(13, 148, 136, 0.08)`,
      },
    },
    uploadIcon: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: THEME.spacing.lg,
    },
    uploadText: {
      fontSize: '14px',
      color: THEME.colors.text.secondary,
      marginBottom: THEME.spacing.sm,
    },
    uploadHint: {
      fontSize: '12px',
      color: THEME.colors.text.tertiary,
    },
    fileInput: {
      display: 'none',
    },
    buttonContainer: {
      display: 'flex',
      gap: THEME.spacing.md,
    },
    button: {
      flex: 1,
      padding: `${THEME.spacing.md} ${THEME.spacing.lg}`,
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: THEME.transitions.smooth,
    },
    primaryButton: {
      background: THEME.colors.gradient.teal,
      color: '#0a0e15',
    },
    secondaryButton: {
      background: `rgba(13, 148, 136, 0.1)`,
      color: THEME.colors.accent.primary,
      border: `1px solid ${THEME.colors.accent.primary}`,
    },
    message: {
      display: 'flex',
      alignItems: 'center',
      gap: THEME.spacing.md,
      padding: THEME.spacing.lg,
      borderRadius: '8px',
      fontSize: '14px',
    },
    successMessage: {
      background: `rgba(16, 185, 129, 0.1)`,
      border: `1px solid ${THEME.colors.success}`,
      color: THEME.colors.success,
    },
    errorMessage: {
      background: `rgba(239, 68, 68, 0.1)`,
      border: `1px solid ${THEME.colors.error}`,
      color: THEME.colors.error,
    },
  }

  return (
    <div style={uploadStyles.container}>
      <div 
        style={uploadStyles.uploadBox}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={uploadStyles.uploadIcon}>
          <Upload size={32} color={THEME.colors.accent.primary} />
        </div>
        <div style={uploadStyles.uploadText}>
          {selectedFile ? selectedFile.name : 'Click to select CSV file'}
        </div>
        <div style={uploadStyles.uploadHint}>
          or drag and drop your electricity data
        </div>
        <input 
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={uploadStyles.fileInput}
          onChange={handleFileSelect}
        />
      </div>

      {message && (
        <div style={{
          ...uploadStyles.message,
          ...(message.type === 'success' ? uploadStyles.successMessage : uploadStyles.errorMessage),
        }}>
          {message.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {message.text}
        </div>
      )}

      <div style={uploadStyles.buttonContainer}>
        <button 
          style={{ ...uploadStyles.button, ...uploadStyles.primaryButton }}
          onClick={handleUpload}
          disabled={!selectedFile || loading}
        >
          {loading ? 'Analyzing...' : 'Analyze Data'}
        </button>
        <button 
          style={{ ...uploadStyles.button, ...uploadStyles.secondaryButton }}
          onClick={() => setSelectedFile(null)}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
