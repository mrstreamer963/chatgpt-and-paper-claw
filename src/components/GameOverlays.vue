<script setup lang="ts">
import { computed } from 'vue'
import {
  GAME_RULES,
  RESEARCH_RULES,
  STORY_DECISION_BALANCE,
  getRaidOptions,
  type NinthLifeDecision,
  type State,
} from '@nine-lives/game-core'
import { translate, type Locale } from '../i18n'

const props = defineProps<{ state: State; locale: Locale; newGameConfirmOpen: boolean; totalRuns: number }>()
const emit = defineEmits<{
  cancelNewGame: []
  newGame: []
  reset: []
  raidDecision: [action: 'escape' | 'attack' | 'support']
  raidFollowup: [action: 'retreat' | 'continue']
  storyDecision: [decision: NinthLifeDecision]
  continueFinale: []
}>()

const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)
const raidOptions = computed(() => getRaidOptions(props.state))
const primarySquad = computed(() => props.state.squads.find(squad => squad.id === props.state.incident?.primarySquadId))
const supportSquad = computed(() => props.state.squads.find(squad => squad.id === props.state.incident?.supportSquadId))
const storySquad = computed(() => props.state.squads.find(squad => squad.id === props.state.storyIncident?.foundBySquadId))

const storyChoicePresentation: { id: NinthLifeDecision; title: string; tag: string; description: string; tone: string }[] = [
  { id: 'shelter', title: 'Укрыть дезертира', tag: 'Гуманность', description: 'Дать убежище на базе. Слух укрепит имя корпорации, но приведёт преследователей к нашим воротам.', tone: 'danger' },
  { id: 'interrogate', title: 'Допросить', tag: 'Разведданные', description: 'Проверить показания и собрать полное досье на укрепление ежей. Без эскалации в секторе.', tone: 'intel' },
  { id: 'escort', title: 'Сопроводить к границе', tag: 'Безопасность', description: 'Вывести свидетеля из сектора по тихому маршруту. Надёжно, но без громкой победы.', tone: 'safe' },
  { id: 'exploit', title: 'Использовать данные сразу', tag: 'Инициатива', description: 'Не теряя времени, отправить разведку по координатам. Получим новую точку, но раскроем интерес к базе.', tone: 'action' },
]
const storyChoices = storyChoicePresentation.map(choice => ({ ...choice, ...STORY_DECISION_BALANCE[choice.id] }))
</script>

<template>
  <div v-if="newGameConfirmOpen" class="reset-overlay">
    <section class="reset-card" role="dialog" aria-modal="true" aria-labelledby="reset-title">
      <div class="reset-kicker">NINE LIVES CORP · {{ tr('ДАННЫЕ СЕССИИ') }}</div>
      <h1 id="reset-title">{{ tr('reset.title') }}</h1><p>{{ tr('reset.description') }}</p><small>{{ tr('reset.warning') }}</small>
      <div><button @click="emit('cancelNewGame')">{{ tr('reset.cancel') }}</button><button class="reset-confirm" @click="emit('reset')">{{ tr('reset.confirm') }}</button></div>
    </section>
  </div>

  <div v-if="!newGameConfirmOpen && state.incident && state.incident.stage !== 'support_en_route'" class="incident-overlay">
    <section class="incident-card" role="dialog" aria-modal="true" aria-labelledby="incident-title">
      <div class="incident-kicker"><span></span> {{ tr('НЕШТАТНАЯ СИТУАЦИЯ · ВРЕМЯ ОСТАНОВЛЕНО') }}</div>
      <template v-if="state.incident.stage === 'decision'">
        <h1 id="incident-title">{{ tr('Встреча с рейдерами') }}</h1><p>{{ tr('raid.description', { squad: primarySquad?.name ?? '' }) }}</p>
        <div class="incident-facts"><span>{{ tr('ОТРЯД') }} <b>{{ tr('cats.count', { count: primarySquad?.members.length ?? 0 }) }}</b></span><span>{{ tr('ПРОГРЕСС') }} <b>{{ Math.round(GAME_RULES.raidTriggerWork / GAME_RULES.cleanupWork * 100) }}%</b></span><span>{{ tr('НАГРАДА ПОД УГРОЗОЙ') }} <b>{{ tr('scrap.count', { count: GAME_RULES.cleanupRewardScrap }) }}</b></span></div>
        <div class="incident-actions">
          <button class="choice safe" @click="emit('raidDecision', 'escape')"><span><b>{{ tr('Сбежать') }}</b><small>{{ tr('Миссия отменится без добычи и ранений.') }}</small></span><strong>{{ GAME_RULES.guaranteedChance }}%</strong></button>
          <button class="choice" :disabled="!raidOptions?.attack.available" @click="emit('raidDecision', 'attack')"><span><b>{{ tr('Напасть') }}</b><small>{{ tr(raidOptions?.attack.available ? 'Использовать нелетальное оружие и вытеснить рейдеров.' : raidOptions?.attack.reason ?? '') }}</small></span><strong>{{ raidOptions?.attack.chance ? `${raidOptions.attack.chance}%` : tr('ЗАКРЫТО') }}</strong></button>
          <button class="choice support" :disabled="!raidOptions?.support.available" @click="emit('raidDecision', 'support')"><span><b>{{ tr('Укрыться и запросить поддержку') }}</b><small v-if="raidOptions?.support.available">{{ tr('raid.support_description', { squad: raidOptions.support.supportSquadName ?? '', seconds: state.research.nodes.emergency_dispatch.completed ? RESEARCH_RULES.researchedSupportTravelTime : RESEARCH_RULES.supportTravelTime }) }}</small><small v-else>{{ tr(raidOptions?.support.reason ?? '') }}</small></span><strong>{{ raidOptions?.support.chance ? `${raidOptions.support.chance}%` : tr('НЕТ') }}</strong></button>
        </div>
      </template>
      <template v-else>
        <h1 id="incident-title">{{ tr('Поддержка прибыла') }}</h1><p>{{ tr('raid.support_arrived_description', { squad: supportSquad?.name ?? '' }) }}</p>
        <div class="incident-actions followup"><button class="choice safe" @click="emit('raidFollowup', 'retreat')"><span><b>{{ tr('Отступить вместе') }}</b><small>{{ tr('Безопасно уйти без добычи.') }}</small></span><strong>{{ GAME_RULES.guaranteedChance }}%</strong></button><button class="choice support" @click="emit('raidFollowup', 'continue')"><span><b>{{ tr('Продолжить разбор ситуации') }}</b><small>{{ tr('Вытеснить рейдеров и закончить уборку.') }}</small></span><strong>{{ GAME_RULES.guaranteedChance }}%</strong></button></div>
      </template>
    </section>
  </div>

  <div v-if="!newGameConfirmOpen && state.storyIncident && !state.incident" class="story-overlay">
    <section class="story-card" role="dialog" aria-modal="true" aria-labelledby="story-title">
      <div class="case-number"><span>{{ tr('РАССЛЕДОВАНИЕ') }}</span><strong>09</strong></div>
      <div class="story-heading"><div class="story-kicker">{{ tr('ВХОДЯЩЕЕ ДЕЛО · ВРЕМЯ ОСТАНОВЛЕНО') }}</div><h1 id="story-title">{{ tr('Девятая жизнь') }}</h1><p>{{ tr('story.description', { squad: storySquad?.name ?? '' }) }}</p><div class="witness-line"><span>{{ tr('СВИДЕТЕЛЬ') }}</span><b>{{ tr('Позывной «Игла»') }}</b><i>{{ tr('показания не подтверждены') }}</i></div></div>
      <div class="story-choices"><button v-for="(choice, index) in storyChoices" :key="choice.id" class="story-choice" :class="choice.tone" @click="emit('storyDecision', choice.id)"><span class="choice-index">0{{ index + 1 }}</span><span class="choice-copy"><small>{{ tr(choice.tag) }}</small><b>{{ tr(choice.title) }}</b><em>{{ tr(choice.description) }}</em></span><span class="choice-impact"><b>+{{ choice.fame }}</b><small>{{ tr('известность') }}</small><strong :class="{ quiet: !choice.threat }">{{ choice.threat ? `+${choice.threat}` : '±0' }}</strong><small>{{ tr('угроза') }}</small></span></button></div>
      <footer><span>{{ tr('Решение нельзя отменить') }}</span><span>{{ tr('Каждый вариант открывает отдельную будущую ветку') }}</span><button class="story-reset" @click="emit('newGame')">{{ tr('reset.open') }}</button></footer>
    </section>
  </div>

  <div v-if="!newGameConfirmOpen && state.finalSummaryVisible && state.storyResolution" class="final-overlay">
    <section class="final-card" role="dialog" aria-modal="true" aria-labelledby="final-title">
      <div class="final-stamp">{{ tr('ДЕЛО ЗАКРЫТО') }}</div><div class="final-kicker">NINE LIVES CORP · {{ tr('ОПЕРАТИВНАЯ СВОДКА 09') }}</div><h1 id="final-title">{{ tr('Девятая жизнь') }}</h1><p class="final-lead">{{ tr(state.storyResolution.outcome) }}</p>
      <div class="final-metrics"><div><small>{{ tr('ИЗВЕСТНОСТЬ') }}</small><b>{{ state.fame }}</b><span>{{ tr('final.goal_complete', { fame: GAME_RULES.fameGoal }) }}</span></div><div><small>{{ tr('ЛОКАЛЬНАЯ УГРОЗА') }}</small><b>{{ state.threat }}</b><span>{{ tr(state.threat >= GAME_RULES.severeThreat ? 'ВЫСОКАЯ' : state.threat >= GAME_RULES.elevatedThreat ? 'ПОВЫШЕННАЯ' : 'СТАБИЛЬНАЯ') }}</span></div><div><small>{{ tr('УСПЕШНЫЕ УБОРКИ') }}</small><b>{{ totalRuns }}</b><span>{{ tr('АВТОНОМНЫЙ ЦИКЛ РАБОТАЕТ') }}</span></div></div>
      <div class="final-result"><span>{{ tr('ПРИНЯТОЕ РЕШЕНИЕ') }}</span><h2>{{ tr(state.storyResolution.title) }}</h2><p>{{ tr('Открыта будущая ветка:') }} <b>{{ tr(state.storyResolution.branch) }}</b></p><div><i>{{ tr('fame.delta', { fame: state.storyResolution.fameDelta }) }}</i><i :class="{ calm: !state.storyResolution.threatDelta }">{{ tr(state.storyResolution.threatDelta ? 'threat.delta' : 'угроза без изменений', { threat: state.storyResolution.threatDelta }) }}</i></div></div>
      <button class="continue-button" @click="emit('continueFinale')">{{ tr('Продолжить в песочнице') }} <span>→</span></button>
    </section>
  </div>
</template>
