import { ref, type Ref } from 'vue'

export interface TokenRequestBody {
  roomName: string
  participantName: string
  [key: string]: unknown
}

export interface TokenResponse {
  token: string
  wsUrl?: string
}

export interface UseLiveKitTokenReturn {
  token: Ref<string>
  wsUrl: Ref<string>
  error: Ref<string | null>
  pending: Ref<boolean>
  fetchToken: (body: TokenRequestBody) => Promise<TokenResponse>
}

/**
 * Composable to fetch a LiveKit access token from a server API route.
 *
 * @param endpoint - The API endpoint to fetch the token from (default: '/api/livekit/token')
 */
export function useLiveKitToken(endpoint: string = '/api/livekit/token'): UseLiveKitTokenReturn {
  const token = ref('')
  const wsUrl = ref('')
  const error = ref<string | null>(null)
  const pending = ref(false)

  async function fetchToken(body: TokenRequestBody): Promise<TokenResponse> {
    pending.value = true
    error.value = null
    try {
      const response = await $fetch<TokenResponse>(endpoint, {
        method: 'POST',
        body,
      })
      token.value = response.token
      if (response.wsUrl) {
        wsUrl.value = response.wsUrl
      }
      return response
    }
    catch (err: unknown) {
      const e = err as { data?: { message?: string }, message?: string }
      error.value = e?.data?.message || e?.message || 'Failed to fetch token'
      throw err
    }
    finally {
      pending.value = false
    }
  }

  return {
    token,
    wsUrl,
    error,
    pending,
    fetchToken,
  }
}
