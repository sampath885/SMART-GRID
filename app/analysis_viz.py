"""
Analysis-page helpers: illustrative thermal safety envelope and grouped XAI importances.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pandas as pd


# Aligns with calculate_grid_stress default usable headroom (90% of 100 MW nameplate).
_DEFAULT_USABLE_KW = 100000.0 * 0.9


def thermal_derated_capacity_kw(
    temp_c: float,
    base_kw: float = _DEFAULT_USABLE_KW,
    ref_c: float = 22.0,
    loss_per_degree: float = 0.008,
    floor_ratio: float = 0.62,
) -> float:
    """
    Illustrative SOA: notional safe delivery capacity decreases as ambient temperature
    rises above a reference (transformer / cable thermal headroom story).
    """
    t = float(temp_c)
    penalty = max(0.0, t - ref_c) * loss_per_degree
    return float(base_kw * max(floor_ratio, 1.0 - penalty))


def build_safety_envelope_curve(df: pd.DataFrame, n_points: int = 48) -> Tuple[List[Dict[str, float]], float, float]:
    """Piecewise-linear curve in (Temperature °C, max_safe_kw) for charting."""
    t_min = float(df["Temperature"].min())
    t_max = float(df["Temperature"].max())
    span = max(2.0, t_max - t_min)
    lo = max(-5.0, t_min - 0.08 * span)
    hi = min(48.0, t_max + 0.08 * span)
    step = (hi - lo) / max(1, (n_points - 1))
    curve: List[Dict[str, float]] = []
    for i in range(n_points):
        t = lo + i * step
        curve.append(
            {
                "temp": round(t, 2),
                "max_safe_kw": round(thermal_derated_capacity_kw(t), 2),
            }
        )
    return curve, lo, hi


def safety_point_status(temp_c: float, load_kw: float) -> Tuple[str, float]:
    limit = thermal_derated_capacity_kw(temp_c)
    status = "SAFE" if float(load_kw) <= limit else "STRESS"
    return status, limit


def build_safety_envelope_payload(
    df: pd.DataFrame, prediction_kw: float, current_temp_c: float
) -> Dict[str, Any]:
    curve, t_lo, t_hi = build_safety_envelope_curve(df)
    status, limit_kw = safety_point_status(current_temp_c, prediction_kw)
    return {
        "curve": curve,
        "point": {
            "temp_c": round(float(current_temp_c), 2),
            "load_kw": round(float(prediction_kw), 2),
            "limit_kw": round(limit_kw, 2),
            "margin_kw": round(limit_kw - float(prediction_kw), 2),
            "status": status,
        },
        "temp_axis_domain": [round(t_lo, 2), round(t_hi, 2)],
        "notional_base_kw": round(_DEFAULT_USABLE_KW, 2),
        "note": (
            "Illustrative thermal headroom: notional safe capacity derates as temperature "
            "rises above reference. Point = latest conditions vs model total-load forecast."
        ),
    }


# Feature groups must match names saved in models/feature_names.pkl
_XAI_GROUPS: List[Tuple[str, str, List[str]]] = [
    ("temperature", "Temperature", ["Temperature", "temp_rolling_3h"]),
    ("humidity", "Humidity", ["Humidity", "humidity_rolling_3h"]),
    ("temporal", "Temporal", ["hour", "day_of_week", "month", "day_of_month", "hour_sin", "hour_cos"]),
    ("historical", "Historical (lags)", ["residential_lag_1h", "residential_lag_2h", "datacenter_lag_1h", "datacenter_lag_2h"]),
    ("industrial", "Industrial activity", ["industrial_lag_1h"]),
]


def build_xai_radar_payload(feature_names: List[str], importances: List[float]) -> Dict[str, Any]:
    """Aggregate RandomForest feature_importances_ into five radar axes (0–100, max-normalized)."""
    name_to_imp = {str(n): float(v) for n, v in zip(feature_names, importances)}
    raw: Dict[str, float] = {}
    labels: Dict[str, str] = {}
    for key, label, feats in _XAI_GROUPS:
        raw[key] = sum(name_to_imp.get(f, 0.0) for f in feats)
        labels[key] = label

    mx = max(raw.values()) if raw else 1e-9
    axes_out: List[Dict[str, Any]] = []
    for key, label, _ in _XAI_GROUPS:
        v = raw.get(key, 0.0)
        axes_out.append(
            {
                "key": key,
                "label": label,
                "value": round(100.0 * v / mx, 1) if mx > 0 else 0.0,
                "share_raw": round(v, 5),
            }
        )
    dominant = max(axes_out, key=lambda a: a["value"])["label"]
    return {"axes": axes_out, "dominant_axis": dominant}
