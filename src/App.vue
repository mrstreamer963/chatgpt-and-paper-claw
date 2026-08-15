<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue'
import {
  assignCat,
  canEditCat,
  continueAfterFinale,
  createState,
  getRaidOptions,
  resolveRaidDecision,
  resolveRaidFollowup,
  resolveNinthLife,
  tick,
  type NinthLifeDecision,
  type Speed,
  type Squad,
} from './core/simulation'

const state = reactive(createState())
let timer: number

const speedControls: { speed: Speed; label: string; shortcut: string }[] = [
  { speed: 0, label: 'Ⅱ', shortcut: 'Пробел' },
  { speed: 1, label: '×1', shortcut: '1' },
  { speed: 5, label: '×5', shortcut: '2' },
  { speed: 10, label: '×10', shortcut: '3' },
]
const speedByKey: Partial<Record<string, Speed>> = {
  Space: 0,
  Digit1: 1,
  Numpad1: 1,
  Digit2: 5,
  Numpad2: 5,
  Digit3: 10,
  Numpad3: 10,
}

function handleSpeedShortcut(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const target = event.target as HTMLElement | null
  if (target?.matches('input, select, textarea, [contenteditable="true"]')) return
  const speed = speedByKey[event.code]
  if (speed === undefined) return
  event.preventDefault()
  setSpeed(speed)
}

onMounted(() => {
  timer = window.setInterval(() => tick(state, 0.25), 250)
  window.addEventListener('keydown', handleSpeedShortcut)
})
onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('keydown', handleSpeedShortcut)
})

const totalRuns = computed(() => state.squads.reduce((total, squad) => total + squad.completed, 0))
const fmtTime = computed(() => `${String(9 + Math.floor(state.time / 3600)).padStart(2, '0')}:${String(Math.floor(state.time / 60) % 60).padStart(2, '0')}`)
const raidOptions = computed(() => getRaidOptions(state))
const primarySquad = computed(() => state.squads.find(squad => squad.id === state.incident?.primarySquadId))
const supportSquad = computed(() => state.squads.find(squad => squad.id === state.incident?.supportSquadId))
const supportSeconds = computed(() => Math.max(0, Math.ceil((supportSquad.value?.travelDuration ?? 0) - (supportSquad.value?.travel ?? 0))))
const storySquad = computed(() => state.squads.find(squad => squad.id === state.storyIncident?.foundBySquadId))

const storyChoices: { id: NinthLifeDecision; title: string; tag: string; description: string; fame: number; threat: number; tone: string }[] = [
  { id: 'shelter', title: 'Укрыть дезертира', tag: 'Гуманность', description: 'Дать убежище на базе. Слух укрепит имя корпорации, но приведёт преследователей к нашим воротам.', fame: 15, threat: 20, tone: 'danger' },
  { id: 'interrogate', title: 'Допросить', tag: 'Разведданные', description: 'Проверить показания и собрать полное досье на укрепление ежей. Без эскалации в секторе.', fame: 10, threat: 0, tone: 'intel' },
  { id: 'escort', title: 'Сопроводить к границе', tag: 'Безопасность', description: 'Вывести свидетеля из сектора по тихому маршруту. Надёжно, но без громкой победы.', fame: 5, threat: 0, tone: 'safe' },
  { id: 'exploit', title: 'Использовать данные сразу', tag: 'Инициатива', description: 'Не теряя времени, отправить разведку по координатам. Получим новую точку, но раскроем интерес к базе.', fame: 15, threat: 15, tone: 'action' },
]

function setSpeed(speed: Speed) {
  const blockingIncident = state.incident && state.incident.stage !== 'support_en_route'
  if (blockingIncident && speed !== 0) return
  state.speed = speed
}

function handleAssignment(catId: string, event: Event) {
  assignCat(state, catId, (event.target as HTMLSelectElement).value)
}

function squadStyle(squad: Squad) {
  const target = squad.target
  const base = { x: 46, y: 51 }
  const duration = squad.travelDuration || 1
  if (!target || squad.phase === 'base') return { left: `${base.x}%`, top: `${base.y}%`, opacity: 0 }
  const ratio = squad.phase === 'outbound' || squad.phase === 'support'
    ? Math.min(1, squad.travel / duration)
    : squad.phase === 'returning'
      ? 1 - Math.min(1, squad.travel / duration)
      : 1
  return { left: `${base.x + (target.x - base.x) * ratio}%`, top: `${base.y + (target.y - base.y) * ratio}%` }
}

function squadLabel(squad: Squad) {
  if (squad.phase === 'base') return squad.members.length ? 'На базе / готов' : 'Нет состава'
  if (squad.phase === 'outbound') return `Выезд · ${squad.target?.title} (${Math.ceil(squad.travelDuration - squad.travel)} с)`
  if (squad.phase === 'returning') return 'Возвращается на базу'
  if (squad.phase === 'support') return `Спешит на поддержку · ${Math.max(0, Math.ceil(squad.travelDuration - squad.travel))} с`
  if (squad.phase === 'incident') return 'На месте инцидента'
  return `Уборка · ${Math.round(squad.progress / 30 * 100)}%`
}
</script>

<template>
  <main>
    <header class="topbar">
      <div class="brand">NINE <i>LIVES</i><small>CORP / OPERATIONS</small></div>
      <div class="metrics">
        <span>ИЗВЕСТНОСТЬ <b>{{ state.fame }}</b><em>/ 50</em></span>
        <span>ЛОМ <b>{{ state.scrap }}</b></span>
        <span>УГРОЗА <b :class="{ hot: state.threat >= 35 }">{{ state.threat }}</b></span>
        <span>ВРЕМЯ <b>{{ fmtTime }}</b></span>
      </div>
      <nav>
        <button :class="{ active: state.activeView === 'map' }" @click="state.activeView = 'map'">Карта</button>
        <button :class="{ active: state.activeView === 'base' }" @click="state.activeView = 'base'">База</button>
      </nav>
      <div class="speed">
        <button
          v-for="control in speedControls"
          :key="control.speed"
          :class="{ active: state.speed === control.speed }"
          :title="`Клавиша: ${control.shortcut}`"
          :aria-label="`${control.label}, клавиша ${control.shortcut}`"
          :aria-keyshortcuts="control.speed === 0 ? 'Space' : control.shortcut"
          :disabled="Boolean(state.incident && state.incident.stage !== 'support_en_route' && control.speed !== 0)"
          @click="setSpeed(control.speed)"
        >{{ control.label }} <kbd>{{ control.shortcut }}</kbd></button>
      </div>
    </header>

    <div v-if="state.incident?.stage === 'support_en_route'" class="support-strip">
      <span class="alert-dot"></span>
      <b>{{ supportSquad?.name }} следует на поддержку</b>
      <span>Прибытие через {{ supportSeconds }} с</span>
      <button v-if="state.speed === 0" @click="setSpeed(1)">Продолжить на ×1</button>
    </div>

    <section v-if="state.activeView === 'map'" class="map-view">
      <div class="map-grid" :class="{ 'incident-active': state.incident }">
        <div class="threat-zone" :class="{ elevated: state.threat >= 35, severe: state.threat >= 50 }"></div>
        <div class="district d1">Старый сектор</div>
        <div class="district d2">Промзона</div>
        <div class="district d3">Терминал</div>
        <div class="base-pin"><strong>NL</strong><span>БАЗА</span></div>
        <div
          v-if="state.storyIncident"
          class="story-pin"
          :style="{ left: `${state.storyIncident.x}%`, top: `${state.storyIncident.y}%` }"
        ><span>!</span><b>ДЕЛО 09</b><small>Дезертир ждёт решения</small></div>
        <div v-if="state.storyResolution?.unlockedLocation" class="hedgehog-pin"><span>⌁</span><b>БАЗА ЕЖЕЙ</b><small>координаты подтверждены</small></div>
        <div
          v-for="mission in state.missions.filter(mission => mission.status === 'available')"
          :key="mission.id"
          class="cleanup-pin"
          :style="{ left: `${mission.x}%`, top: `${mission.y}%` }"
        ><span>♜</span><b>УБОРКА</b><small>{{ mission.title }}</small></div>
        <div
          v-for="mission in state.missions.filter(mission => mission.status === 'assigned')"
          :key="`assigned-${mission.id}`"
          class="cleanup-pin assigned"
          :class="{ danger: state.incident?.missionId === mission.id }"
          :style="{ left: `${mission.x}%`, top: `${mission.y}%` }"
        ><span>♜</span><b>{{ state.incident?.missionId === mission.id ? 'ТРЕВОГА' : 'УБОРКА' }}</b><small>{{ mission.title }}</small></div>
        <div
          v-for="squad in state.squads"
          :key="squad.id"
          class="squad-marker"
          :class="squad.phase"
          :style="squadStyle(squad)"
        >
          <span v-for="member in squad.members" :key="member" class="cat-silhouette">♟</span>
          <b>{{ squad.name }}</b>
          <small>{{ squadLabel(squad) }}</small>
        </div>
      </div>
      <aside>
        <h2>ОПЕРАТИВНАЯ ЛЕНТА</h2>
        <p class="goal">Цель: 50 известности и закрытое расследование.</p>
        <div class="case-progress" :class="{ done: state.storyResolution }">
          <span>ДЕЛО 09</span>
          <b>{{ state.storyResolution ? 'ЗАКРЫТО' : state.storyIncident ? 'ТРЕБУЕТ РЕШЕНИЯ' : 'ОЖИДАЕТ СИГНАЛА' }}</b>
        </div>
        <article v-for="(item, index) in state.log" :key="`${index}-${item}`">{{ item }}</article>
      </aside>
    </section>

    <section v-else class="base-view">
      <div class="cutaway">
        <div class="room lab">ЛАБОРАТОРИЯ<br><small>Исследования — следующий этап</small></div>
        <div class="room control">ДИСПЕТЧЕРСКАЯ<br><small>{{ totalRuns }} заверш. уборок</small></div>
        <div class="room garage">ГАРАЖ<br><small>2 отряда на готовности</small></div>
      </div>
      <aside class="roster">
        <h2>СОСТАВ И ОТРЯДЫ</h2>
        <p class="roster-hint">Изменение состава ставит время на паузу. Отряд в поле заблокирован до возвращения.</p>
        <div v-for="cat in state.cats" :key="cat.id" class="cat" :class="{ injured: cat.injuredRemaining > 0 }">
          <img :src="`/assets/art/portrait-${cat.id}-v1.png`" :alt="cat.name">
          <div>
            <b>{{ cat.name }}</b>
            <small v-if="cat.injuredRemaining > 0" class="injury-label">РАНЕН · {{ Math.ceil(cat.injuredRemaining) }} с</small>
            <small v-else>{{ cat.role }} · бодрость {{ Math.round(cat.energy) }}%</small>
          </div>
          <select :value="cat.assignedTo || ''" :disabled="!canEditCat(state, cat.id)" @change="handleAssignment(cat.id, $event)">
            <option value="">не назначен</option>
            <option v-for="squad in state.squads" :key="squad.id" :value="squad.id" :disabled="squad.phase !== 'base'">{{ squad.name }}</option>
          </select>
        </div>
        <div v-for="squad in state.squads" :key="squad.id" class="squad-status">
          <b>{{ squad.name }}</b>
          <span>{{ squad.members.length }} кот. · {{ squad.phase === 'base' ? 'на базе' : 'состав заблокирован' }}</span>
        </div>
      </aside>
    </section>

    <div v-if="state.incident && state.incident.stage !== 'support_en_route'" class="incident-overlay">
      <section class="incident-card" role="dialog" aria-modal="true" aria-labelledby="incident-title">
        <div class="incident-kicker"><span></span> НЕШТАТНАЯ СИТУАЦИЯ · ВРЕМЯ ОСТАНОВЛЕНО</div>
        <template v-if="state.incident.stage === 'decision'">
          <h1 id="incident-title">Встреча с рейдерами</h1>
          <p>{{ primarySquad?.name }} обнаружил вооружённую группу на месте уборки. Рейдеры ещё не заметили точную позицию отряда.</p>
          <div class="incident-facts">
            <span>ОТРЯД <b>{{ primarySquad?.members.length }} кот.</b></span>
            <span>ПРОГРЕСС <b>50%</b></span>
            <span>НАГРАДА ПОД УГРОЗОЙ <b>10 лома</b></span>
          </div>
          <div class="incident-actions">
            <button class="choice safe" @click="resolveRaidDecision(state, 'escape')">
              <span><b>Сбежать</b><small>Миссия отменится без добычи и ранений.</small></span><strong>100%</strong>
            </button>
            <button class="choice" :disabled="!raidOptions?.attack.available" @click="resolveRaidDecision(state, 'attack')">
              <span><b>Напасть</b><small>{{ raidOptions?.attack.reason }}</small></span><strong>ЗАКРЫТО</strong>
            </button>
            <button class="choice support" :disabled="!raidOptions?.support.available" @click="resolveRaidDecision(state, 'support')">
              <span><b>Укрыться и запросить поддержку</b><small v-if="raidOptions?.support.available">{{ raidOptions.support.supportSquadName }} будет отозван и прибудет через 8 секунд.</small><small v-else>{{ raidOptions?.support.reason }}</small></span>
              <strong>{{ raidOptions?.support.chance ? `${raidOptions.support.chance}%` : 'НЕТ' }}</strong>
            </button>
          </div>
        </template>
        <template v-else>
          <h1 id="incident-title">Поддержка прибыла</h1>
          <p>{{ supportSquad?.name }} занял позицию рядом с основной группой. Теперь оба отряда могут безопасно отступить или закончить работу вместе.</p>
          <div class="incident-actions followup">
            <button class="choice safe" @click="resolveRaidFollowup(state, 'retreat')">
              <span><b>Отступить вместе</b><small>Безопасно уйти без добычи.</small></span><strong>100%</strong>
            </button>
            <button class="choice support" @click="resolveRaidFollowup(state, 'continue')">
              <span><b>Продолжить разбор ситуации</b><small>Вытеснить рейдеров и закончить уборку.</small></span><strong>100%</strong>
            </button>
          </div>
        </template>
      </section>
    </div>

    <div v-if="state.storyIncident && !state.incident" class="story-overlay">
      <section class="story-card" role="dialog" aria-modal="true" aria-labelledby="story-title">
        <div class="case-number"><span>РАССЛЕДОВАНИЕ</span><strong>09</strong></div>
        <div class="story-heading">
          <div class="story-kicker">ВХОДЯЩЕЕ ДЕЛО · ВРЕМЯ ОСТАНОВЛЕНО</div>
          <h1 id="story-title">Девятая жизнь</h1>
          <p>{{ storySquad?.name }} нашёл у старой ветки метро кота-дезертира. Он принёс данные о скрытой базе ежей-рейдеров и просит защиты. За ним могут прийти.</p>
          <div class="witness-line"><span>СВИДЕТЕЛЬ</span><b>Позывной «Игла»</b><i>показания не подтверждены</i></div>
        </div>
        <div class="story-choices">
          <button
            v-for="choice in storyChoices"
            :key="choice.id"
            class="story-choice"
            :class="choice.tone"
            @click="resolveNinthLife(state, choice.id)"
          >
            <span class="choice-index">0{{ storyChoices.indexOf(choice) + 1 }}</span>
            <span class="choice-copy"><small>{{ choice.tag }}</small><b>{{ choice.title }}</b><em>{{ choice.description }}</em></span>
            <span class="choice-impact"><b>+{{ choice.fame }}</b><small>известность</small><strong :class="{ quiet: !choice.threat }">{{ choice.threat ? `+${choice.threat}` : '±0' }}</strong><small>угроза</small></span>
          </button>
        </div>
        <footer><span>Решение нельзя отменить</span><span>Каждый вариант открывает отдельную будущую ветку</span></footer>
      </section>
    </div>

    <div v-if="state.finalSummaryVisible && state.storyResolution" class="final-overlay">
      <section class="final-card" role="dialog" aria-modal="true" aria-labelledby="final-title">
        <div class="final-stamp">ДЕЛО ЗАКРЫТО</div>
        <div class="final-kicker">NINE LIVES CORP · ОПЕРАТИВНАЯ СВОДКА 09</div>
        <h1 id="final-title">Девятая жизнь</h1>
        <p class="final-lead">{{ state.storyResolution.outcome }}</p>
        <div class="final-metrics">
          <div><small>ИЗВЕСТНОСТЬ</small><b>{{ state.fame }}</b><span>/ 50 · ЦЕЛЬ ВЫПОЛНЕНА</span></div>
          <div><small>ЛОКАЛЬНАЯ УГРОЗА</small><b>{{ state.threat }}</b><span>{{ state.threat >= 50 ? 'ВЫСОКАЯ' : state.threat >= 35 ? 'ПОВЫШЕННАЯ' : 'СТАБИЛЬНАЯ' }}</span></div>
          <div><small>УСПЕШНЫЕ УБОРКИ</small><b>{{ totalRuns }}</b><span>АВТОНОМНЫЙ ЦИКЛ РАБОТАЕТ</span></div>
        </div>
        <div class="final-result">
          <span>ПРИНЯТОЕ РЕШЕНИЕ</span>
          <h2>{{ state.storyResolution.title }}</h2>
          <p>Открыта будущая ветка: <b>{{ state.storyResolution.branch }}</b></p>
          <div><i>+{{ state.storyResolution.fameDelta }} известности</i><i :class="{ calm: !state.storyResolution.threatDelta }">{{ state.storyResolution.threatDelta ? `+${state.storyResolution.threatDelta} угрозы` : 'угроза без изменений' }}</i></div>
        </div>
        <button class="continue-button" @click="continueAfterFinale(state)">Продолжить в песочнице <span>→</span></button>
      </section>
    </div>
  </main>
</template>
