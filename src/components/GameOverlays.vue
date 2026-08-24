<script setup lang="ts">
import { computed } from 'vue'
import {
  GAME_RULES,
  RESEARCH_RULES,
  getNinthLifeChoicePreviews,
  getNinthLifeVerificationOptions,
  getRaidOptions,
  type NinthLifeDecision,
  type NinthLifeFactId,
  type NinthLifeVerification,
  type State,
} from '@nine-lives/game-core'
import { squadDisplayName, translate, type Locale } from '../i18n'

const props = defineProps<{ state: State; locale: Locale; newGameConfirmOpen: boolean; totalRuns: number }>()
const emit = defineEmits<{
  cancelNewGame: []
  newGame: []
  reset: []
  raidDecision: [action: 'escape' | 'attack' | 'support', supportSquadId?: string]
  raidFollowup: [action: 'retreat' | 'continue']
  storyDecision: [decision: NinthLifeDecision]
  storyVerify: [verification: NinthLifeVerification]
  continueFinale: []
}>()

const tr = (key: string, params?: Record<string, string | number>) => translate(props.locale, key, params)
const raidOptions = computed(() => getRaidOptions(props.state))
const incidentSquads = computed(() => props.state.incident?.participantSquadIds
  .map(id => props.state.squads.find(squad => squad.id === id)).filter(Boolean) ?? [])
const supportSquad = computed(() => props.state.squads.find(squad => squad.id === props.state.incident?.supportSquadId))
const storySquads = computed(() => props.state.storyIncident?.participantSquadIds
  .map(id => props.state.squads.find(squad => squad.id === id)).filter(Boolean) ?? [])
const squadName = (squad?: State['squads'][number]) => squad ? squadDisplayName(props.locale, squad) : ''
const squadNames = (squads: (State['squads'][number] | undefined)[]) => squads.filter(Boolean).map(squad => squadName(squad)).join(', ')

function supportMembers(memberIds: string[]) {
  return memberIds
    .map(id => props.state.cats.find(cat => cat.id === id))
    .filter(Boolean)
    .map(cat => tr(cat!.name))
    .join(', ')
}

const storyChoices = computed(() => getNinthLifeChoicePreviews(props.state))
const verificationOptions = computed(() => getNinthLifeVerificationOptions(props.state))
const factLabels: Record<NinthLifeFactId, string> = {
  deserter_identity: 'story.fact.deserter_identity',
  pursuit: 'story.fact.pursuit',
  base_coordinates: 'story.fact.base_coordinates',
  border_route: 'story.fact.border_route',
}
const finalParticipants = computed(() => props.state.storyResolution?.participantCatIds?.map(id => props.state.cats.find(cat => cat.id === id)).filter(Boolean).map(cat => tr(cat!.name)).join(', ') || tr('final.story.unknown_participants'))
const finalConfirmedFacts = computed(() => props.state.storyResolution?.facts?.filter(fact => fact.quality === 'confirmed').length ?? 0)
const finalVerifiedFacts = computed(() => props.state.storyResolution?.facts?.filter(fact => ['confirmed', 'estimate'].includes(fact.quality)).length ?? 0)
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
        <h1 id="incident-title">{{ tr('Встреча с рейдерами') }}</h1><p>{{ tr('raid.description', { squad: squadNames(incidentSquads) }) }}</p>
        <div class="incident-facts"><span>{{ tr('ОТРЯДЫ') }} <b>{{ tr('cats.count', { count: incidentSquads.reduce((total, squad) => total + (squad?.members.length ?? 0), 0) }) }}</b></span><span>{{ tr('ПРОГРЕСС') }} <b>{{ Math.round(GAME_RULES.raidTriggerWork / GAME_RULES.cleanupWork * 100) }}%</b></span><span>{{ tr('НАГРАДА ПОД УГРОЗОЙ') }} <b>{{ tr('scrap.count', { count: GAME_RULES.cleanupRewardScrap }) }}</b></span></div>
        <div class="incident-actions">
          <button class="choice safe" @click="emit('raidDecision', 'escape')"><span><b>{{ tr('Сбежать') }}</b><small>{{ tr('Миссия отменится без добычи и ранений.') }}</small></span><strong>{{ GAME_RULES.guaranteedChance }}%</strong></button>
          <button class="choice" :disabled="!raidOptions?.attack.available" @click="emit('raidDecision', 'attack')"><span><b>{{ tr('Напасть') }}</b><small>{{ tr(raidOptions?.attack.available ? 'Использовать нелетальное оружие и вытеснить рейдеров.' : raidOptions?.attack.reason ?? '') }}</small></span><strong>{{ raidOptions?.attack.chance ? `${raidOptions.attack.chance}%` : tr('ЗАКРЫТО') }}</strong></button>
          <div class="support-choice-group">
            <header><b>{{ tr('Укрыться и запросить поддержку') }}</b><small>{{ tr('raid.support_choose') }}</small></header>
            <button v-for="candidate in raidOptions?.support.candidates ?? []" :key="candidate.squadId" class="choice support" @click="emit('raidDecision', 'support', candidate.squadId)">
              <span><b>{{ candidate.squadName }}</b><small>{{ supportMembers(candidate.memberIds) }}</small><small>{{ tr('raid.support_location', { location: `raid.support.location.${candidate.location}`, seconds: state.research.nodes.emergency_dispatch.completed ? RESEARCH_RULES.researchedSupportTravelTime : RESEARCH_RULES.supportTravelTime }) }}</small></span>
              <strong>{{ candidate.chance }}%</strong>
            </button>
            <button v-if="!raidOptions?.support.available" class="choice support" disabled><span><b>{{ tr('Укрыться и запросить поддержку') }}</b><small>{{ tr(raidOptions?.support.reason ?? '') }}</small></span><strong>{{ tr('НЕТ') }}</strong></button>
          </div>
        </div>
      </template>
      <template v-else>
        <h1 id="incident-title">{{ tr('Поддержка прибыла') }}</h1><p>{{ tr('raid.support_arrived_description', { squad: squadName(supportSquad) }) }}</p>
        <div class="incident-actions followup"><button class="choice safe" @click="emit('raidFollowup', 'retreat')"><span><b>{{ tr('Отступить вместе') }}</b><small>{{ tr('Безопасно уйти без добычи.') }}</small></span><strong>{{ GAME_RULES.guaranteedChance }}%</strong></button><button class="choice support" @click="emit('raidFollowup', 'continue')"><span><b>{{ tr('Продолжить разбор ситуации') }}</b><small>{{ tr('Вытеснить рейдеров и закончить уборку.') }}</small></span><strong>{{ GAME_RULES.guaranteedChance }}%</strong></button></div>
      </template>
    </section>
  </div>

  <div v-if="!newGameConfirmOpen && state.storyIncident?.stage === 'contact' && !state.incident" class="story-overlay">
    <section class="story-card" role="dialog" aria-modal="true" aria-labelledby="story-title">
      <div class="case-number"><span>{{ tr('РАССЛЕДОВАНИЕ') }}</span><strong>09</strong></div>
      <div class="story-heading"><div class="story-kicker">{{ tr('ВХОДЯЩЕЕ ДЕЛО · ВРЕМЯ ОСТАНОВЛЕНО') }}</div><h1 id="story-title">{{ tr('Девятая жизнь') }}</h1><p>{{ tr('story.description', { squad: squadNames(storySquads) }) }}</p><div class="witness-line"><span>{{ tr('СВИДЕТЕЛЬ') }}</span><b>{{ tr('Позывной «Игла»') }}</b><i>{{ tr('показания не подтверждены') }}</i></div></div>
      <div class="story-intel"><div v-for="fact in state.storyIncident.facts" :key="fact.id"><span>{{ tr(factLabels[fact.id]) }}</span><b>{{ tr(`intel.quality.${fact.quality}`) }}</b><small>{{ tr(`intel.source.${fact.source}`) }}</small></div></div>
      <div class="story-verification"><button :disabled="!verificationOptions.interview.available" @click="emit('storyVerify', 'interview')"><b>{{ tr('story.verify.interview') }}</b><small>{{ tr(verificationOptions.interview.available ? 'story.verify.interview.description' : verificationOptions.interview.reason ?? '') }}</small></button><button :disabled="!verificationOptions.recon.available" @click="emit('storyVerify', 'recon')"><b>{{ tr('story.verify.recon') }}</b><small>{{ tr(verificationOptions.recon.available ? 'story.verify.recon.description' : verificationOptions.recon.reason ?? '') }}</small></button><button :disabled="!verificationOptions.deescalation.available" @click="emit('storyVerify', 'deescalation')"><b>{{ tr('story.verify.deescalation') }}</b><small>{{ tr(verificationOptions.deescalation.available ? 'story.verify.deescalation.description' : verificationOptions.deescalation.reason ?? '') }}</small></button></div>
      <div class="story-choices"><button v-for="(choice, index) in storyChoices" :key="choice.id" class="story-choice" :class="[choice.tone, { intervention: choice.intervention }]" :disabled="!choice.available" @click="emit('storyDecision', choice.id)"><span class="choice-index">0{{ index + 1 }}</span><span class="choice-copy"><small>{{ tr(choice.tag) }}</small><b>{{ tr(choice.title) }}</b><em>{{ tr(choice.available ? choice.description : choice.reason ?? choice.description) }}</em><mark v-if="choice.intervention">{{ tr(choice.intervention.reason) }}</mark></span><span class="choice-impact"><b>+{{ choice.fame }}</b><small>{{ tr('известность') }}</small><strong :class="{ quiet: !choice.totalThreatDelta }">{{ choice.totalThreatDelta ? `+${choice.totalThreatDelta}` : '±0' }}</strong><small>{{ tr('угроза') }}</small></span></button></div>
      <footer><span>{{ tr('Решение нельзя отменить') }}</span><span>{{ tr('Каждый вариант открывает отдельную будущую ветку') }}</span><button class="story-reset" @click="emit('newGame')">{{ tr('reset.open') }}</button></footer>
    </section>
  </div>

  <div v-if="!newGameConfirmOpen && state.finalSummaryVisible && state.storyResolution" class="final-overlay">
    <section class="final-card" role="dialog" aria-modal="true" aria-labelledby="final-title">
      <div class="final-stamp">{{ tr('ДЕЛО ЗАКРЫТО') }}</div><div class="final-kicker">NINE LIVES CORP · {{ tr('ОПЕРАТИВНАЯ СВОДКА 09') }}</div><h1 id="final-title">{{ tr('Девятая жизнь') }}</h1><p class="final-lead">{{ tr(state.storyResolution.outcome) }}</p>
      <div class="final-metrics"><div><small>{{ tr('ИЗВЕСТНОСТЬ') }}</small><b>{{ state.fame }}</b><span>{{ tr('final.goal_complete', { fame: GAME_RULES.fameGoal }) }}</span></div><div><small>{{ tr('ЛОКАЛЬНАЯ УГРОЗА') }}</small><b>{{ state.threat }}</b><span>{{ tr(state.threat >= GAME_RULES.severeThreat ? 'ВЫСОКАЯ' : state.threat >= GAME_RULES.elevatedThreat ? 'ПОВЫШЕННАЯ' : 'СТАБИЛЬНАЯ') }}</span></div><div><small>{{ tr('УСПЕШНЫЕ УБОРКИ') }}</small><b>{{ totalRuns }}</b><span>{{ tr('АВТОНОМНЫЙ ЦИКЛ РАБОТАЕТ') }}</span></div></div>
      <div class="final-timeline">
        <article><span>01</span><small>{{ tr('final.story.contact') }}</small><h2>{{ finalParticipants }}</h2><p>{{ tr(state.storyResolution.inaction ? `final.story.inaction.${state.storyResolution.inaction}` : 'final.story.arrived_in_time') }}</p></article>
        <article><span>02</span><small>{{ tr('final.story.intel') }}</small><h2>{{ tr('final.story.intel_result', { confirmed: finalConfirmedFacts, verified: finalVerifiedFacts }) }}</h2><p>{{ tr(state.storyResolution.deescalated ? 'final.story.deescalated' : 'final.story.not_deescalated') }}</p></article>
        <article><span>03</span><small>{{ tr('final.story.behavior') }}</small><h2>{{ tr(state.storyResolution.intervention ? `story.intervention.${state.storyResolution.intervention}.result` : 'final.story.no_intervention') }}</h2></article>
        <article class="decision"><span>04</span><small>{{ tr('ПРИНЯТОЕ РЕШЕНИЕ') }}</small><h2>{{ tr(state.storyResolution.title) }}</h2><p>{{ tr('Открыта будущая ветка:') }} <b>{{ tr(state.storyResolution.branch) }}</b></p><div><i>{{ tr('fame.delta', { fame: state.storyResolution.fameDelta }) }}</i><i :class="{ calm: !state.storyResolution.threatDelta }">{{ tr(state.storyResolution.threatDelta ? 'threat.delta' : 'угроза без изменений', { threat: state.storyResolution.threatDelta }) }}</i></div></article>
        <article><span>05</span><small>{{ tr('final.story.aftermath') }}</small><h2>{{ tr(`story.aftermath.${state.storyAftermath?.kind}.title`) }}</h2><p>{{ tr(`final.story.aftermath.${state.storyAftermath?.kind}`) }}</p></article>
        <article><span>06</span><small>{{ tr('final.story.south_junction') }}</small><h2>{{ tr(`final.story.urgent_status.${state.urgentOperation?.status}`) }}</h2><p>{{ tr(state.urgentOperation?.status === 'completed' ? state.urgentOperation.fullReward ? 'final.story.urgent.full' : 'final.story.urgent.partial' : 'final.story.urgent.failed') }}</p></article>
      </div>
      <button class="continue-button" @click="emit('continueFinale')">{{ tr('Продолжить в песочнице') }} <span>→</span></button>
    </section>
  </div>
</template>
