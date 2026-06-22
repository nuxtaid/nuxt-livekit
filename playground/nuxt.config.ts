export default defineNuxtConfig({
  modules: ['../src/module', '@nuxt/ui'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  compatibilityDate: 'latest',

  // LiveKit config — values are overridden at runtime by env vars:
  // NUXT_LIVEKIT_WS_URL, NUXT_LIVEKIT_API_KEY, NUXT_LIVEKIT_API_SECRET
  livekit: {},
})
