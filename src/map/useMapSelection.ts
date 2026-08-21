import { computed, ref } from 'vue'

export type MapTarget = { type: 'mission'; missionId: string } | { type: 'base' }

export function useMapSelection() {
  const selectedSquadIds = ref<string[]>([])
  const selectedCatIds = ref<string[]>([])
  const selectedTarget = ref<MapTarget>()
  const commandMessage = ref<string>()
  const mergeSourceSquadId = ref<string>()
  const selectedCount = computed(() => selectedSquadIds.value.length + selectedCatIds.value.length)

  function clearCommand() {
    selectedSquadIds.value = []
    selectedCatIds.value = []
    selectedTarget.value = undefined
    commandMessage.value = undefined
    mergeSourceSquadId.value = undefined
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && (selectedCount.value || selectedTarget.value)) clearCommand()
  }

  return { selectedSquadIds, selectedCatIds, selectedTarget, commandMessage, mergeSourceSquadId, selectedCount, clearCommand, handleEscape }
}
