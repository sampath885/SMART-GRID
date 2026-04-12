/**
 * Mirrors app/forecasting.py calculate_grid_stress() for a subset of load points (e.g. one forecast hour = 6×10min).
 * loads: values in kW
 */
const RAMP_FRACTION_FOR_SEVERITY_CAP = 2000 / (100000 * 0.9)

export function calculateGridStressForLoads(loads, capacity = 100000) {
  if (!loads?.length) return null

  const maxLoad = Math.max(...loads)
  const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length
  const minLoad = Math.min(...loads)

  const rampRates = []
  for (let i = 1; i < loads.length; i++) {
    rampRates.push(Math.abs(loads[i] - loads[i - 1]))
  }
  const maxRampRate = rampRates.length ? Math.max(...rampRates) : 0
  const avgRampRate = rampRates.length
    ? rampRates.reduce((a, b) => a + b, 0) / rampRates.length
    : 0

  const availableCapacity = capacity * 0.9
  let rampFraction = 0
  let rampSeverity = 0
  if (availableCapacity > 0) {
    rampFraction = maxRampRate / availableCapacity
    rampSeverity = Math.min(
      100,
      (rampFraction / RAMP_FRACTION_FOR_SEVERITY_CAP) * 100
    )
  }

  const peakStress = availableCapacity > 0 ? (maxLoad / availableCapacity) * 100 : 0
  const avgStress = availableCapacity > 0 ? (avgLoad / availableCapacity) * 100 : 0

  const combinedStress =
    0.5 * Math.min(peakStress, 100) +
    0.3 * Math.min(avgStress, 100) +
    0.2 * rampSeverity

  let status = 'SAFE'
  if (combinedStress > 85) {
    status =
      rampSeverity >= 70
        ? 'CRITICAL STRESS (Ramp-Rate Violation)'
        : 'CRITICAL STRESS (Peak Capacity)'
  } else if (combinedStress > 75) {
    status =
      rampSeverity >= 50
        ? 'HIGH STRESS (Rapid Volatility)'
        : 'HIGH STRESS (Peak Loading)'
  } else if (combinedStress > 60) status = 'MODERATE STRESS'
  else if (combinedStress > 40) status = 'CAUTION'

  return {
    max_load: maxLoad,
    avg_load: avgLoad,
    min_load: minLoad,
    peak_stress_pct: peakStress,
    avg_stress_pct: avgStress,
    max_ramp_rate_kw_per_10min: maxRampRate,
    avg_ramp_rate_kw_per_10min: avgRampRate,
    ramp_severity_score: rampSeverity,
    ramp_pct_of_capacity: rampFraction * 100,
    combined_stress: combinedStress,
    status,
    capacity,
    available_capacity: availableCapacity,
  }
}

export function getForecastHourLoads(allPredictions10m, hourIndex) {
  if (!allPredictions10m?.length || hourIndex < 0 || hourIndex > 23) return null
  const start = hourIndex * 6
  const slice = allPredictions10m.slice(start, start + 6)
  return slice.length === 6 ? slice : null
}
