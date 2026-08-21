<script setup lang="ts">
import { computed } from 'vue'
import { type Cat, type Squad, type State } from '@nine-lives/game-core'
import { formationOffsets } from '../map/formation'
import { projectSquads } from '../map/mapProjection'

const props = defineProps<{ state: State; selectedSquadIds: string[]; squadStyle: (squad: Squad) => Record<string, string>; squadIsAvailable: (squad: Squad) => boolean; fieldCatTooltip: (squad: Squad, memberId: string) => string; squadColor: (squad: Squad) => string; fieldCat: (squad: Squad, memberId: string) => Cat | undefined; catTokensUrl: string; squadPalette: string[] }>()
const emit = defineEmits<{ select: [squad: Squad, event: MouseEvent] }>()
const projections = computed(() => projectSquads(props.state, props.selectedSquadIds, props.squadPalette).filter(view => view.squad.phase !== 'base'))
function members(squad: Squad) { return squad.members.map((id, index) => ({ id, ...formationOffsets(squad.members.length)[index] })) }
</script>

<template>
  <template v-for="view in projections" :key="view.squad.id">
    <span v-if="view.selected" class="squad-marker-origin" :style="{ ...squadStyle(view.squad), '--squad-color': view.color }" aria-hidden="true"></span>
    <div class="squad-formation" :class="[view.squad.phase, view.squad.id, { selected: view.selected, available: squadIsAvailable(view.squad) }]" :style="squadStyle(view.squad)" :data-squad-id="view.squad.id">
      <button v-for="member in members(view.squad)" :key="member.id" type="button" class="field-cat-marker" :class="{ injured: fieldCat(view.squad, member.id)?.injuredRemaining }" :style="{ left: `${member.x}px`, top: `${member.y}px` }" :data-cat-id="member.id" :aria-label="fieldCatTooltip(view.squad, member.id)" :title="fieldCatTooltip(view.squad, member.id)" @click.stop="emit('select', view.squad, $event)"><span aria-hidden="true"></span><svg viewBox="0 0 64 64" aria-hidden="true"><use :href="`${props.catTokensUrl}#token-${member.id}`" /></svg></button>
    </div>
  </template>
</template>
