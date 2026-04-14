/**
 * Mirrors app/forecasting.py calculate_grid_stress() for a subset of load points (e.g. one forecast hour = 6×10min).
 * loads: values in kW
 */
const RAMP_FRACTION_FOR_SEVERITY_CAP = 2000 / (100000 * 0.9)
const DEFAULT_WEIGHTS = { peak: 0.5, avg: 0.3, ramp: 0.2 }

function deratedUsableCapacity(capacity, temperatureC) {
  const usable = capacity * 0.9
  if (temperatureC == null) return usable
  const refC = 22
  const lossPerDegree = 0.008
  const floorRatio = 0.62
  const penalty = Math.max(0, Number(temperatureC) - refC) * lossPerDegree
  return usable * Math.max(floorRatio, 1 - penalty)
}

export function calculateGridStressForLoads(loads, options = {}) {
  if (!loads?.length) return null
  const capacity = options.capacity ?? 100000
  const temperatureC = options.temperatureC
  const stressWeights = options.stressWeights ?? DEFAULT_WEIGHTS

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

  const availableCapacity = deratedUsableCapacity(capacity, temperatureC)
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
    stressWeights.peak * Math.min(peakStress, 100) +
    stressWeights.avg * Math.min(avgStress, 100) +
    stressWeights.ramp * rampSeverity

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
    temperature_c: temperatureC ?? null,
    stress_weights: stressWeights,
  }
}

export function getForecastHourLoads(allPredictions10m, hourIndex) {
  if (!allPredictions10m?.length || hourIndex < 0 || hourIndex > 23) return null
  const start = hourIndex * 6
  const slice = allPredictions10m.slice(start, start + 6)
  return slice.length === 6 ? slice : null
}
