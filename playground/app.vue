<template>
  <UApp>
    <div class="min-h-screen bg-default">
      <UContainer class="py-12">
        <div class="max-w-2xl mx-auto space-y-6">
          <h1 class="text-3xl font-bold">
            LiveKit Playground
          </h1>

          <!-- Connection State Banner -->
          <UAlert
            v-if="isReconnecting"
            color="warning"
            icon="i-lucide-wifi-off"
            title="Reconnecting"
            description="Connection interrupted. Attempting to reconnect..."
          />

          <UAlert
            v-if="roomError"
            color="error"
            icon="i-lucide-circle-x"
            title="Room Error"
            :description="roomError"
          />

          <!-- Join Form -->
          <UCard v-if="connectionState !== 'connected'">
            <template #header>
              <h2 class="text-lg font-semibold">
                Join a Room
              </h2>
            </template>

            <div class="space-y-4">
              <UFormField label="Room Name">
                <UInput
                  v-model="roomName"
                  placeholder="my-room"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Your Name">
                <UInput
                  v-model="participantName"
                  placeholder="Enter your name"
                  class="w-full"
                />
              </UFormField>

              <UAlert
                v-if="tokenError"
                color="error"
                icon="i-lucide-circle-x"
                title="Token Error"
                :description="tokenError"
              />
            </div>

            <template #footer>
              <div class="space-y-2">
                <UButton
                  :loading="pending"
                  :disabled="!roomName || !participantName"
                  block
                  @click="joinRoom"
                >
                  Join Room
                </UButton>
                <p class="text-xs text-center text-muted">
                  State: <UBadge
                    :color="connectionBadgeColor"
                    variant="subtle"
                    size="xs"
                  >
                    {{ connectionState }}
                  </UBadge>
                </p>
              </div>
            </template>
          </UCard>

          <!-- Connected State -->
          <template v-else>
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold">
                    Connected
                  </h2>
                  <div class="flex items-center gap-2">
                    <UBadge
                      v-if="isReconnecting"
                      color="warning"
                      variant="subtle"
                    >
                      Reconnecting
                    </UBadge>
                    <UBadge
                      v-else
                      color="success"
                      variant="subtle"
                    >
                      Live
                    </UBadge>
                  </div>
                </div>
              </template>

              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted">Room</span>
                  <span class="font-medium">{{ room?.name }}</span>
                </div>
                <USeparator />
                <div class="flex justify-between">
                  <span class="text-muted">Identity</span>
                  <span class="font-medium">{{ localParticipant?.identity }}</span>
                </div>
                <USeparator />
                <div class="flex justify-between">
                  <span class="text-muted">Connection State</span>
                  <UBadge
                    :color="connectionBadgeColor"
                    variant="subtle"
                    size="xs"
                  >
                    {{ connectionState }}
                  </UBadge>
                </div>
                <USeparator />
                <div class="flex justify-between">
                  <span class="text-muted">Active Speakers</span>
                  <span class="font-medium">{{ activeSpeakers.length > 0 ? activeSpeakers.map(s => s.identity).join(', ') : 'None' }}</span>
                </div>
              </div>

              <template #footer>
                <UButton
                  color="error"
                  variant="soft"
                  block
                  @click="disconnect()"
                >
                  Leave Room
                </UButton>
              </template>
            </UCard>

            <!-- Media Controls -->
            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold">
                  Media Controls
                </h2>
              </template>

              <div class="flex flex-wrap gap-2">
                <UButton
                  :color="micEnabled ? 'success' : 'neutral'"
                  :variant="micEnabled ? 'solid' : 'soft'"
                  icon="i-lucide-mic"
                  @click="toggleMic"
                >
                  {{ micEnabled ? 'Mute Mic' : 'Unmute Mic' }}
                </UButton>

                <UButton
                  :color="cameraEnabled ? 'success' : 'neutral'"
                  :variant="cameraEnabled ? 'solid' : 'soft'"
                  icon="i-lucide-video"
                  @click="toggleCamera"
                >
                  {{ cameraEnabled ? 'Stop Camera' : 'Start Camera' }}
                </UButton>

                <UButton
                  :color="screenShareEnabled ? 'warning' : 'neutral'"
                  :variant="screenShareEnabled ? 'solid' : 'soft'"
                  icon="i-lucide-monitor"
                  @click="toggleScreenShare"
                >
                  {{ screenShareEnabled ? 'Stop Share' : 'Share Screen' }}
                </UButton>
              </div>

              <div
                v-if="micEnabled"
                class="mt-3 text-xs text-muted"
              >
                🎙️ Microphone is active — others can hear you.
              </div>
            </UCard>

            <!-- Local Video -->
            <UCard v-if="cameraEnabled || screenShareEnabled">
              <template #header>
                <h2 class="text-lg font-semibold">
                  Local Preview
                </h2>
              </template>

              <div class="space-y-3">
                <div
                  v-if="cameraEnabled"
                  ref="localVideoEl"
                  class="rounded-lg overflow-hidden bg-black aspect-video"
                />
                <div
                  v-if="screenShareEnabled"
                  ref="localScreenEl"
                  class="rounded-lg overflow-hidden bg-black aspect-video"
                />
              </div>
            </UCard>

            <!-- Remote Video/Audio -->
            <UCard v-if="remoteVideoTracks.length > 0 || remoteAudioTracks.length > 0">
              <template #header>
                <h2 class="text-lg font-semibold">
                  Remote Media ({{ remoteVideoTracks.length }} video, {{ remoteAudioTracks.length }} audio)
                </h2>
              </template>

              <div class="space-y-3">
                <div
                  v-for="track in remoteVideoTracks"
                  :key="track.sid"
                  class="rounded-lg overflow-hidden bg-black aspect-video"
                >
                  <video
                    :ref="(el) => attachTrack(el as HTMLVideoElement, track)"
                    autoplay
                    playsinline
                    class="w-full h-full object-contain"
                  />
                </div>
              </div>
            </UCard>

            <!-- Participants -->
            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold">
                  Participants ({{ remoteParticipants.length }})
                </h2>
              </template>

              <div
                v-if="remoteParticipants.length === 0"
                class="text-sm text-muted"
              >
                No other participants yet.
              </div>

              <div
                v-else
                class="space-y-2"
              >
                <div
                  v-for="p in remoteParticipants"
                  :key="p.identity"
                  class="flex items-center gap-3 p-2 rounded-lg bg-elevated"
                >
                  <UAvatar
                    :alt="p.name || p.identity"
                    size="sm"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">
                      {{ p.name || p.identity }}
                    </div>
                    <div class="text-xs text-muted">
                      {{ p.identity }}
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <UBadge
                      v-if="activeSpeakers.some(s => s.identity === p.identity)"
                      color="success"
                      variant="subtle"
                      size="xs"
                    >
                      Speaking
                    </UBadge>
                    <UBadge
                      v-if="p.isCameraEnabled"
                      color="info"
                      variant="subtle"
                      size="xs"
                    >
                      Camera
                    </UBadge>
                    <UBadge
                      v-if="p.isMicrophoneEnabled"
                      color="info"
                      variant="subtle"
                      size="xs"
                    >
                      Mic
                    </UBadge>
                  </div>
                </div>
              </div>
            </UCard>
          </template>

          <!-- Event Log (always visible) -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">
                  Event Log ({{ events.length }})
                </h2>
                <UButton
                  v-if="events.length > 0"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="clearEvents"
                >
                  Clear
                </UButton>
              </div>
            </template>

            <div
              v-if="events.length === 0"
              class="text-sm text-muted"
            >
              No events yet. Join a room to see activity.
            </div>

            <div
              v-else
              class="max-h-64 overflow-y-auto space-y-1"
            >
              <div
                v-for="(event, i) in [...events].reverse()"
                :key="i"
                class="flex items-start gap-2 text-xs p-1.5 rounded bg-elevated"
              >
                <UBadge
                  :color="eventBadgeColor(event.type)"
                  variant="subtle"
                  size="xs"
                  class="shrink-0 mt-0.5"
                >
                  {{ event.type }}
                </UBadge>
                <span class="flex-1 break-all">{{ event.message }}</span>
                <span class="text-muted shrink-0">{{ formatTime(event.timestamp) }}</span>
              </div>
            </div>
          </UCard>
        </div>
      </UContainer>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ConnectionState, Track, type RemoteTrack } from 'livekit-client'

const roomName = ref('test-room')
const participantName = ref('')

const { error: tokenError, pending, fetchToken } = useLiveKitToken()
const {
  room,
  connectionState,
  remoteParticipants,
  localParticipant,
  activeSpeakers,
  isReconnecting,
  error: roomError,
  events,
  connect,
  disconnect,
  clearEvents,
} = useLiveKitRoom({
  adaptiveStream: true,
  dynacast: true,
})

// Media state
const micEnabled = ref(false)
const cameraEnabled = ref(false)
const screenShareEnabled = ref(false)
const localVideoEl = ref<HTMLElement | null>(null)
const localScreenEl = ref<HTMLElement | null>(null)

// Remote tracks
const remoteVideoTracks = ref<RemoteTrack[]>([])
const remoteAudioTracks = ref<RemoteTrack[]>([])

// Watch remote participants for track changes
watch(remoteParticipants, () => {
  const videos: RemoteTrack[] = []
  const audios: RemoteTrack[] = []
  for (const p of remoteParticipants.value) {
    for (const pub of p.trackPublications.values()) {
      if (pub.track && pub.isSubscribed) {
        if (pub.track.kind === Track.Kind.Video) videos.push(pub.track as RemoteTrack)
        if (pub.track.kind === Track.Kind.Audio) audios.push(pub.track as RemoteTrack)
      }
    }
  }
  remoteVideoTracks.value = videos
  remoteAudioTracks.value = audios

  // Auto-attach audio tracks
  for (const track of audios) {
    track.attach()
  }
}, { immediate: true })

async function toggleMic() {
  const lp = room.value.localParticipant
  micEnabled.value = !micEnabled.value
  await lp.setMicrophoneEnabled(micEnabled.value)
}

async function toggleCamera() {
  const lp = room.value.localParticipant
  cameraEnabled.value = !cameraEnabled.value
  await lp.setCameraEnabled(cameraEnabled.value)

  if (cameraEnabled.value) {
    await nextTick()
    const camPub = lp.getTrackPublication(Track.Source.Camera)
    if (camPub?.track && localVideoEl.value) {
      const el = camPub.track.attach()
      el.style.width = '100%'
      el.style.height = '100%'
      el.style.objectFit = 'contain'
      localVideoEl.value.innerHTML = ''
      localVideoEl.value.appendChild(el)
    }
  }
}

async function toggleScreenShare() {
  const lp = room.value.localParticipant
  screenShareEnabled.value = !screenShareEnabled.value
  await lp.setScreenShareEnabled(screenShareEnabled.value)

  if (screenShareEnabled.value) {
    await nextTick()
    const screenPub = lp.getTrackPublication(Track.Source.ScreenShare)
    if (screenPub?.track && localScreenEl.value) {
      const el = screenPub.track.attach()
      el.style.width = '100%'
      el.style.height = '100%'
      el.style.objectFit = 'contain'
      localScreenEl.value.innerHTML = ''
      localScreenEl.value.appendChild(el)
    }
  }
}

function attachTrack(el: HTMLVideoElement | null, track: RemoteTrack) {
  if (el && track) {
    track.attach(el)
  }
}

// Reset media state on disconnect
watch(connectionState, (state) => {
  if (state === ConnectionState.Disconnected) {
    micEnabled.value = false
    cameraEnabled.value = false
    screenShareEnabled.value = false
    remoteVideoTracks.value = []
    remoteAudioTracks.value = []
  }
})

const connectionBadgeColor = computed(() => {
  switch (connectionState.value) {
    case ConnectionState.Connected: return 'success' as const
    case ConnectionState.Connecting: return 'warning' as const
    case ConnectionState.Reconnecting: return 'warning' as const
    case ConnectionState.Disconnected: return 'neutral' as const
    default: return 'neutral' as const
  }
})

function eventBadgeColor(type: string) {
  switch (type) {
    case 'error': return 'error' as const
    case 'connection': return 'info' as const
    case 'participant': return 'success' as const
    case 'track': return 'warning' as const
    case 'room': return 'primary' as const
    default: return 'neutral' as const
  }
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString()
}

async function joinRoom() {
  try {
    const { token: t, wsUrl: url } = await fetchToken({ roomName: roomName.value, participantName: participantName.value })
    await connect(t, url)
  }
  catch {
    // errors are already captured in reactive state
  }
}
</script>
