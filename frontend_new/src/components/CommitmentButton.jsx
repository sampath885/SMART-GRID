import React, { useState } from 'react';

const CommitmentButton = ({ scenarioData, onCommit }) => {
  const [isCommitting, setIsCommitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');

  const handleCommit = async () => {
    if (!scenarioData) {
      setError('No scenario to commit');
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      const payload = {
        original_load: scenarioData.original?.max_load || 0,
        optimized_load: scenarioData.with_shift?.max_load || 0,
        shift_percentage: scenarioData.shift_percentage || 0,
        grid_status: scenarioData.with_shift?.status || 'MODERATE',
        reason: reason || 'Manual shift commitment',
        operator_id: 'Operator',
      };

      const response = await fetch('/api/commit-shift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setShowForm(false);
        setReason('');

        // Call parent callback if provided
        if (onCommit) {
          onCommit(data);
        }

        // Reset success message after 5 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError(data.message || 'Failed to commit shift');
      }
    } catch (err) {
      console.error('Commit error:', err);
      setError('Error committing shift: ' + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  if (!scenarioData) {
    return null;
  }

  return (
    <div className="commitment-container">
      {success && (
        <div className="success-message">
          <span>✅ Commitment recorded successfully!</span>
          <button onClick={() => setSuccess(false)}>×</button>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {!showForm && !success ? (
        <button
          className="commit-button primary"
          onClick={() => setShowForm(true)}
          disabled={isCommitting}
        >
          🔒 COMMIT TO GRID SCHEDULE
        </button>
      ) : null}

      {showForm && (
        <div className="commitment-form">
          <h4>Confirm Load Shift Commitment</h4>

          <div className="commitment-summary">
            <div className="summary-item">
              <span className="label">Current Load:</span>
              <span className="value">
                {scenarioData.original?.max_load?.toFixed(2) || 'N/A'} kW
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Optimized Load:</span>
              <span className="value highlight">
                {scenarioData.with_shift?.max_load?.toFixed(2) || 'N/A'} kW
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Shift Percentage:</span>
              <span className="value">
                {scenarioData.shift_percentage}%
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Load Reduced:</span>
              <span className="value green">
                {scenarioData.load_reduction_kw?.toFixed(2) || '0'} kW
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Grid Status:</span>
              <span className={`status-badge ${scenarioData.with_shift?.status?.toLowerCase()}`}>
                {scenarioData.with_shift?.status || 'UNKNOWN'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Reason for Commitment (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Pre-cooling data center, shifting non-critical backups..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button
              className="commit-button confirm"
              onClick={handleCommit}
              disabled={isCommitting}
            >
              {isCommitting ? 'Recording...' : '✅ Confirm Commitment'}
            </button>
            <button
              className="commit-button cancel"
              onClick={() => {
                setShowForm(false);
                setReason('');
                setError(null);
              }}
              disabled={isCommitting}
            >
              Cancel
            </button>
          </div>

          <p className="commitment-note">
            💼 This action creates an <strong>audit trail entry</strong> demonstrating that you followed the AI's recommendation.
            It will be saved in the sustainability report.
          </p>
        </div>
      )}

      <style jsx>{`
        .commitment-container {
          margin: 20px 0;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 15px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          size: 14px;
          border: 1px solid #c3e6cb;
          margin-bottom: 10px;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          size: 14px;
          border: 1px solid #f5c6cb;
          margin-bottom: 10px;
        }

        .success-message button,
        .error-message button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          color: inherit;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .success-message button:hover,
        .error-message button:hover {
          opacity: 1;
        }

        .commit-button {
          padding: 12px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .commit-button.primary {
          background: linear-gradient(135deg, #e74c3c, #c92a2a);
          color: white;
          width: 100%;
          margin: 15px 0;
        }

        .commit-button.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }

        .commit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .commitment-form {
          background: white;
          border: 2px solid #e74c3c;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .commitment-form h4 {
          margin-top: 0;
          color: #2c3e50;
          font-size: 16px;
        }

        .commitment-summary {
          background: #f8f9fa;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #ecf0f1;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .label {
          font-weight: 600;
          color: #555;
          font-size: 13px;
        }

        .value {
          color: #2c3e50;
          font-weight: 600;
        }

        .value.highlight {
          color: #27ae60;
        }

        .value.green {
          color: #27ae60;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.critical {
          background: #ffe6e6;
          color: #c92a2a;
        }

        .status-badge.high {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.moderate {
          background: #d1ecf1;
          color: #0c5460;
        }

        .status-badge.safe {
          background: #d4edda;
          color: #155724;
        }

        .form-group {
          margin: 15px 0;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 8px;
          font-size: 13px;
        }

        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #bdc3c7;
          border-radius: 4px;
          font-family: inherit;
          font-size: 13px;
          resize: vertical;
          box-sizing: border-box;
        }

        textarea:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .form-actions {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 10px;
          margin: 20px 0;
        }

        .commit-button.confirm {
          background: linear-gradient(135deg, #27ae60, #229954);
          color: white;
        }

        .commit-button.confirm:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
        }

        .commit-button.cancel {
          background: #ecf0f1;
          color: #2c3e50;
          border: 1px solid #bdc3c7;
        }

        .commit-button.cancel:hover:not(:disabled) {
          background: #d5dbdb;
        }

        .commitment-note {
          background: #ecf0f1;
          border-left: 4px solid #3498db;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          color: #555;
          margin: 15px 0 0 0;
        }

        @media (max-width: 768px) {
          .commitment-form {
            padding: 15px;
          }

          .form-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CommitmentButton;
