import React from 'react'
import Card from '../components/Card'
import { BookOpen, Code, Copy } from 'lucide-react'
import { THEME } from '../theme'

export default function ApiDocs() {
  const docStyles = {
    container: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: THEME.spacing.xl,
    },
    fullWidth: {
      gridColumn: '1 / -1',
    },
    title: {
      fontSize: '22px',
      fontWeight: '700',
      marginBottom: THEME.spacing.lg,
      color: THEME.colors.text.primary,
    },
    subtitle: {
      fontSize: '14px',
      color: THEME.colors.text.secondary,
      marginBottom: THEME.spacing.lg,
    },
    endpoint: {
      marginBottom: THEME.spacing.xl,
    },
    method: {
      display: 'inline-block',
      padding: `${THEME.spacing.sm} ${THEME.spacing.md}`,
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '700',
      marginBottom: THEME.spacing.md,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    postMethod: {
      background: THEME.colors.info,
      color: '#0a0e15',
    },
    getMethod: {
      background: THEME.colors.success,
      color: '#0a0e15',
    },
    path: {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: THEME.colors.accent.primary,
      marginBottom: THEME.spacing.md,
      wordBreak: 'break-all',
    },
    description: {
      fontSize: '13px',
      color: THEME.colors.text.secondary,
      lineHeight: '1.6',
      marginBottom: THEME.spacing.md,
    },
    codeBlock: {
      background: THEME.colors.bg.tertiary,
      border: `1px solid ${THEME.colors.border.primary}`,
      borderRadius: '8px',
      padding: THEME.spacing.lg,
      fontFamily: 'monospace',
      fontSize: '12px',
      color: THEME.colors.accent.primary,
      overflow: 'auto',
      marginBottom: THEME.spacing.md,
    }
  }

  const endpoints = [
    {
      method: 'POST',
      path: '/predict-and-advise',
      description: 'Upload CSV file and get AI prediction, grid status, and advisory',
      request: 'multipart/form-data: file (CSV)',
      response: 'prediction_next_hour_kw, grid_status, advisory, sustainability_impact'
    },
    {
      method: 'GET',
      path: '/what-if-scenario?shift_percentage=X',
      description: 'Simulate load shifting and compare results',
      request: 'Query: shift_percentage (0-100)',
      response: 'original, with_shift, load_shifted_kw, recommendation'
    },
    {
      method: 'GET',
      path: '/forecast-24h',
      description: 'Generate 24-hour recursive forecast (144 points)',
      request: 'None',
      response: 'hourly_summary, timeline, anomalies'
    },
  ]

  return (
    <div style={docStyles.container} className="fade-in">
      <div style={docStyles.fullWidth}>
        <h1 style={docStyles.title}>API Documentation</h1>
        <p style={docStyles.subtitle}>
          Developer reference for GRID-AI backend services
        </p>
      </div>

      <Card style={docStyles.fullWidth}>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
          <BookOpen size={20} color={THEME.colors.accent.primary} />
          Base URL & Authentication
        </h3>
        <div style={docStyles.codeBlock}>
          http://127.0.0.1:8000
        </div>
        <p style={docStyles.description}>
          All endpoints are publicly available (CORS enabled). No authentication required for this demo version.
        </p>
      </Card>

      {endpoints.map((endpoint, idx) => (
        <Card key={idx} style={docStyles.fullWidth}>
          <div style={docStyles.endpoint}>
            <span style={{
              ...docStyles.method,
              ...(endpoint.method === 'POST' ? docStyles.postMethod : docStyles.getMethod)
            }}>
              {endpoint.method}
            </span>
            <div style={docStyles.path}>{endpoint.path}</div>
            <p style={docStyles.description}>{endpoint.description}</p>

            <div style={{ marginBottom: THEME.spacing.lg }}>
              <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: THEME.spacing.md, color: THEME.colors.text.secondary }}>
                Request
              </h4>
              <div style={docStyles.codeBlock}>{endpoint.request}</div>
            </div>

            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: THEME.spacing.md, color: THEME.colors.text.secondary }}>
                Response
              </h4>
              <div style={docStyles.codeBlock}>{endpoint.response}</div>
            </div>
          </div>
        </Card>
      ))}

      <Card style={docStyles.fullWidth}>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
          <Code size={20} color={THEME.colors.accent.primary} />
          Example Usage
        </h3>
        <div style={{
          background: THEME.colors.bg.tertiary,
          borderRadius: '8px',
          padding: THEME.spacing.lg,
          fontSize: '12px',
          fontFamily: 'monospace',
          color: THEME.colors.accent.lighter,
          overflow: 'auto',
          lineHeight: '1.6',
        }}>
          <div style={{ color: THEME.colors.warning }}>// Upload CSV and analyze</div>
          <div>const formData = <span style={{ color: THEME.colors.info }}>new</span> FormData();</div>
          <div>formData.append(<span style={{ color: THEME.colors.success }}>'file'</span>, csvFile);</div>
          <br/>
          <div>fetch(<span style={{ color: THEME.colors.success }}>'/predict-and-advise'</span>, {'{'}</div>
          <div style={{ marginLeft: THEME.spacing.xl }}>method: <span style={{ color: THEME.colors.success }}>'POST'</span>,</div>
          <div style={{ marginLeft: THEME.spacing.xl }}>body: formData</div>
          <div>{'}'}).then(r =&gt; r.json());</div>
        </div>
      </Card>

      <Card style={docStyles.fullWidth}>
        <h3 style={{ fontWeight: '600', marginBottom: THEME.spacing.lg }}>Key Features</h3>
        <ul style={{ fontSize: '14px', color: THEME.colors.text.secondary, lineHeight: '2' }}>
          <li>✓ Real-time load predictions powered by Random Forest</li>
          <li>✓ Recursive 24-hour forecasting (144 data points)</li>
          <li>✓ What-If scenario simulation for load shifting</li>
          <li>✓ XAI (Explainable AI) feature importance analysis</li>
          {/* Grid stress - Commented out (under review)
          <li>✓ Grid stress classification (SAFE → CRITICAL)</li>
          */}
          <li>✓ Carbon sustainability impact scoring</li>
        </ul>
      </Card>
    </div>
  )
}
