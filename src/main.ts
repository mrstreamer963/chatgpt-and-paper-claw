import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './missions.css'
import './layout-fix.css'

// Never let Vite preserve an old Vue runtime/state tree across HMR updates.
// A full reload is intentional in development: the game state is owned by
// GameCore and restored only through the versioned autosave path.
if (import.meta.hot) {
  import.meta.hot.accept(() => window.location.reload())
}

createApp(App).mount('#app')
