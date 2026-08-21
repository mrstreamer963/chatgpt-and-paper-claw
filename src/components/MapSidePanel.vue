<script setup lang="ts">
import { GAME_RULES, type Squad, type State } from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'

const props = defineProps<{
  state: State
  locale: Locale
  selectedSquadIds: string[]
  selectedCatIds: string[]
  squadIsAvailable: (squad: Squad) => boolean
  squadCommandReason: (squad: Squad) => string | undefined
  squadEnergy: (squad: Squad) => number
  squadLabel: (squad: Squad) => string
}>()
const emit = defineEmits<{ select: [squad: Squad, event: MouseEvent] }>()
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)
function formatLog(time: number, key: string, params?: Record<string, string | number>) {
  const minutes = 540 + Math.floor(time / 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} · ${tr(key, params)}`
}
</script>

<template>
  <aside>
    <section class="map-squad-list">
      <h2>{{ tr('dispatch.command.squads') }}</h2>
      <p v-if="!state.squads.length" class="empty-squad-list">{{ tr('dispatch.command.no_squads') }}</p>
      <button v-for="squad in state.squads" :key="`command-${squad.id}`" type="button" :class="{ selected: squad.phase === 'base' ? squad.members.every(id => selectedCatIds.includes(id)) : selectedSquadIds.includes(squad.id), available: squadIsAvailable(squad) }" @click="emit('select', squad, $event)">
        <span><b>{{ squadDisplayName(locale, squad) }} <em v-if="squadIsAvailable(squad)">{{ tr('dispatch.command.available') }}</em></b><small>{{ squadLabel(squad) }}</small></span>
        <span><strong class="squad-energy" :class="{ tired: squadCommandReason(squad) === 'dispatch.reason.tired' }">{{ tr('dispatch.command.energy', { energy: squadEnergy(squad) }) }}</strong><small v-if="squadCommandReason(squad) && squadCommandReason(squad) !== 'dispatch.reason.tired'">{{ tr(squadCommandReason(squad)!) }}</small></span>
      </button>
    </section>
    <h2>{{ tr('ОПЕРАТИВНАЯ ЛЕНТА') }}</h2>
    <p class="goal">{{ tr('objective.summary', { fame: GAME_RULES.fameGoal }) }}</p>
    <div class="case-progress" :class="{ done: state.storyResolution }"><span>{{ tr('ДЕЛО 09') }}</span><b>{{ tr(state.storyResolution ? 'ЗАКРЫТО' : state.storyIncident ? 'ТРЕБУЕТ РЕШЕНИЯ' : 'ОЖИДАЕТ СИГНАЛА') }}</b></div>
    <article v-for="(item, index) in state.log" :key="`${index}-${item.time}-${item.key}`">{{ formatLog(item.time, item.key, item.params) }}</article>
  </aside>
</template>
