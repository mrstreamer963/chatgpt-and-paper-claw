<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  EQUIPMENT_SLOTS,
  ITEM_DEFINITIONS,
  getEquipmentSelection,
  hasPendingEquipment,
  type Cat,
  type EquipmentSlot,
  type ItemId,
  type State,
} from '../core/simulation'
import { translate, type Locale } from '../i18n'

const props = defineProps<{
  state: State
  cat: Cat
  slot: EquipmentSlot
  locale: Locale
}>()

const emit = defineEmits<{
  equip: [catId: string, slot: EquipmentSlot, itemId?: ItemId]
}>()

const items = ITEM_DEFINITIONS.filter(item => item.slot === props.slot)
const selectedItemId = computed(() => getEquipmentSelection(props.cat, props.slot))
const draftItemId = ref<ItemId | ''>(selectedItemId.value ?? '')
const interacting = ref(false)
let lastEmittedItemId: ItemId | '' = draftItemId.value
const pending = computed(() => hasPendingEquipment(props.cat, props.slot))
const slotName = EQUIPMENT_SLOTS.find(slot => slot.id === props.slot)?.name ?? props.slot
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)

watch(selectedItemId, value => {
  if (!interacting.value) draftItemId.value = value ?? ''
})

function beginInteraction() {
  interacting.value = true
}

function handleChange(event: Event) {
  // Read the committed DOM value.  On native selects the v-model update and
  // the user change listener can run in either order; relying on the local
  // draft here could submit the previous item and make a field edit look
  // like an immediate equipment change.
  const value = (event.target as HTMLSelectElement).value as ItemId | ''
  if (value === lastEmittedItemId) {
    console.debug('[NLC debug] duplicate equipment event skipped', { event: event.type, catId: props.cat.id, slot: props.slot, value })
    return
  }
  lastEmittedItemId = value
  console.debug('[NLC debug] equipment command emitted', { event: event.type, catId: props.cat.id, slot: props.slot, value })
  emit('equip', props.cat.id, props.slot, value || undefined)
}

function finishInteraction() {
  interacting.value = false
}
</script>

<template>
  <label :class="{ pending }">
    <span>{{ tr(slotName) }}</span>
    <select v-model="draftItemId" :disabled="slot === 'suit'" @pointerdown="beginInteraction" @focus="beginInteraction" @change="handleChange" @blur="finishInteraction">
      <option value="">{{ tr(slot === 'suit' ? 'нет предметов в PoC' : 'пусто') }}</option>
      <option v-for="item in items" :key="item.id" :value="item.id" :disabled="state.inventory[item.id] <= 0 && draftItemId !== item.id">{{ tr('item.stock', { item: item.name, count: state.inventory[item.id] }) }}</option>
    </select>
  </label>
</template>
