<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  EQUIPMENT_SLOTS,
  ITEM_DEFINITIONS,
  getEquipmentSelection,
  hasPendingEquipment,
  type Cat,
  type EquipmentSlot,
  type ItemId,
  type State,
} from '@nine-lives/game-core'
import { translate, type Locale } from '../i18n'

const props = defineProps<{
  state: State
  cat: Cat
  slot: EquipmentSlot
  locale: Locale
  equip: (catId: string, slot: EquipmentSlot, itemId?: ItemId) => Promise<boolean>
}>()

const items = ITEM_DEFINITIONS.filter(item => item.slot === props.slot)
const selectedItemId = computed(() => getEquipmentSelection(props.cat, props.slot))
const draftItemId = ref<ItemId | ''>(selectedItemId.value ?? '')
let submittedItemId: ItemId | '' = draftItemId.value
let pendingCommit: Promise<void> | undefined
const interacting = ref(false)
const visibleInventory = ref({ ...props.state.inventory })
const visibleInventoryKey = computed(() => items.map(item => `${item.id}:${visibleInventory.value[item.id]}`).join('|'))
const pending = computed(() => hasPendingEquipment(props.cat, props.slot))
const slotName = EQUIPMENT_SLOTS.find(slot => slot.id === props.slot)?.name ?? props.slot
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)

watch(selectedItemId, value => {
  submittedItemId = value ?? ''
  if (!interacting.value) draftItemId.value = value ?? ''
})
watch(() => items.map(item => props.state.inventory[item.id]), () => {
  if (!interacting.value) visibleInventory.value = { ...props.state.inventory }
})

function beginInteraction() {
  if (interacting.value) return
  interacting.value = true
  if (import.meta.env.DEV) console.info('[NLC equipment:UI] interaction-start', {
    catId: props.cat.id,
    slot: props.slot,
    sleeping: props.cat.sleeping,
    energy: props.cat.energy,
    assignedTo: props.cat.assignedTo,
    squadPhase: props.state.squads.find(squad => squad.id === props.cat.assignedTo)?.phase ?? 'base',
    selectedItemId: selectedItemId.value ?? null,
    inventory: { ...visibleInventory.value },
  })
}

async function commitSelection(event: Event, source: 'input' | 'change' | 'blur') {
  // Firefox can defer a native select's `change` until focus leaves the
  // control. Always read the DOM value and use blur as a final commit path.
  const select = event.target as HTMLSelectElement
  const value = select.value as ItemId | ''
  if (value === submittedItemId) {
    if (import.meta.env.DEV) console.info('[NLC equipment:UI] commit-skipped', {
      source,
      catId: props.cat.id,
      slot: props.slot,
      domValue: value || null,
      reason: 'already-submitted',
    })
    return
  }
  submittedItemId = value
  if (import.meta.env.DEV) console.info('[NLC equipment:UI] commit', {
    source,
    event: event.type,
    catId: props.cat.id,
    slot: props.slot,
    sleeping: props.cat.sleeping,
    energy: props.cat.energy,
    domValue: value || null,
    selectedItemId: selectedItemId.value ?? null,
    selectedIndex: select.selectedIndex,
    selectedOptionDisabled: select.selectedOptions[0]?.disabled ?? null,
    selectDisabled: select.disabled,
    inventory: { ...visibleInventory.value },
  })
  draftItemId.value = value
  await props.equip(props.cat.id, props.slot, value || undefined)
  await nextTick()
  draftItemId.value = selectedItemId.value ?? ''
  submittedItemId = selectedItemId.value ?? ''
  if (import.meta.env.DEV) console.info('[NLC equipment:UI] reconciled', {
    source,
    catId: props.cat.id,
    slot: props.slot,
    sleeping: props.cat.sleeping,
    domValue: select.value || null,
    selectedItemId: selectedItemId.value ?? null,
    pending: pending.value,
    inventory: { ...props.state.inventory },
  })
}

function handleSelection(event: Event) {
  if ((event.target as HTMLSelectElement).value === submittedItemId) return
  const task = commitSelection(event, event.type === 'input' ? 'input' : 'change')
  pendingCommit = task
  void task.finally(() => { if (pendingCommit === task) pendingCommit = undefined })
}

async function finishInteraction(event: FocusEvent) {
  const select = event.target as HTMLSelectElement
  if (select.value !== submittedItemId) await commitSelection(event, 'blur')
  else if (pendingCommit) await pendingCommit
  if (import.meta.env.DEV) console.info('[NLC equipment:UI] interaction-end', {
    catId: props.cat.id,
    slot: props.slot,
    domValue: select.value || null,
    selectedItemId: selectedItemId.value ?? null,
  })
  interacting.value = false
  visibleInventory.value = { ...props.state.inventory }
  draftItemId.value = selectedItemId.value ?? ''
  submittedItemId = selectedItemId.value ?? ''
}
</script>

<template>
  <label :class="{ pending }">
    <span>{{ tr(slotName) }}</span>
    <select v-memo="[draftItemId, visibleInventoryKey]" :value="draftItemId" :disabled="slot === 'suit'" @pointerdown="beginInteraction" @focus="beginInteraction" @input="handleSelection" @change="handleSelection" @blur="finishInteraction">
      <option value="">{{ tr(slot === 'suit' ? 'нет предметов в PoC' : 'пусто') }}</option>
      <option v-for="item in items" :key="item.id" :value="item.id" :disabled="visibleInventory[item.id] <= 0 && draftItemId !== item.id">{{ tr('item.stock', { item: item.name, count: visibleInventory[item.id] }) }}</option>
    </select>
  </label>
</template>
