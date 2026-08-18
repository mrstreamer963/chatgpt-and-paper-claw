import { createApp } from 'vue'
import App from './App.vue'
import { createGameSession, gameSessionKey } from './useGameSession'
import './style.css'
import './missions.css'
import './layout-fix.css'

// Never let Vite preserve an old Vue runtime/state tree across HMR updates.
// A full reload is intentional in development: the game state is owned by
// GameCore and restored only through the versioned autosave path.
if (import.meta.hot) {
  import.meta.hot.accept(() => window.location.reload())
}

async function bootstrap() {
  const session = await createGameSession()
  const app = createApp(App)
  app.provide(gameSessionKey, session)
  app.mount('#app')
  window.addEventListener('beforeunload', session.dispose, { once: true })
}

void bootstrap().catch(error => {
  const root = document.querySelector('#app')
  if (root) root.textContent = error instanceof Error ? error.message : 'Не удалось запустить игровой мир.'
})
