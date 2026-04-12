import React, { useMemo } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Radar as RadarIcon } from 'lucide-react'
import Card from './Card'
import { THEME } from '../theme'

const tooltipStyle = {
  backgroundColor: THEME.colors.bg.surface,
  border: `1px solid ${THEME.colors.border.primary}`,
  borderRadius: '8px',
  fontSize: '12px',
  color: THEME.colors.text.primary,
}

export default function AnalysisXaiRadar({ data }) {
  const chartRows = useMemo(() => {
    const axes = data?.axes || []
    const short = (key) =>
      ({
        temperature: 'Temperature',
        humidity: 'Humidity',
        temporal: 'Temporal',
        historical: 'Lags',
        industrial: 'Industrial',
      }[key] || key)
    return axes.map((a) => ({
      subject: short(a.key),
      value: a.value,
    }))
  }, [data])

  if (!chartRows.length) return null

  return (
    <Card>
      <h3
        style={{
          fontWeight: '600',
          marginBottom: THEME.spacing.sm,
          display: 'flex',
          alignItems: 'center',
          gap: THEME.spacing.md,
        }}
      >
        <RadarIcon size={20} color={THEME.colors.accent.primary} />
        Explainable Intelligence
      </h3>
      <p
        style={{
          fontSize: '12px',
          color: THEME.colors.text.secondary,
          lineHeight: 1.5,
          marginBottom: THEME.spacing.sm,
        }}
      >
        Random Forest feature importance, grouped into five story axes (max-normalized to 100).
        Dominant stretch explains the model&apos;s current bias.
      </p>
      <div style={{ fontSize: '11px', color: THEME.colors.accent.lighter, marginBottom: THEME.spacing.md }}>
        <strong style={{ color: THEME.colors.text.primary }}>Dominant:</strong> {data.dominant_axis}
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartRows}>
            <PolarGrid stroke={THEME.colors.border.primary} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: THEME.colors.text.secondary, fontSize: 10 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: THEME.colors.text.tertiary, fontSize: 9 }}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}`, 'Relative importance']} />
            <Radar
              name="Importance"
              dataKey="value"
              stroke={THEME.colors.accent.primary}
              fill={THEME.colors.accent.primary}
              fillOpacity={0.35}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
