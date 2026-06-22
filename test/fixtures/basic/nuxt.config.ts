import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    MyModule,
  ],
  livekit: {
    wsUrl: 'ws://localhost:7880',
    apiKey: 'testkey',
    apiSecret: 'testsecret',
  },
})
