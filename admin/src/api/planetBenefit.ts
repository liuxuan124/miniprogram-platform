/**
 * 星球权益统一配置 API（mp_planet_benefit_config）
 * 对应后端 /api/v1/admin/planet-benefit
 */
import { get, put, del } from './request'

const BASE_URL = '/api/v1/admin/planet-benefit'

export interface PlanetBenefitConfig {
  id?: number
  planetId: string
  postEnabled?: number
  resourceEnabled?: number
  checkinEnabled?: number
  homeworkEnabled?: number
  discountRate?: number | null
  dailyPostLimit?: number
  resourceDownloadLimit?: number
  postRequireMember?: number
  status?: number
}

export function listPlanetBenefitConfigs() {
  return get<PlanetBenefitConfig[]>(BASE_URL).then((res: any) => ({
    ...res,
    data: (res.data || []).map(normalizeBenefit),
  }))
}

export function getPlanetBenefitConfig(planetId: string) {
  return get<PlanetBenefitConfig>(`${BASE_URL}/${planetId}`).then((res: any) => ({
    ...res,
    data: normalizeBenefit(res.data),
  }))
}

export function savePlanetBenefitConfig(planetId: string, patch: PlanetBenefitConfig) {
  return put<PlanetBenefitConfig>(`${BASE_URL}/${planetId}`, patch).then((res: any) => ({
    ...res,
    data: normalizeBenefit(res.data),
  }))
}

export function resetPlanetBenefitConfig(planetId: string) {
  return del<void>(`${BASE_URL}/${planetId}`)
}

function normalizeBenefit(row: any): PlanetBenefitConfig {
  if (!row) return {} as PlanetBenefitConfig
  return {
    id: row.id != null ? Number(row.id) : undefined,
    planetId: String(row.planetId ?? row.planet_id ?? ''),
    postEnabled: Number(row.postEnabled ?? row.post_enabled ?? 1),
    resourceEnabled: Number(row.resourceEnabled ?? row.resource_enabled ?? 1),
    checkinEnabled: Number(row.checkinEnabled ?? row.checkin_enabled ?? 1),
    homeworkEnabled: Number(row.homeworkEnabled ?? row.homework_enabled ?? 1),
    discountRate: row.discountRate ?? row.discount_rate ?? null,
    dailyPostLimit: Number(row.dailyPostLimit ?? row.daily_post_limit ?? 0),
    resourceDownloadLimit: Number(row.resourceDownloadLimit ?? row.resource_download_limit ?? 0),
    postRequireMember: Number(row.postRequireMember ?? row.post_require_member ?? 0),
    status: Number(row.status ?? 1),
  }
}
