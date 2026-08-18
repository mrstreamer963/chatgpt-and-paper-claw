<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { canEditCat, getCatAssignmentSelection, hasPendingAssignment, type Cat, type State } from '@nine-lives/game-core'
import { translate, type Locale } from '../i18n'

const props = defineProps<{
  state: State
  cat: Cat
  locale: Locale
  assign: (catId: string, squadId: string) => Promise<boolean>
}>()
const tr = (key: string) => translate(props.locale, key)
const draftSquadId = ref(getCatAssignmentSelection(props.cat) || '')
let interacting = false
let pendingAssignment: Promise<void> | undefined
const editable = ref(canEditCat(props.state, props.cat.id))

watch(() => getCatAssignmentSelection(props.cat), value => {
  if (!interacting) draftSquadId.value = value || ''
})
watch(() => canEditCat(props.state, props.cat.id), value => {
  if (!interacting) editable.value = value
})

function beginInteraction() {
  interacting = true
  editable.value = canEditCat(props.state, props.cat.id)
}

async function handleChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  draftSquadId.value = value
  const task = (async () => {
    await props.assign(props.cat.id, value)
    await nextTick()
    draftSquadId.value = getCatAssignmentSelection(props.cat) || ''
  })()
  pendingAssignment = task
  await task
  if (pendingAssignment === task) pendingAssignment = undefined
}

async function finishInteraction() {
  if (pendingAssignment) await pendingAssignment
  interacting = false
  editable.value = canEditCat(props.state, props.cat.id)
  draftSquadId.value = getCatAssignmentSelection(props.cat) || ''
}

</script>

<template>
  <select
    v-model="draftSquadId"
    :class="{ pending: hasPendingAssignment(cat) }"
    :disabled="!editable"
    :aria-label="tr('Назначение в отряд')"
    @pointerdown="beginInteraction"
    @focus="beginInteraction"
    @change="handleChange"
    @blur="finishInteraction"
  >
    <option value="">{{ tr('не назначен') }}</option>
    <option v-for="squad in state.squads" :key="squad.id" :value="squad.id">{{ tr(squad.name) }}</option>
  </select>
</template>
