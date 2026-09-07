export const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}` | undefined) ??
  '0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe'

export const EXPLORER_BASE = 'https://explorer-studio.genlayer.com'
export const APP_NAME = 'ScopeFlow'

export const MIN_SCOPE_LENGTH = 20
export const MAX_SCOPE_LENGTH = 6000
export const MIN_REQUEST_LENGTH = 5
export const MAX_REQUEST_LENGTH = 1200
export const PAGE_SIZE = 20
