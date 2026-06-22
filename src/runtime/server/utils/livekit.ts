import { AccessToken, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk'
import type { AccessTokenOptions, VideoGrant } from 'livekit-server-sdk'
import { useRuntimeConfig } from '#imports'

/**
 * Create a LiveKit AccessToken for a participant.
 *
 * @param identity - Unique identity for the participant
 * @param options - Additional token options (name, ttl, metadata, etc.)
 */
export function useLiveKitAccessToken(identity: string, options?: Omit<AccessTokenOptions, 'identity'>) {
  const { apiKey, apiSecret } = useRuntimeConfig().livekit
  if (!apiKey || !apiSecret) {
    throw new Error('[nuxt-livekit] apiKey and apiSecret must be configured in runtime config.')
  }
  return new AccessToken(apiKey, apiSecret, { identity, ...options })
}

/**
 * Create a RoomServiceClient for managing LiveKit rooms.
 *
 * @param host - Optional override for the LiveKit host URL
 */
export function useLiveKitRoomService(host?: string) {
  const config = useRuntimeConfig().livekit
  if (!config.apiKey || !config.apiSecret) {
    throw new Error('[nuxt-livekit] apiKey and apiSecret must be configured in runtime config.')
  }
  const url = host || config.wsUrl.replace('wss://', 'https://').replace('ws://', 'http://')
  return new RoomServiceClient(url, config.apiKey, config.apiSecret)
}

/**
 * Create a WebhookReceiver for verifying incoming LiveKit webhooks.
 */
export function useLiveKitWebhookReceiver() {
  const { apiKey, apiSecret } = useRuntimeConfig().livekit
  if (!apiKey || !apiSecret) {
    throw new Error('[nuxt-livekit] apiKey and apiSecret must be configured in runtime config.')
  }
  return new WebhookReceiver(apiKey, apiSecret)
}

/**
 * Generate a JWT token string for a participant to join a room.
 *
 * @param identity - Unique identity for the participant
 * @param roomName - Name of the room to join
 * @param options - Additional token options and grants
 * @param options.name - Display name for the participant
 * @param options.ttl - Token time-to-live (seconds or string like '2h')
 * @param options.metadata - Participant metadata
 * @param options.grants - Additional video grants to merge
 */
export async function generateLiveKitToken(
  identity: string,
  roomName: string,
  options?: {
    name?: string
    ttl?: number | string
    metadata?: string
    grants?: Partial<VideoGrant>
  },
): Promise<string> {
  const at = useLiveKitAccessToken(identity, {
    name: options?.name,
    ttl: options?.ttl,
    metadata: options?.metadata,
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    ...options?.grants,
  })

  return await at.toJwt()
}
