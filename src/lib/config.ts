export const CONTRACT_ADDRESS = (
  (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined)?.trim() ||
  '0x08F49e8929c7c49E2eBA30785661c0eA84b6b104'
) as `0x${string}`

export const EXPLORER_BASE = 'https://explorer-studio.genlayer.com'
export const APP_NAME = 'ScopeFlow'

export const MIN_SCOPE_LENGTH = 20
export const MAX_SCOPE_LENGTH = 6000
export const MIN_REQUEST_LENGTH = 5
export const MAX_REQUEST_LENGTH = 1200
export const PAGE_SIZE = 20
