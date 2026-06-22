export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { roomName, participantName } = body

  if (!roomName || !participantName) {
    throw createError({
      statusCode: 400,
      message: 'roomName and participantName are required',
    })
  }

  const token = await generateLiveKitToken(participantName, roomName, {
    name: participantName,
  })

  // Return wsUrl so the client can connect without needing NUXT_PUBLIC_LIVEKIT_WS_URL
  const { wsUrl } = useRuntimeConfig().livekit
  return { token, wsUrl }
})
