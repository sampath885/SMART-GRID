import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { THEME } from '../theme';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import Card from './Card';

const AnomalyDetection = ({ forecastData }) => {
  const [anomalyData, setAnomalyData] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (forecastData?.all_predictions_10m) {
      processData();
    } else {
      setLoading(false);
    }
  }, [forecastData]);

  const processData = () => {
    try {
      setLoading(true);

      const predictions = forecastData.all_predictions_10m || [];
      const anomalies = forecastData.anomalies || {};

      if (!anomalies.anomaly_flags) {
        setError('Anomaly detection data not available');
        setLoading(false);
        return;
      }

      setAnomalyData(anomalies);

      // Create chart data
      const chartData = predictions.map((value, idx) => ({
        index: idx,
        load: value,
        isAnomaly: anomalies.anomaly_flags[idx] === -1,
        anomalyScore: anomalies.anomaly_scores[idx] || 0,
      }));

      // Hourly summary for main chart
      const hourlySummary = [];
      for (let h = 0; h < 24; h++) {
        const start = h * 6;
        const end = (h + 1) * 6;
        const hourValues = chartData.slice(start, end);
        const avgLoad = hourValues.reduce((sum, d) => sum + d.load, 0) / hourValues.length;
        const hasAnomalies = hourValues.some(d => d.isAnomaly);

        hourlySummary.push({
          hour: h,
          load: Math.round(avgLoad),
          hasAnomalies,
        });
      }

      setChartsData({
        fullData: chartData,
        hourlySummary,
      });

      setError(null);
    } catch (err) {
      console.error('Error processing anomaly data:', err);
      setError('Failed to process anomaly detection data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: THEME.spacing.xl }}>
          <div style={{ color: THEME.colors.text.secondary }}>Analyzing anomalies...</div>
        </div>
      </Card>
    );
  }

  if (!anomalyData || !chartsData || error) {
    return null;
  }

  const { confidence_score, anomalies_detected, explanation, anomaly_hours } = anomalyData;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1 / -1', gap: THEME.spacing.lg }}>
      {/* Main Section Title */}
      <div style={{ gridColumn: '1 / -1' }}>
        <h3 style={{
          fontSize: '22px',
          fontWeight: '700',
          marginBottom: THEME.spacing.lg,
          color: THEME.colors.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: THEME.spacing.md,
        }}>
          <AlertCircle size={24} color={THEME.colors.accent.primary} />
          Anomaly Detection & Model Confidence
        </h3>
      </div>

      {/* Confidence Score Card */}
      <Card style={{ gridColumn: '1 / -1' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: THEME.spacing.xl,
          alignItems: 'center',
        }}>
          {/* Confidence Circle Container */}
          <div style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            flexShrink: 0,
          }}>
            {/* Teal Circle Background */}
            <svg width="180" height="180" style={{ position: 'absolute', top: 0, left: 0 }}>
              <circle cx="90" cy="90" r="85" fill={THEME.colors.gradient.teal} />
            </svg>
            
            {/* Text centered in circle */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                fontSize: '56px',
                fontWeight: '800',
                color: THEME.colors.text.primary,
                lineHeight: '1',
                textAlign: 'center',
              }}>
                {Math.round(confidence_score)}%
              </div>
              <div style={{
                fontSize: '12px',
                color: THEME.colors.text.primary,
                marginTop: '8px',
                fontWeight: '600',
                textAlign: 'center',
                letterSpacing: '0.5px',
              }}>
                Confidence
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: THEME.spacing.lg,
              marginBottom: THEME.spacing.lg,
            }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: THEME.colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600',
                  marginBottom: THEME.spacing.sm,
                }}>
                  Anomalies Detected
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: anomalies_detected > 0 ? THEME.colors.error : THEME.colors.success,
                }}>
                  {anomalies_detected}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: THEME.colors.text.secondary,
                  marginTop: THEME.spacing.xs,
                }}>
                  out of {chartsData.fullData.length} periods
                </div>
              </div>

              {anomaly_hours.length > 0 && (
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: THEME.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600',
                    marginBottom: THEME.spacing.sm,
                  }}>
                    Anomalous Hours
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: THEME.colors.accent.primary,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: THEME.spacing.xs,
                  }}>
                    {anomaly_hours.map((h, idx) => (
                      <span key={idx} style={{
                        background: THEME.colors.bg.tertiary,
                        padding: `${THEME.spacing.xs} ${THEME.spacing.sm}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                      }}>
                        {h}h
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Explanation Box */}
            <div style={{
              background: `rgba(13, 148, 136, 0.1)`,
              border: `1px solid ${THEME.colors.accent.primary}`,
              borderRadius: '6px',
              padding: THEME.spacing.md,
              borderLeft: `3px solid ${THEME.colors.accent.primary}`,
            }}>
              <div style={{
                fontSize: '13px',
                color: THEME.colors.text.primary,
                lineHeight: '1.6',
              }}>
                {explanation}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Load Chart with Anomalies */}
      <Card style={{ gridColumn: '1 / -1' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: THEME.spacing.lg,
          color: THEME.colors.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: THEME.spacing.sm,
        }}>
          <TrendingUp size={18} color={THEME.colors.accent.primary} />
          24-Hour Forecast with Anomalies
        </h4>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartsData.hourlySummary}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={THEME.colors.border.primary}
            />
            <XAxis 
              dataKey="hour"
              fontSize={12}
              stroke={THEME.colors.text.secondary}
              label={{ value: 'Hour', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis 
              fontSize={12}
              stroke={THEME.colors.text.secondary}
              label={{ value: 'Load (KW)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: THEME.colors.bg.tertiary,
                border: `1px solid ${THEME.colors.border.primary}`,
                borderRadius: '6px',
                color: THEME.colors.text.primary,
              }}
              labelStyle={{ color: THEME.colors.text.primary }}
            />
            <Line
              type="monotone"
              dataKey="load"
              stroke={THEME.colors.accent.light}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.hasAnomalies) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={THEME.colors.error}
                      stroke={THEME.colors.text.primary}
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={THEME.colors.accent.primary}
                  />
                );
              }}
              isAnimationActive={false}
              name="Hourly Load"
            />
          </LineChart>
        </ResponsiveContainer>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: THEME.spacing.md,
          fontSize: '12px',
          color: THEME.colors.text.secondary,
          marginTop: THEME.spacing.md,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.sm }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: THEME.colors.error,
            }} />
            <span>Red = Anomalous hour</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.sm }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: THEME.colors.accent.primary,
            }} />
            <span>Blue = Normal hour</span>
          </div>
        </div>
      </Card>

      {/* Anomaly Score Distribution */}
      <Card style={{ gridColumn: '1 / -1' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: THEME.spacing.lg,
          color: THEME.colors.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: THEME.spacing.sm,
        }}>
          <Zap size={18} color={THEME.colors.accent.primary} />
          Anomaly Scores (10-min intervals, 144 data points)
        </h4>

        <div style={{
          display: 'flex',
          gap: '1px',
          height: '120px',
          marginBottom: THEME.spacing.lg,
          alignItems: 'flex-end',
          borderBottom: `1px solid ${THEME.colors.border.primary}`,
          padding: `0 0 ${THEME.spacing.md} 0`,
        }}>
          {chartsData.fullData.map((item, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${Math.max(5, Math.abs(item.anomalyScore) * 100)}px`,
                backgroundColor: item.isAnomaly ? THEME.colors.error : THEME.colors.accent.primary,
                opacity: 0.8,
                transition: THEME.transitions.fast,
                cursor: 'pointer',
                borderRadius: '1px',
              }}
              title={`Period ${idx}: ${item.load.toFixed(0)} KW`}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
            />
          ))}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: THEME.spacing.md,
          fontSize: '12px',
          color: THEME.colors.text.secondary,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.sm }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: THEME.colors.error,
            }} />
            <span>Red = Anomalous</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.sm }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: THEME.colors.accent.primary,
            }} />
            <span>Blue = Normal</span>
          </div>
        </div>
      </Card>

      {/* Insights */}
      <Card style={{
        gridColumn: '1 / -1',
        background: `linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(20, 184, 166, 0.05) 100%)`,
        borderLeft: `3px solid ${THEME.colors.accent.primary}`,
      }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: THEME.spacing.md,
          color: THEME.colors.accent.light,
        }}>
          💡 What This Means
        </h4>
        <ul style={{
          margin: 0,
          paddingLeft: THEME.spacing.lg,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: THEME.spacing.md,
        }}>
          <li style={{
            fontSize: '13px',
            color: THEME.colors.text.secondary,
            lineHeight: '1.6',
          }}>
            <strong style={{ color: THEME.colors.text.primary }}>High Confidence (&gt;85%):</strong> Reliable predictions for normal grid conditions
          </li>
          <li style={{
            fontSize: '13px',
            color: THEME.colors.text.secondary,
            lineHeight: '1.6',
          }}>
            <strong style={{ color: THEME.colors.text.primary }}>Anomalies:</strong> Edge cases or unusual patterns requiring extra monitoring
          </li>
          <li style={{
            fontSize: '13px',
            color: THEME.colors.text.secondary,
            lineHeight: '1.6',
          }}>
            <strong style={{ color: THEME.colors.text.primary }}>Red Hours:</strong> Hours with anomalous patterns - plan preventive measures
          </li>
          <li style={{
            fontSize: '13px',
            color: THEME.colors.text.secondary,
            lineHeight: '1.6',
          }}>
            <strong style={{ color: THEME.colors.text.primary }}>Pattern Comparison:</strong> Cross-check with weather, events, or external factors
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default AnomalyDetection;
