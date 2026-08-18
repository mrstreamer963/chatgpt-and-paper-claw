<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Squad } from '@nine-lives/game-core'
import { translate, type Locale } from '../i18n'

const props = defineProps<{
  squad: Squad
  locale: Locale
  setStyle: (squadId: string, style: Squad['style']) => Promise<boolean>
}>()
const tr = (key: string) => translate(props.locale, key)
const draftStyle = ref(props.squad.style)
let interacting = false
let pendingStyle: Promise<void> | undefined
const editable = ref(props.squad.phase === 'base')

watch(() => props.squad.style, value => {
  if (!interacting) draftStyle.value = value
})
watch(() => props.squad.phase, phase => {
  if (!interacting) editable.value = phase === 'base'
})

function beginInteraction() {
  interacting = true
  editable.value = props.squad.phase === 'base'
}

async function handleChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as Squad['style']
  draftStyle.value = value
  const task = (async () => {
    await props.setStyle(props.squad.id, value)
    await nextTick()
    draftStyle.value = props.squad.style
  })()
  pendingStyle = task
  await task
  if (pendingStyle === task) pendingStyle = undefined
}

async function finishInteraction() {
  if (pendingStyle) await pendingStyle
  interacting = false
  editable.value = props.squad.phase === 'base'
  draftStyle.value = props.squad.style
}
</script>

<template>
  <select v-model="draftStyle" :disabled="!editable" @pointerdown="beginInteraction" @focus="beginInteraction" @change="handleChange" @blur="finishInteraction">
    <option value="careful">{{ tr('careful') }}</option>
    <option value="balanced">{{ tr('balanced') }}</option>
    <option value="risky">{{ tr('risky') }}</option>
  </select>
</template>
