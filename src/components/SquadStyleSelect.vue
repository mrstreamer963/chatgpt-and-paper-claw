<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Squad } from '../core/simulation'
import { translate, type Locale } from '../i18n'

const props = defineProps<{ squad: Squad; locale: Locale }>()
const emit = defineEmits<{ style: [squadId: string, style: Squad['style']] }>()
const tr = (key: string) => translate(props.locale, key)
const draftStyle = ref(props.squad.style)
let interacting = false
let lastEmittedStyle = props.squad.style

watch(() => props.squad.style, value => {
  if (!interacting) draftStyle.value = value
})

function beginInteraction() {
  interacting = true
}

function handleChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as Squad['style']
  draftStyle.value = value
  if (value === lastEmittedStyle) {
    console.debug('[NLC debug] duplicate style event skipped', { event: event.type, squadId: props.squad.id, value })
    return
  }
  lastEmittedStyle = value
  console.debug('[NLC debug] style command emitted', { event: event.type, squadId: props.squad.id, value })
  emit('style', props.squad.id, value)
}

function finishInteraction() {
  interacting = false
}
</script>

<template>
  <select v-model="draftStyle" :disabled="squad.phase !== 'base'" @pointerdown="beginInteraction" @focus="beginInteraction" @input="handleChange" @change="handleChange" @blur="finishInteraction">
    <option value="careful">{{ tr('careful') }}</option>
    <option value="balanced">{{ tr('balanced') }}</option>
    <option value="risky">{{ tr('risky') }}</option>
  </select>
</template>
