export interface LiveKitPublicConfig {
  wsUrl: string
}

export interface LiveKitServerConfig {
  apiKey: string
  apiSecret: string
  wsUrl: string
}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    livekit: LiveKitPublicConfig
  }
  interface RuntimeConfig {
    livekit: LiveKitServerConfig
  }
}
