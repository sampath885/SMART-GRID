import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { Shield } from 'lucide-react'
import Card from './Card'
import { THEME } from '../theme'

const tooltipStyle = {
  backgroundColor: THEME.colors.bg.surface,
  border: `1px solid ${THEME.colors.border.primary}`,
  borderRadius: '8px',
  fontSize: '12px',
  color: THEME.colors.text.primary,
}

export default function AnalysisSafetyEnvelope({ data }) {
  const curve = data?.curve || []
  const pt = data?.point
  const domainY = useMemo(() => {
    if (!curve.length && !pt) return [0, 100000]
    const ys = curve.map((d) => d.max_safe_kw)
    if (pt?.load_kw != null) ys.push(pt.load_kw)
    const hi = Math.max(...ys) * 1.08
    return [0, Math.max(hi, 1000)]
  }, [curve, pt])

  if (!curve.length || !pt) {
    return null
  }

  const safe = pt.status === 'SAFE'
  const dotColor = safe ? THEME.colors.success : THEME.colors.error
  const [tMin, tMax] = data.temp_axis_domain || [
    Math.min(...curve.map((c) => c.temp)),
    Math.max(...curve.map((c) => c.temp)),
  ]

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
        <Shield size={20} color={THEME.colors.accent.primary} />
        Dynamic Safety Envelope
      </h3>
      <p
        style={{
          fontSize: '12px',
          color: THEME.colors.text.secondary,
          lineHeight: 1.5,
          marginBottom: THEME.spacing.md,
        }}
      >
        Ambient temperature (°C) vs illustrative safe delivery limit (kW). The curve derates
        notional headroom as heat rises — compare your{' '}
        <strong style={{ color: THEME.colors.text.primary }}>forecast point</strong> to the line.
      </p>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={THEME.colors.border.primary} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="temp"
              domain={[tMin, tMax]}
              tick={{ fill: THEME.colors.text.secondary, fontSize: 11 }}
              label={{
                value: 'Temperature (°C)',
                position: 'insideBottom',
                offset: -2,
                fill: THEME.colors.text.tertiary,
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              domain={domainY}
              tick={{ fill: THEME.colors.text.secondary, fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: 'Load / limit (kW)',
                angle: -90,
                position: 'insideLeft',
                fill: THEME.colors.text.tertiary,
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [
                typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value,
                name === 'max_safe_kw' ? 'Safe envelope' : name,
              ]}
              labelFormatter={(label) => `${label} °C`}
            />
            <Line
              type="monotone"
              dataKey="max_safe_kw"
              stroke={THEME.colors.accent.primary}
              strokeWidth={2}
              dot={false}
              name="max_safe_kw"
            />
            <ReferenceDot
              x={pt.temp_c}
              y={pt.load_kw}
              r={9}
              fill={dotColor}
              stroke={THEME.colors.text.primary}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          marginTop: THEME.spacing.md,
          display: 'flex',
          flexWrap: 'wrap',
          gap: THEME.spacing.md,
          alignItems: 'center',
          fontSize: '12px',
          color: THEME.colors.text.secondary,
        }}
      >
        <span>
          <strong style={{ color: THEME.colors.text.primary }}>Point:</strong>{' '}
          {pt.temp_c}°C, {pt.load_kw?.toLocaleString()} kW
        </span>
        <span>
          <strong style={{ color: THEME.colors.text.primary }}>Limit @ T:</strong>{' '}
          {pt.limit_kw?.toLocaleString()} kW
        </span>
        <span style={{ color: safe ? THEME.colors.success : THEME.colors.error, fontWeight: 700 }}>
          {safe ? 'Below envelope — headroom' : 'Above envelope — stress risk'}
        </span>
      </div>
      <p
        style={{
          fontSize: '10px',
          color: THEME.colors.text.tertiary,
          marginTop: THEME.spacing.sm,
          fontStyle: 'italic',
          lineHeight: 1.45,
        }}
      >
        {data.note}
      </p>
    </Card>
  )
}
