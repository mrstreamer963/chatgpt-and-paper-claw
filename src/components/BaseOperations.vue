<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  EQUIPMENT_SLOTS,
  GAME_RULES,
  ITEM_DEFINITIONS,
  RESEARCH_DEFINITIONS,
  RESEARCH_RULES,
  canEditCat,
  getResearchWorker,
  getSquadCleanupForecast,
  type Achievement,
  type EquipmentSlot,
  type ItemId,
  type ResearchId,
  type Squad,
  type State,
} from '../core/simulation'
import { translate, type Locale } from '../i18n'
import baseCutawayUrl from '../../assets/art/base-cutaway-v1.webp?url'
import catTokensUrl from '../../assets/art/cat-tokens.svg?url'
import uiIconsUrl from '../../assets/art/ui-icons.svg?url'
import portraitMarloweUrl from '../../assets/art/portrait-marlowe-v1.webp?url'
import portraitPixelUrl from '../../assets/art/portrait-pixel-v1.webp?url'
import portraitRustUrl from '../../assets/art/portrait-rust-v1.webp?url'
import portraitShorokhUrl from '../../assets/art/portrait-shorokh-v1.webp?url'
import portraitBastionUrl from '../../assets/art/portrait-bastion-v1.webp?url'
import portraitMyataUrl from '../../assets/art/portrait-myata-v1.webp?url'

type BasePanel = 'teams' | 'lab' | 'achievements'
type SaveStatus = { key: string; params?: Record<string, string | number> }

const props = defineProps<{
  state: State
  locale: Locale
  panel: BasePanel
  achievements: Achievement[]
  completedAchievementCount: number
  nextAchievement?: Achievement
  hintsVisible: boolean
  totalRuns: number
  saveStatus: SaveStatus
}>()

const emit = defineEmits<{
  panel: [panel: BasePanel]
  assign: [catId: string, squadId: string]
  equip: [catId: string, slot: EquipmentSlot, itemId?: ItemId]
  style: [squadId: string, style: Squad['style']]
  research: [researchId?: ResearchId]
  hints: [visible: boolean]
  exportSave: []
  importSave: [event: Event]
  newGame: []
}>()

const saveInput = ref<HTMLInputElement>()
const researchWorker = computed(() => getResearchWorker(props.state))
const portraitUrls: Record<string, string> = {
  marlowe: portraitMarloweUrl,
  pixel: portraitPixelUrl,
  rust: portraitRustUrl,
  shorokh: portraitShorokhUrl,
  bastion: portraitBastionUrl,
  myata: portraitMyataUrl,
}
const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)

function handleAssignment(catId: string, event: Event) {
  emit('assign', catId, (event.target as HTMLSelectElement).value)
}

function handleEquipment(catId: string, slot: EquipmentSlot, event: Event) {
  const value = (event.target as HTMLSelectElement).value as ItemId | ''
  emit('equip', catId, slot, value || undefined)
}

function handleSquadStyle(squadId: string, event: Event) {
  emit('style', squadId, (event.target as HTMLSelectElement).value as Squad['style'])
}

function equipmentOptions(slot: EquipmentSlot) {
  return ITEM_DEFINITIONS.filter(item => item.slot === slot)
}

function researchPercent(researchId: ResearchId) {
  return Math.min(100, Math.round(props.state.research.nodes[researchId].progress / RESEARCH_RULES.duration * 100))
}

function catTraitText(cat: State['cats'][number]) {
  if (cat.id === 'marlowe') return tr('cat.trait.bonus', { trait: 'Деэскалация', bonus: cat.supportTrait, action: 'поддержке' })
  if (cat.id === 'pixel') return tr('cat.trait.bonus', { trait: 'Самодиагностика', bonus: cat.cleanupTrait, action: 'уборке' })
  if (cat.id === 'rust') return tr('cat.trait.bonus', { trait: 'Тяжёлая работа', bonus: cat.cleanupTrait, action: 'уборке' })
  if (cat.id === 'shorokh') return tr('cat.trait.bonus', { trait: 'Паранойя', bonus: cat.supportTrait, action: 'поддержке' })
  if (cat.id === 'bastion') return tr('cat.trait.bonus', { trait: 'Силовой ответ', bonus: cat.attackTrait, action: 'нападению' })
  if (cat.id === 'myata') return tr('cat.trait.reduction', { trait: 'Бережёт команду', bonus: cat.injuryTrait, action: 'ранению' })
  return ''
}

function baseCatStyle(cat: State['cats'][number], index: number) {
  const lane = index % 3
  if (cat.assignedTo) {
    const squad = props.state.squads.find(candidate => candidate.id === cat.assignedTo)
    if (squad && squad.phase !== 'base') return { left: '50%', top: '50%', opacity: 0 }
  }
  const positions = cat.injuredRemaining > 0
    ? [{ left: 66, top: 68 }, { left: 76, top: 71 }, { left: 86, top: 67 }]
    : researchWorker.value?.id === cat.id
      ? [{ left: 14, top: 63 }, { left: 24, top: 66 }, { left: 34, top: 62 }]
      : cat.assignedTo
        ? [{ left: 61, top: 29 }, { left: 73, top: 32 }, { left: 85, top: 28 }]
        : [{ left: 13, top: 29 }, { left: 24, top: 32 }, { left: 35, top: 28 }]
  const position = positions[lane]
  return { left: `${position.left}%`, top: `${position.top}%`, opacity: 1 }
}
</script>

<template>
  <section class="base-view">
    <div class="cutaway">
      <div class="base-artboard" :style="{ backgroundImage: `url(${baseCutawayUrl})` }">
        <button class="room control" :class="{ selected: panel === 'achievements' }" @click="emit('panel', 'achievements')"><span>{{ tr('ДИСПЕТЧЕРСКАЯ') }}</span><small>{{ tr('base.achievement_summary', { completed: completedAchievementCount, total: achievements.length, cleanups: totalRuns }) }}</small></button>
        <button class="room lab" :class="{ selected: panel === 'lab' }" @click="emit('panel', 'lab')"><span>{{ tr('ЛАБОРАТОРИЯ') }}</span><small v-if="state.research.activeId">{{ researchWorker ? tr(researchWorker.name) : tr('Нет исполнителя') }} · {{ researchPercent(state.research.activeId) }}%</small><small v-else>{{ tr('research.count', { completed: Object.values(state.research.nodes).filter(node => node.completed).length, total: RESEARCH_DEFINITIONS.length }) }}</small></button>
        <button class="room garage" :class="{ selected: panel === 'teams' }" @click="emit('panel', 'teams')"><span>{{ tr('ГАРАЖ И АРСЕНАЛ') }}</span><small>{{ tr('base.garage_summary', { squads: state.squads.filter(squad => squad.phase === 'base').length, total: state.squads.length, items: Object.values(state.inventory).reduce((sum, count) => sum + count, 0) }) }}</small></button>
        <svg v-for="(cat, index) in state.cats" :key="`base-${cat.id}`" class="base-cat-token" :class="{ injured: cat.injuredRemaining > 0, away: cat.assignedTo && state.squads.find(squad => squad.id === cat.assignedTo)?.phase !== 'base' }" :style="baseCatStyle(cat, index)" viewBox="0 0 64 64" :aria-label="tr(cat.name)"><use :href="`${catTokensUrl}#token-${cat.id}`" /></svg>
      </div>
    </div>

    <aside v-if="panel === 'teams'" class="roster base-panel">
      <div class="panel-tabs"><button class="active" @click="emit('panel', 'teams')">{{ tr('Состав / склад') }}</button><button @click="emit('panel', 'lab')">{{ tr('Лаборатория') }}</button><button @click="emit('panel', 'achievements')">{{ tr('Достижения') }}</button></div>
      <h2>{{ tr('СОСТАВ И ЭКИПИРОВКА') }}</h2>
      <p class="roster-hint">{{ tr('Любое изменение ставит время на паузу. Состав и снаряжение отряда в поле заблокированы.') }}</p>
      <div v-for="squad in state.squads" :key="squad.id" class="squad-status squad-config">
        <div><b>{{ tr(squad.name) }}</b><span>{{ tr('squad.cleanup_forecast', { cats: squad.members.length, chance: getSquadCleanupForecast(state, squad).total }) }}</span></div>
        <select :value="squad.style" :disabled="squad.phase !== 'base'" @change="handleSquadStyle(squad.id, $event)"><option value="careful">{{ tr('careful') }}</option><option value="balanced">{{ tr('balanced') }}</option><option value="risky">{{ tr('risky') }}</option></select>
        <details class="forecast-breakdown">
          <summary>{{ tr(squad.members.length ? 'forecast.details' : 'forecast.empty') }}</summary>
          <template v-if="squad.members.length">
            <span>{{ tr('forecast.base') }} <b>+{{ getSquadCleanupForecast(state, squad).base }}</b></span>
            <span>{{ tr('forecast.skills') }} <b>+{{ getSquadCleanupForecast(state, squad).skill }}</b></span>
            <span>{{ tr('forecast.traits') }} <b>+{{ getSquadCleanupForecast(state, squad).traits }}</b></span>
            <span>{{ tr('forecast.equipment') }} <b>+{{ getSquadCleanupForecast(state, squad).equipment }}</b></span>
            <span v-if="getSquadCleanupForecast(state, squad).fatigue">{{ tr('forecast.fatigue') }} <b>−{{ getSquadCleanupForecast(state, squad).fatigue }}</b></span>
          </template>
        </details>
      </div>
      <details v-for="cat in state.cats" :key="cat.id" class="cat-card" :class="{ injured: cat.injuredRemaining > 0 }">
        <summary><img :src="portraitUrls[cat.id]" :alt="tr(cat.name)"><span><b>{{ tr(cat.name) }}</b><small v-if="cat.injuredRemaining > 0" class="injury-label">{{ tr('cat.injured', { seconds: Math.ceil(cat.injuredRemaining) }) }}</small><small v-else>{{ tr('cat.energy', { role: cat.role, energy: Math.round(cat.energy) }) }}</small></span><select :value="cat.assignedTo || ''" :disabled="!canEditCat(state, cat.id)" :aria-label="tr('Назначение в отряд')" @click.stop @change="handleAssignment(cat.id, $event)"><option value="">{{ tr('не назначен') }}</option><option v-for="squad in state.squads" :key="squad.id" :value="squad.id" :disabled="squad.phase !== 'base'">{{ tr(squad.name) }}</option></select></summary>
        <div class="cat-trait"><span>{{ catTraitText(cat) }}</span><small>{{ tr('cat.stats', { combat: cat.combat, tech: cat.tech, perception: cat.perception, scouting: cat.scouting }) }}</small></div>
        <div class="equipment-grid"><label v-for="slot in EQUIPMENT_SLOTS" :key="slot.id"><span>{{ tr(slot.name) }}</span><select :value="cat.equipment[slot.id] || ''" :disabled="!canEditCat(state, cat.id) || slot.id === 'suit'" @change="handleEquipment(cat.id, slot.id, $event)"><option value="">{{ tr(slot.id === 'suit' ? 'нет предметов в PoC' : 'пусто') }}</option><option v-for="item in equipmentOptions(slot.id)" :key="item.id" :value="item.id" :disabled="state.inventory[item.id] <= 0 && cat.equipment[slot.id] !== item.id">{{ tr('item.stock', { item: item.name, count: state.inventory[item.id] }) }}</option></select></label></div>
      </details>
      <section class="warehouse"><h3>{{ tr('СКЛАД') }}</h3><div v-for="item in ITEM_DEFINITIONS" :key="item.id" :class="{ empty: state.inventory[item.id] === 0 }"><svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true"><use :href="`${uiIconsUrl}#icon-${item.id}`" /></svg><span><b>{{ tr(item.name) }}</b><small>{{ tr(item.effect) }}</small></span><strong>×{{ state.inventory[item.id] }}</strong></div></section>
    </aside>

    <aside v-else-if="panel === 'lab'" class="base-panel laboratory-panel">
      <div class="panel-tabs"><button @click="emit('panel', 'teams')">{{ tr('Состав / склад') }}</button><button class="active" @click="emit('panel', 'lab')">{{ tr('Лаборатория') }}</button><button @click="emit('panel', 'achievements')">{{ tr('Достижения') }}</button></div>
      <h2>{{ tr('ЛАБОРАТОРИЯ') }}</h2>
      <div class="lab-status"><span>{{ tr('ИСПОЛНИТЕЛЬ') }}</span><b>{{ researchWorker ? tr(researchWorker.name) : tr(state.research.activeId ? 'Нет доступного кота' : 'Не назначен') }}</b><small v-if="researchWorker">{{ tr('worker.stats', { tech: researchWorker.tech, energy: Math.round(researchWorker.energy) }) }}</small><small v-else>{{ tr('research.worker_requirement', { energy: GAME_RULES.minimumResearchEnergy }) }}</small></div>
      <p class="roster-hint">{{ tr('research.rules', { seconds: RESEARCH_RULES.duration, scrap: RESEARCH_RULES.scrapCost }) }}</p>
      <article v-for="research in RESEARCH_DEFINITIONS" :key="research.id" class="research-card" :class="{ active: state.research.activeId === research.id, complete: state.research.nodes[research.id].completed }"><header><span>{{ tr(state.research.nodes[research.id].completed ? 'ЗАВЕРШЕНО' : state.research.activeId === research.id ? 'В РАБОТЕ' : 'ДОСТУПНО') }}</span><strong>{{ researchPercent(research.id) }}%</strong></header><h3>{{ tr(research.name) }}</h3><p>{{ tr(research.result) }}</p><div class="research-progress"><i :style="{ width: `${researchPercent(research.id)}%` }"></i></div><footer><span>{{ tr('research.scrap', { spent: state.research.nodes[research.id].scrapSpent, cost: RESEARCH_RULES.scrapCost }) }}</span><button v-if="!state.research.nodes[research.id].completed" :class="{ active: state.research.activeId === research.id }" @click="emit('research', state.research.activeId === research.id ? undefined : research.id)">{{ tr(state.research.activeId === research.id ? 'Приостановить' : 'Исследовать') }}</button></footer></article>
    </aside>

    <aside v-else class="base-panel achievements-panel">
      <div class="panel-tabs"><button @click="emit('panel', 'teams')">{{ tr('Состав / склад') }}</button><button @click="emit('panel', 'lab')">{{ tr('Лаборатория') }}</button><button class="active" @click="emit('panel', 'achievements')">{{ tr('Достижения') }}</button></div>
      <div class="achievement-heading"><span>{{ tr('ДОСЬЕ КОРПОРАЦИИ · ОТКРЫТЫЕ') }}</span><h2>{{ tr('ОПЕРАТИВНЫЕ ДОСТИЖЕНИЯ') }}</h2><p>{{ tr('Эти ориентиры ведут по основному циклу текущего сценария.') }}</p></div>
      <div class="achievement-summary"><strong>{{ completedAchievementCount }}</strong><span>{{ tr('achievement.completed_count', { total: achievements.length }) }}</span><div><i :style="{ width: `${completedAchievementCount / achievements.length * 100}%` }"></i></div></div>
      <article v-for="(achievement, index) in achievements" :key="achievement.id" class="achievement-row" :class="{ complete: achievement.completed, current: nextAchievement?.id === achievement.id }"><span class="achievement-mark">{{ achievement.completed ? '✓' : String(index + 1).padStart(2, '0') }}</span><div><small>{{ tr(achievement.completed ? 'ВЫПОЛНЕНО' : nextAchievement?.id === achievement.id ? 'ТЕКУЩАЯ ЦЕЛЬ' : 'ОТКРЫТО') }}</small><b>{{ tr(achievement.title) }}</b><p>{{ tr(achievement.description) }}</p></div></article>
      <button class="hint-setting" @click="emit('hints', !hintsVisible)">{{ tr(hintsVisible ? 'Скрыть контекстные подсказки' : 'Показывать контекстные подсказки') }}</button>
      <section class="save-controls"><header><span>{{ tr('ДАННЫЕ СЕССИИ') }}</span><i></i></header><p>{{ tr(saveStatus.key, saveStatus.params) }}</p><div><button @click="emit('exportSave')">{{ tr('Выгрузить JSON') }}</button><button @click="saveInput?.click()">{{ tr('Загрузить JSON') }}</button></div><button class="new-game-button" @click="emit('newGame')">{{ tr('reset.open') }}</button><input ref="saveInput" type="file" accept=".json,application/json" @change="emit('importSave', $event)"></section>
    </aside>
  </section>
</template>
