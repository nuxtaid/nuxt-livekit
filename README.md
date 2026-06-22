![nuxt-livekit](https://raw.githubusercontent.com/nuxtaid/nuxt-livekit/refs/heads/main/playground/public/logo.svg)

# nuxt-livekit

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

[LiveKit](https://livekit.io/) integration for Nuxt. Add realtime video, audio, and data to your Nuxt application with auto-imported client composables and Nitro server utilities.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)

## Features

- 🔌 &nbsp;**Auto-imported composables** — `useLiveKitRoom()` and `useLiveKitToken()` available in any component
- 🖥️ &nbsp;**Server utilities** — `generateLiveKitToken()`, `useLiveKitRoomService()`, `useLiveKitWebhookReceiver()` auto-imported in Nitro routes
- ⚡ &nbsp;**Reactive state** — connection state, participants, active speakers, reconnection status, and event log
- 🔐 &nbsp;**Secure by default** — API key/secret stay server-side via runtime config
- 📦 &nbsp;**Zero config** — just add your LiveKit credentials and go

## Quick Setup

Install the module:

```bash
npx nuxt module add nuxt-livekit
```

## Configuration

Add your LiveKit credentials to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-livekit'],
  livekit: {
    wsUrl: 'wss://your-project.livekit.cloud',
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
  },
})
```

| Option | Description | Required |
| --- | --- | --- |
| `wsUrl` | LiveKit server WebSocket URL | Yes |
| `apiKey` | LiveKit API key (server-only) | Yes |
| `apiSecret` | LiveKit API secret (server-only) | Yes |

> **Note:** `apiKey` and `apiSecret` are never exposed to the client. Only `wsUrl` is available in the browser via `useRuntimeConfig().public.livekit.wsUrl`.

You can also use environment variables (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL`) via Nuxt runtime config overrides.

## Usage

### Client-side

#### `useLiveKitRoom(options?)`

Manages a LiveKit `Room` instance with reactive state:

```vue
<script setup>
const {
  room,               // ShallowRef<Room>
  connectionState,    // Ref<ConnectionState>
  remoteParticipants, // ShallowRef<RemoteParticipant[]>
  localParticipant,   // ShallowRef<LocalParticipant>
  activeSpeakers,     // ShallowRef<Participant[]>
  isReconnecting,     // Ref<boolean>
  error,              // Ref<string | null>
  events,             // Ref<LiveKitRoomEvent[]>
  connect,            // (token: string, url?: string) => Promise<void>
  disconnect,         // () => Promise<void>
  clearEvents,        // () => void
} = useLiveKitRoom({ adaptiveStream: true, dynacast: true })

await connect(token)
</script>
```

#### `useLiveKitToken(endpoint?)`

Fetches a token from your server API route:

```vue
<script setup>
const { token, error, pending, fetchToken } = useLiveKitToken('/api/livekit/token')

const t = await fetchToken({ roomName: 'my-room', participantName: 'user-1' })
</script>
```

### Server-side (Nitro)

All server utilities are auto-imported in your `server/` routes.

#### `generateLiveKitToken(identity, roomName, options?)`

Generate a JWT token in one line:

```ts
// server/api/livekit/token.post.ts
export default defineEventHandler(async (event) => {
  const { roomName, participantName } = await readBody(event)

  const token = await generateLiveKitToken(participantName, roomName, {
    name: participantName,
    // Optional: customize grants
    grants: { canPublish: true, canSubscribe: true },
  })

  return { token }
})
```

#### `useLiveKitAccessToken(identity, options?)`

Lower-level — returns an `AccessToken` instance for full control:

```ts
const at = useLiveKitAccessToken('user-1', { ttl: '2h' })
at.addGrant({ roomJoin: true, room: 'my-room', canPublish: false })
const token = await at.toJwt()
```

#### `useLiveKitRoomService(host?)`

Returns a `RoomServiceClient` for managing rooms:

```ts
const svc = useLiveKitRoomService()
const rooms = await svc.listRooms()
await svc.deleteRoom('old-room')
```

#### `useLiveKitWebhookReceiver()`

Returns a `WebhookReceiver` for verifying incoming webhooks:

```ts
// server/api/livekit/webhook.post.ts
export default defineEventHandler(async (event) => {
  const receiver = useLiveKitWebhookReceiver()
  const body = await readRawBody(event)
  const authHeader = getHeader(event, 'authorization')
  const webhookEvent = await receiver.receive(body!, authHeader!)
  // Handle webhookEvent...
  return { ok: true }
})
```

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  pnpm install
  
  # Generate type stubs
  pnpm dev:prepare
  
  # Develop with the playground
  pnpm dev
  
  # Build the playground
  pnpm dev:build
  
  # Run ESLint
  pnpm lint
  
  # Run Vitest
  pnpm test
  pnpm test:watch
  
  # Release new version
  pnpm release
  ```

</details>

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-livekit/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-livekit

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-livekit.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-livekit

[license-src]: https://img.shields.io/npm/l/nuxt-livekit.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-livekit

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
