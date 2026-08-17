<script setup lang="ts">
import { ref, watch } from 'vue'
import { canEditCat, type Cat, type State } from '../core/simulation'
import { translate, type Locale } from '../i18n'

const props = defineProps<{ state: State; cat: Cat; locale: Locale }>()
const emit = defineEmits<{ assign: [catId: string, squadId: string] }>()
const tr = (key: string) => translate(props.locale, key)
const draftSquadId = ref(props.cat.assignedTo || '')
let interacting = false
let lastEmittedValue = props.cat.assignedTo || ''

watch(() => props.cat.assignedTo, value => {
  if (!interacting) draftSquadId.value = value || ''
})

function beginInteraction() {
  interacting = true
}

function debugEvent(event: Event) {
  const select = event.currentTarget as HTMLSelectElement
  console.debug('[NLC assignment debug]', {
    event: event.type,
    catId: props.cat.id,
    value: select.value,
    disabled: select.disabled,
    selectedIndex: select.selectedIndex,
    insideDetails: Boolean(select.closest('details')),
    insideSummary: Boolean(select.closest('summary')),
  })
}

function handlePointerDown(event: Event) {
  debugEvent(event)
  beginInteraction()
}

function handleFocus(event: Event) {
  debugEvent(event)
  beginInteraction()
}

function handleChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  draftSquadId.value = value
  if (value === lastEmittedValue) {
    console.debug('[NLC debug] duplicate assignment event skipped', { event: event.type, catId: props.cat.id, value })
    return
  }
  lastEmittedValue = value
  console.debug('[NLC debug] assignment command emitted', { event: event.type, catId: props.cat.id, value })
  console.log('[NLC assign] select change', {
    catId: props.cat.id,
    value,
    disabled: (event.target as HTMLSelectElement).disabled,
    insideDetails: Boolean((event.target as HTMLElement).closest('details')),
    insideSummary: Boolean((event.target as HTMLElement).closest('summary')),
  })
  emit('assign', props.cat.id, value)
}

function finishInteraction() {
  interacting = false
}

</script>

<template>
  <select
    v-model="draftSquadId"
    :disabled="!canEditCat(state, cat.id)"
    :aria-label="tr('Назначение в отряд')"
    @pointerdown="handlePointerDown"
    @mousedown="debugEvent"
    @focus="handleFocus"
    @click="debugEvent"
    @input="handleChange"
    @change="handleChange"
    @blur="finishInteraction"
  >
    <option value="">{{ tr('не назначен') }}</option>
    <option v-for="squad in state.squads" :key="squad.id" :value="squad.id">{{ tr(squad.name) }}</option>
  </select>
</template>
