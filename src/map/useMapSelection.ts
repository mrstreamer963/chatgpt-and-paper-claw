import { computed, ref } from 'vue'

export type MapTarget = { type: 'mission'; missionId: string } | { type: 'base' }

export function useMapSelection() {
  const selectedSquadIds = ref<string[]>([])
  const selectedTarget = ref<MapTarget>()
  const commandMessage = ref<string>()
  const selectedCount = computed(() => selectedSquadIds.value.length)

  function clearCommand() {
    selectedSquadIds.value = []
    selectedTarget.value = undefined
    commandMessage.value = undefined
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && (selectedCount.value || selectedTarget.value)) clearCommand()
  }

  return { selectedSquadIds, selectedTarget, commandMessage, selectedCount, clearCommand, handleEscape }
}
