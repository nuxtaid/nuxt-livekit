![nuxt-livekit](https://raw.githubusercontent.com/nuxtaid/nuxt-livekit/refs/heads/main/playground/public/logo.svg)

# nuxt-livekit

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

[LiveKit](https://livekit.io/) integration for [Nuxt](https://nuxt.com). Add realtime video, audio, and data features to your Nuxt application with auto-imported client composables and Nitro server utilities.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- [📖 &nbsp;Documentation](#usage)

## Features

- 🔌 &nbsp;**Auto-imported composables** — `useLiveKitRoom()` and `useLiveKitToken()` available in any component
- 🖥️ &nbsp;**Server utilities** — `generateLiveKitToken()`, `useLiveKitRoomService()`, `useLiveKitWebhookReceiver()` auto-imported in Nitro routes
- ⚡ &nbsp;**Reactive state** — connection state, participants, active speakers, reconnection status, and event log
- 🔐 &nbsp;**Secure by default** — API key/secret stay server-side via runtime config
- 📦 &nbsp;**Zero config** — just add your LiveKit credentials and go
- 🛡️ &nbsp;**SSR-safe** — composables are guarded to only run on the client

## Compatibility

| nuxt-livekit | Nuxt | livekit-client | livekit-server-sdk |
| --- | --- | --- | --- |
| `>=0.0.1` | `>=3.0.0` | `^2.x` | `^2.x` |

## Quick Setup

Install the module:

```bash
npx nuxi module add nuxt-livekit
```

That's it! The module is now installed and you can start using it.

## Configuration

Add your LiveKit credentials to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-livekit'],
  livekit: {
    wsUrl: 'wss://your-project.livekit.cloud',
  },
})
```

| Option | Description | Required |
| --- | --- | --- |
| `wsUrl` | LiveKit server WebSocket URL | Yes |
| `apiKey` | LiveKit API key (server-only) | Yes |
| `apiSecret` | LiveKit API secret (server-only) | Yes |

> [!IMPORTANT]
> `apiKey` and `apiSecret` are **never** exposed to the client. Only `wsUrl` is available in the browser via `useRuntimeConfig().public.livekit.wsUrl`.

### Environment Variables

Instead of hardcoding values in `nuxt.config.ts`, you can use environment variables with the standard Nuxt runtime config override convention:

| Variable | Maps to |
| --- | --- |
| `NUXT_LIVEKIT_WS_URL` | `runtimeConfig.livekit.wsUrl` |
| `NUXT_LIVEKIT_API_KEY` | `runtimeConfig.livekit.apiKey` |
| `NUXT_LIVEKIT_API_SECRET` | `runtimeConfig.livekit.apiSecret` |
| `NUXT_PUBLIC_LIVEKIT_WS_URL` | `runtimeConfig.public.livekit.wsUrl` |

Create a `.env` file in your project root:

```env
NUXT_LIVEKIT_WS_URL=wss://your-project.livekit.cloud
NUXT_LIVEKIT_API_KEY=your-api-key
NUXT_LIVEKIT_API_SECRET=your-api-secret
```

## Usage

### Client-side

#### `useLiveKitRoom(options?)`

Manages a LiveKit `Room` instance with reactive state. The room is automatically disconnected and cleaned up when the component is unmounted.

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

**Options:** Accepts all [`RoomOptions`](https://docs.livekit.io/client-sdk-js/interfaces/RoomOptions.html) from `livekit-client` (e.g. `adaptiveStream`, `dynacast`, `videoCaptureDefaults`).

#### `useLiveKitToken(endpoint?)`

Fetches a token from your server API route:

```vue
<script setup>
const { token, wsUrl, error, pending, fetchToken } = useLiveKitToken('/api/livekit/token')

const response = await fetchToken({ roomName: 'my-room', participantName: 'user-1' })
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

Returns a `WebhookReceiver` for verifying incoming LiveKit webhooks:

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

## Full Example

A complete flow from joining a room to rendering participants:

```vue
<script setup>
const roomName = ref('my-room')
const userName = ref('')

const { token, fetchToken } = useLiveKitToken()
const {
  connectionState,
  remoteParticipants,
  localParticipant,
  connect,
  disconnect,
} = useLiveKitRoom({ adaptiveStream: true, dynacast: true })

async function joinRoom() {
  const { token: t, wsUrl } = await fetchToken({
    roomName: roomName.value,
    participantName: userName.value,
  })
  await connect(t, wsUrl)
}
</script>

<template>
  <div>
    <div v-if="connectionState !== 'connected'">
      <input v-model="userName" placeholder="Your name" />
      <button @click="joinRoom">Join</button>
    </div>
    <div v-else>
      <p>Connected as {{ localParticipant?.identity }}</p>
      <p>{{ remoteParticipants.length }} other participant(s)</p>
      <button @click="disconnect">Leave</button>
    </div>
  </div>
</template>
```

## Contributing

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
  pnpm lint:fix
  
  # Run Vitest
  pnpm test
  pnpm test:watch
  
  # Type check
  pnpm test:types
  
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
