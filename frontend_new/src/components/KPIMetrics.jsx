import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const KPIMetrics = () => {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchKPIs();
    // Refresh KPIs every 30 seconds
    const interval = setInterval(fetchKPIs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchKPIs = async () => {
    try {
      const response = await fetch('/api/kpi-metrics');
      const data = await response.json();
      setKpiData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load KPI metrics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="kpi-container">
        <p>Loading KPI metrics...</p>
      </div>
    );
  }

  if (error || !kpiData) {
    return (
      <div className="kpi-container">
        <p className="error">{error || 'No data available'}</p>
      </div>
    );
  }

  const { metrics, sustainability_progress, recent_commitments } = kpiData;

  return (
    <div className="kpi-container">
      <h2>Sustainability & Audit Dashboard (Week 8-9)</h2>

      {/* KPI Cards Row */}
      <div className="kpi-cards">
        <div className="kpi-card card-co2">
          <div className="kpi-icon">🌍</div>
          <div className="kpi-content">
            <h3>Total CO₂ Saved</h3>
            <p className="kpi-value">{metrics.total_co2_saved_kg}</p>
            <p className="kpi-unit">kg CO₂</p>
          </div>
        </div>

        <div className="kpi-card card-load">
          <div className="kpi-icon">⚡</div>
          <div className="kpi-content">
            <h3>Total Load Shifted</h3>
            <p className="kpi-value">{metrics.total_load_shifted_kwh}</p>
            <p className="kpi-unit">kWh</p>
          </div>
        </div>

        <div className="kpi-card card-commitments">
          <div className="kpi-icon">✅</div>
          <div className="kpi-content">
            <h3>Audit Trail Entries</h3>
            <p className="kpi-value">{metrics.audit_trail_entries}</p>
            <p className="kpi-unit">commitments</p>
          </div>
        </div>

        <div className="kpi-card card-sustainability">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-content">
            <h3>Sustainability Score</h3>
            <p className="kpi-value">{sustainability_progress.score}</p>
            <p className="kpi-unit">% toward 1000 kg target</p>
          </div>
        </div>
      </div>

      {/* Sustainability Progress Section */}
      <div className="sustainability-section">
        <h3>India Net Zero 2070 - Contribution</h3>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(sustainability_progress.net_zero_contribution, 100)}%` }}
            ></div>
          </div>
          <p className="progress-text">
            {sustainability_progress.net_zero_contribution}% of data center class contribution target
          </p>
        </div>
        <p className="progress-description">{sustainability_progress.progress_description}</p>
      </div>

      {/* Recent Commitments Table */}
      <div className="audit-trail-section">
        <h3>Recent Commitments Audit Trail</h3>
        {recent_commitments && recent_commitments.length > 0 ? (
          <div className="audit-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Original Load</th>
                  <th>Optimized Load</th>
                  <th>Shift %</th>
                  <th>CO₂ Saved</th>
                  <th>Grid Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_commitments.map((commit, idx) => (
                  <tr key={idx}>
                    <td>{new Date(commit.timestamp).toLocaleTimeString()}</td>
                    <td>{commit.original_load_kw} kW</td>
                    <td>{commit.optimized_load_kw} kW</td>
                    <td>{commit.shift_percentage}%</td>
                    <td>{commit.co2_saved_kg} kg</td>
                    <td>
                      <span className={`status ${commit.grid_status.toLowerCase()}`}>
                        {commit.grid_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No commitments recorded yet. Start shifting loads using the What-If scenario!</p>
        )}
      </div>

      <style jsx>{`
        .kpi-container {
          padding: 20px;
          background: #f5f7fa;
          border-radius: 8px;
        }

        h2 {
          color: #1a1a1a;
          margin-bottom: 20px;
          font-size: 24px;
        }

        h3 {
          color: #2c3e50;
          margin: 20px 0 15px;
          font-size: 18px;
        }

        .kpi-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .kpi-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 15px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .kpi-icon {
          font-size: 32px;
        }

        .kpi-content {
          flex: 1;
        }

        .kpi-content h3 {
          margin: 0 0 5px 0;
          font-size: 14px;
          font-weight: 600;
          color: #666;
        }

        .kpi-value {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          color: #1a1a1a;
        }

        .kpi-unit {
          margin: 5px 0 0 0;
          font-size: 12px;
          color: #999;
        }

        .card-co2 { border-left: 4px solid #27ae60; }
        .card-load { border-left: 4px solid #3498db; }
        .card-commitments { border-left: 4px solid #f39c12; }
        .card-sustainability { border-left: 4px solid #e74c3c; }

        .sustainability-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .progress-bar-container {
          margin: 15px 0;
        }

        .progress-bar {
          height: 30px;
          background: #ecf0f1;
          border-radius: 15px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #27ae60, #2ecc71);
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        .progress-text {
          margin: 10px 0 0 0;
          font-size: 14px;
          color: #666;
        }

        .progress-description {
          margin: 10px 0 0 0;
          font-size: 12px;
          color: #999;
          font-style: italic;
        }

        .audit-trail-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .audit-table {
          overflow-x: auto;
          margin-top: 15px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        thead {
          background: #f8f9fa;
          border-bottom: 2px solid #ddd;
        }

        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #ecf0f1;
        }

        tr:hover {
          background: #f8f9fa;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .status.critical {
          background: #ffe6e6;
          color: #c92a2a;
        }

        .status.high {
          background: #fff3cd;
          color: #856404;
        }

        .status.moderate {
          background: #d1ecf1;
          color: #0c5460;
        }

        .status.safe {
          background: #d4edda;
          color: #155724;
        }

        .no-data {
          text-align: center;
          color: #999;
          padding: 20px;
          font-style: italic;
        }

        .error {
          color: #e74c3c;
          padding: 10px;
          background: #ffe6e6;
          border-radius: 4px;
        }

        @media (max-width: 768px) {
          .kpi-cards {
            grid-template-columns: 1fr;
          }

          table {
            font-size: 11px;
          }

          th, td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default KPIMetrics;
