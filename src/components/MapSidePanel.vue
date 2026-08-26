<script setup lang="ts">
import { GAME_RULES, type Squad, type State } from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'

const props = defineProps<{
  state: State
  locale: Locale
  selectedSquadIds: string[]
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
function storyStatus() {
  if (props.state.storyResolution) return 'ЗАКРЫТО'
  if (props.state.storyIncident) return `story.status.${props.state.storyIncident.stage}`
  return 'ОЖИДАЕТ СИГНАЛА'
}
function squadMembersText(squad: Squad) {
  const names = squad.members
    .map(memberId => props.state.cats.find(cat => cat.id === memberId))
    .filter((cat): cat is State['cats'][number] => Boolean(cat))
    .map(cat => tr(cat.name))
  return names.join(' · ')
}
</script>

<template>
  <aside>
    <section class="map-squad-list">
      <h2>{{ tr('dispatch.command.squads') }}</h2>
      <p v-if="!state.squads.length" class="empty-squad-list">{{ tr('dispatch.command.no_squads') }}</p>
      <button v-for="squad in state.squads" :key="`command-${squad.id}`" type="button" :class="{ selected: selectedSquadIds.includes(squad.id), available: squadIsAvailable(squad) }" @click="emit('select', squad, $event)">
        <span><b>{{ squadDisplayName(locale, squad) }} <em v-if="squadIsAvailable(squad)">{{ tr('dispatch.command.available') }}</em></b><small>{{ squadLabel(squad) }}</small><small v-if="squad.members.length" class="squad-member-names">{{ squadMembersText(squad) }}</small></span>
        <span><strong class="squad-energy" :class="{ tired: squadCommandReason(squad) === 'dispatch.reason.tired' }">{{ tr('dispatch.command.energy', { energy: squadEnergy(squad) }) }}</strong><small v-if="squadCommandReason(squad) && squadCommandReason(squad) !== 'dispatch.reason.tired'">{{ tr(squadCommandReason(squad)!) }}</small></span>
      </button>
    </section>
    <h2>{{ tr('ОПЕРАТИВНАЯ ЛЕНТА') }}</h2>
    <p class="goal">{{ tr('objective.summary', { fame: GAME_RULES.fameGoal }) }}</p>
    <div class="case-progress" :class="{ done: state.storyResolution }"><span>{{ tr('ДЕЛО 09') }}</span><b>{{ tr(storyStatus()) }}</b></div>
    <div v-if="state.urgentOperation && state.urgentOperation.status !== 'pending'" class="case-progress" :class="{ done: state.urgentOperation.status === 'completed' }"><span>{{ tr('urgent.water_filters.short') }}</span><b>{{ tr(`urgent.status.${state.urgentOperation.status}`) }}</b></div>
    <article v-for="(item, index) in state.log" :key="`${index}-${item.time}-${item.key}`">{{ formatLog(item.time, item.key, item.params) }}</article>
  </aside>
</template>
