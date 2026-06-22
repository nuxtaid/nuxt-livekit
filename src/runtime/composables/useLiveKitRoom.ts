import { ref, shallowRef, onBeforeUnmount, type Ref, type ShallowRef } from 'vue'
import {
  Room,
  RoomEvent,
  ConnectionState,
  DisconnectReason,
  MediaDeviceFailure,
  type RoomOptions,
  type RemoteParticipant,
  type LocalParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type Participant,
} from 'livekit-client'
import { useRuntimeConfig } from '#app'

export interface LiveKitRoomEvent {
  timestamp: number
  type: string
  message: string
}

export interface UseLiveKitRoomReturn {
  room: ShallowRef<Room>
  connectionState: Ref<ConnectionState>
  remoteParticipants: ShallowRef<RemoteParticipant[]>
  localParticipant: ShallowRef<LocalParticipant | undefined>
  activeSpeakers: ShallowRef<Participant[]>
  isReconnecting: Ref<boolean>
  error: Ref<string | null>
  events: Ref<LiveKitRoomEvent[]>
  connect: (token: string, url?: string) => Promise<void>
  disconnect: () => Promise<void>
  clearEvents: () => void
}

/**
 * Composable for managing a LiveKit room connection.
 *
 * @param roomOptions - Optional Room constructor options (adaptiveStream, dynacast, etc.)
 */
export function useLiveKitRoom(roomOptions?: RoomOptions): UseLiveKitRoomReturn {
  const config = useRuntimeConfig()

  const room = shallowRef<Room>(new Room(roomOptions))
  const connectionState = ref<ConnectionState>(ConnectionState.Disconnected)
  const remoteParticipants = shallowRef<RemoteParticipant[]>([])
  const localParticipant = shallowRef<LocalParticipant | undefined>()
  const activeSpeakers = shallowRef<Participant[]>([])
  const isReconnecting = ref(false)
  const error = ref<string | null>(null)
  const events = ref<LiveKitRoomEvent[]>([])

  function addEvent(type: string, message: string) {
    events.value = [...events.value.slice(-49), { timestamp: Date.now(), type, message }]
  }

  function syncParticipants() {
    remoteParticipants.value = Array.from(room.value.remoteParticipants.values())
  }

  function setupListeners(r: Room) {
    r.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      connectionState.value = state
      addEvent('connection', `State changed to: ${state}`)
    })

    r.on(RoomEvent.Connected, () => {
      localParticipant.value = r.localParticipant
      isReconnecting.value = false
      error.value = null
      syncParticipants()
      addEvent('connection', `Connected to room: ${r.name}`)
    })

    r.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      localParticipant.value = undefined
      remoteParticipants.value = []
      activeSpeakers.value = []
      isReconnecting.value = false
      const reasonStr = reason !== undefined ? ` (reason: ${DisconnectReason[reason]})` : ''
      addEvent('connection', `Disconnected${reasonStr}`)
    })

    r.on(RoomEvent.Reconnecting, () => {
      isReconnecting.value = true
      addEvent('connection', 'Reconnecting...')
    })

    r.on(RoomEvent.Reconnected, () => {
      isReconnecting.value = false
      addEvent('connection', 'Reconnected successfully')
    })

    r.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      syncParticipants()
      addEvent('participant', `${participant.identity} joined`)
    })

    r.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      syncParticipants()
      addEvent('participant', `${participant.identity} left`)
    })

    r.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      syncParticipants()
      addEvent('track', `Subscribed to ${track.kind} from ${participant.identity}`)
    })

    r.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      syncParticipants()
      addEvent('track', `Unsubscribed from ${track.kind} of ${participant.identity}`)
    })

    r.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      activeSpeakers.value = speakers
    })

    r.on(RoomEvent.MediaDevicesError, (e: Error) => {
      const failure = MediaDeviceFailure.getFailure(e)
      const msg = failure ? `Device error: ${failure}` : `Device error: ${e.message}`
      error.value = msg
      addEvent('error', msg)
    })

    r.on(RoomEvent.RoomMetadataChanged, (_metadata: string) => {
      addEvent('room', `Room metadata updated`)
    })

    r.on(RoomEvent.SignalConnected, () => {
      addEvent('connection', 'Signal connected')
    })
  }

  setupListeners(room.value)

  async function connect(token: string, url?: string) {
    const wsUrl = url || config.public.livekit.wsUrl
    if (!wsUrl) {
      throw new Error('[nuxt-livekit] No wsUrl configured. Set it in nuxt.config or pass it to connect().')
    }
    error.value = null
    try {
      await room.value.connect(wsUrl, token)
    }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connection failed'
      error.value = msg
      addEvent('error', msg)
      throw e
    }
  }

  async function disconnect() {
    await room.value.disconnect()
  }

  function clearEvents() {
    events.value = []
  }

  onBeforeUnmount(() => {
    room.value.disconnect()
    room.value.removeAllListeners()
  })

  return {
    room,
    connectionState,
    remoteParticipants,
    localParticipant,
    activeSpeakers,
    isReconnecting,
    error,
    events,
    connect,
    disconnect,
    clearEvents,
  }
}
