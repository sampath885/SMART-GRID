"""
KPI Tracker: Tracks commitments, audits, and sustainability metrics.
Uses in-memory storage for Week 8 implementation.
"""

from datetime import datetime
from typing import List, Dict
import json

# Global commitment log
commitment_log: List[Dict] = []
commitment_counter = 0


def record_commitment(
    original_load_kw: float,
    optimized_load_kw: float,
    shift_percentage: float,
    grid_status: str,
    co2_saved_estimate: float,
    operator_id: str = "System",
    reason: str = ""
) -> Dict:
    """
    Record a load shift commitment to the audit trail.
    
    Args:
        original_load_kw: Load before optimization
        optimized_load_kw: Load after optimization
        shift_percentage: Percentage of load shifted
        grid_status: Grid status at time of commitment (CRITICAL/HIGH/MODERATE/SAFE)
        co2_saved_estimate: Estimated CO2 saved (kg)
        operator_id: ID of operator making the commitment
        reason: Reason for the commitment
    
    Returns:
        Dictionary with commitment record
    """
    
    global commitment_counter
    commitment_counter += 1
    
    commitment = {
        'commitment_id': commitment_counter,
        'timestamp': datetime.now().isoformat(),
        'original_load_kw': round(original_load_kw, 2),
        'optimized_load_kw': round(optimized_load_kw, 2),
        'load_shifted_kw': round(original_load_kw - optimized_load_kw, 2),
        'shift_percentage': round(shift_percentage, 2),
        'grid_status': grid_status,
        'co2_saved_kg': round(co2_saved_estimate, 4),
        'operator_id': operator_id,
        'reason': reason or "Manual optimization commitment",
        'status': 'COMMITTED'
    }
    
    commitment_log.append(commitment)
    return commitment


def get_kpi_metrics() -> Dict:
    """
    Calculate current KPI metrics from all commitments.
    
    Returns:
        Dictionary with KPI dashboard metrics
    """
    
    if not commitment_log:
        return {
            'total_commitments': 0,
            'total_co2_saved_kg': 0.0,
            'total_load_shifted_kwh': 0.0,
            'total_reduction_percent': 0.0,
            'sustainability_score': 0.0,
            'net_zero_contribution_percent': 0.0,
            'last_commitment': None,
            'audit_trail_entries': 0
        }
    
    total_co2 = sum(c['co2_saved_kg'] for c in commitment_log)
    total_load_shifted = sum(c['load_shifted_kw'] for c in commitment_log)
    
    # Assume each shift is 10 minutes (1/6 hour)
    total_load_shifted_kwh = total_load_shifted / 6  # 10-min to hour conversion
    
    # Calculate sustainability score (0-100)
    # Based on CO2 saved: ~1000 kg/week target for demo
    sustainability_score = min(100, (total_co2 / 1000) * 100)
    
    # Average reduction percentage
    total_original_loads = sum(c['original_load_kw'] for c in commitment_log)
    avg_reduction_percent = (sum(c['shift_percentage'] for c in commitment_log) / len(commitment_log)) \
        if commitment_log else 0
    
    return {
        'total_commitments': len(commitment_log),
        'total_co2_saved_kg': round(total_co2, 2),
        'total_load_shifted_kwh': round(total_load_shifted_kwh, 2),
        'total_reduction_percent': round(avg_reduction_percent, 2),
        'sustainability_score': round(sustainability_score, 2),
        'net_zero_contribution_percent': round((total_co2 / 50000) * 100, 2),  # India target
        'last_commitment': commitment_log[-1]['timestamp'],
        'audit_trail_entries': len(commitment_log),
        'commitment_history': commitment_log[-10:]  # Last 10 commitments
    }


def get_commitment_history(limit: int = 50) -> List[Dict]:
    """
    Retrieve commitment history for audit trail.
    
    Args:
        limit: Maximum number of records to return
    
    Returns:
        List of commitment records
    """
    return commitment_log[-limit:]


def export_audit_trail() -> str:
    """
    Export commitment log as JSON for reporting.
    
    Returns:
        JSON string of audit trail
    """
    return json.dumps(commitment_log, indent=2)


def reset_commitments():
    """Reset all commitments (for testing/demo purposes)."""
    global commitment_log, commitment_counter
    commitment_log = []
    commitment_counter = 0
