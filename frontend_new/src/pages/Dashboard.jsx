import React, { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, Zap, Clock, BarChart3 } from 'lucide-react'
import Card from '../components/Card'
import MetricCard from '../components/MetricCard'
import UploadWidget from '../components/UploadWidget'
import { THEME } from '../theme'

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    currentLoad: 28500,
    gridStatus: 'MODERATE STRESS',
    uptime: '99.8%',
    efficiency: '94.2%',
  })

  const dashboardStyles = {
    container: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: THEME.spacing.xl,
    },
    fullWidth: {
      gridColumn: '1 / -1',
    },
    gridMetrics: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: THEME.spacing.lg,
      gridColumn: '1 / -1',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: THEME.colors.text.primary,
      marginBottom: THEME.spacing.lg,
      marginTop: THEME.spacing.xl,
    },
  }

  return (
    <div style={dashboardStyles.container} className="fade-in">
      {/* Welcome Card */}
      <Card style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: THEME.spacing.md }}>
              Welcome Back
            </h2>
            <p style={{ color: THEME.colors.text.secondary, marginBottom: THEME.spacing.lg }}>
              Real-time grid monitoring and AI-driven optimization at your fingertips
            </p>
          </div>
          <div style={{
            padding: THEME.spacing.lg,
            borderRadius: '12px',
            background: `rgba(13, 148, 136, 0.1)`,
            display: 'flex',
            alignItems: 'center',
            gap: THEME.spacing.md,
          }}>
            <Zap size={24} color={THEME.colors.accent.primary} />
            <div>
              <div style={{ fontSize: '12px', color: THEME.colors.text.secondary }}>System Status</div>
              <div style={{ fontWeight: '600', color: THEME.colors.success }}>Operational</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Upload & Quick Actions */}
      <Card style={{ gridColumn: '1 / -1' }}>
        <h3 style={dashboardStyles.sectionTitle}>Start Analysis</h3>
        <UploadWidget />
      </Card>

      {/* Key Metrics */}
      <h3 style={{ ...dashboardStyles.sectionTitle, gridColumn: '1 / -1' }}>
        Real-Time Metrics
      </h3>
      
      <MetricCard 
        label="Current Load"
        value={`${metrics.currentLoad.toLocaleString()} KW`}
        icon={<BarChart3 size={24} />}
        trend="+2.3%"
        status="moderate"
      />
      
      <MetricCard 
        label="Grid Status"
        value={metrics.gridStatus}
        icon={<AlertCircle size={24} />}
        trend="Stable"
        status="warning"
      />
      
      <MetricCard 
        label="System Uptime"
        value={metrics.uptime}
        icon={<Clock size={24} />}
        trend="↑ Excellent"
        status="success"
      />

      <MetricCard 
        label="Efficiency"
        value={metrics.efficiency}
        icon={<TrendingUp size={24} />}
        trend="+0.5%"
        status="success"
      />

      {/* Quick Information */}
      <Card style={{ gridColumn: '1 / -1' }}>
        <h3 style={dashboardStyles.sectionTitle}>Getting Started</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: THEME.spacing.lg,
        }}>
          <GuideItem 
            title="Upload Data"
            description="Import your CSV electricity consumption data to begin"
            step="1"
          />
          <GuideItem 
            title="View Analysis"
            description="Get AI-powered predictions and grid status recommendations"
            step="2"
          />
          <GuideItem 
            title="Run Scenarios"
            description="Use What-If simulator to test load shifting strategies"
            step="3"
          />
          <GuideItem 
            title="Plan Ahead"
            description="Check 24-hour forecasts for strategic planning"
            step="4"
          />
        </div>
      </Card>
    </div>
  )
}

function GuideItem({ title, description, step }) {
  return (
    <div style={{
      background: `rgba(13, 148, 136, 0.05)`,
      border: `1px solid ${THEME.colors.border.primary}`,
      borderRadius: '12px',
      padding: THEME.spacing.lg,
      display: 'flex',
      gap: THEME.spacing.lg,
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: THEME.colors.gradient.teal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0a0e15',
        fontWeight: '700',
        flexShrink: 0,
      }}>
        {step}
      </div>
      <div>
        <h4 style={{ fontWeight: '600', marginBottom: THEME.spacing.sm }}>
          {title}
        </h4>
        <p style={{ fontSize: '14px', color: THEME.colors.text.secondary }}>
          {description}
        </p>
      </div>
    </div>
  )
}
