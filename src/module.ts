import { defineNuxtModule, createResolver, addImportsDir, addServerImportsDir } from '@nuxt/kit'
import { defu } from 'defu'

export interface ModuleOptions {
  /**
   * LiveKit WebSocket URL (e.g. wss://your-project.livekit.cloud)
   */
  wsUrl: string

  /**
   * LiveKit API Key (server-only, used for token generation)
   */
  apiKey: string

  /**
   * LiveKit API Secret (server-only, used for token generation)
   */
  apiSecret: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-livekit',
    configKey: 'livekit',
  },
  defaults: {
    wsUrl: '',
    apiKey: '',
    apiSecret: '',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Use defu so that env var overrides (NUXT_LIVEKIT_*) and
    // user-defined runtimeConfig take precedence over module defaults.

    // Private runtime config (server-only)
    // Env mapping: NUXT_LIVEKIT_WS_URL, NUXT_LIVEKIT_API_KEY, NUXT_LIVEKIT_API_SECRET
    nuxt.options.runtimeConfig.livekit = defu(
      nuxt.options.runtimeConfig.livekit as Record<string, unknown>,
      {
        wsUrl: options.wsUrl,
        apiKey: options.apiKey,
        apiSecret: options.apiSecret,
      },
    )

    // Public runtime config (available on client + server)
    // Env mapping: NUXT_PUBLIC_LIVEKIT_WS_URL
    nuxt.options.runtimeConfig.public.livekit = defu(
      nuxt.options.runtimeConfig.public.livekit as Record<string, unknown>,
      {
        wsUrl: options.wsUrl,
      },
    )

    // Auto-import client composables
    addImportsDir(resolver.resolve('./runtime/composables'))

    // Auto-import server utilities
    addServerImportsDir(resolver.resolve('./runtime/server/utils'))

    // Transpile livekit-client for SSR compatibility
    nuxt.options.build.transpile.push('livekit-client')
  },
})
