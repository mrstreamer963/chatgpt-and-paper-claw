# План: перевод Nine Lives Corp на RTS-ядро

## Context

Сейчас игра — менеджер отрядов с RTS-подобным **интерфейсом**, но без RTS-**модели мира**. Разрыв не в архитектуре, а в симуляции:

- **У юнитов нет координат.** Позиция не хранится, а выводится: `getSquadMapPosition()` ([simulation.ts:1932](packages/game-core/src/simulation.ts:1932)) лерпит по прямой через `travel/travelDuration/routeFrom`. У `Cat` вообще нет `x/y`. Физически существует только отряд, и только как точка на отрезке.
- **Фазовый автомат вместо приказов.** 9 значений `Phase` (`outbound`, `merging`, `support`, `returning`…) и спецкейсы под каждую в `tick()` ([simulation.ts:2280-2383](packages/game-core/src/simulation.ts:2280)). Нет очереди приказов → нет waypoints, нет attack-move, нет shift-очереди.
- **Боя нет.** Рейд — модальный бросок кубика, который ставит `state.speed = 0` ([simulation.ts:2352](packages/game-core/src/simulation.ts:2352)). Нет HP, урона, дальности, выбора цели.
- **Нет второй стороны.** Миссия — статичный пин с прогресс-баром, противник на карте не существует как сущность.
- **Время не фиксировано.** `elapsed = seconds * state.speed` ([simulation.ts:2270](packages/game-core/src/simulation.ts:2270)): на x10 один тик двигает мир на 2.5 игровых секунды. Юниты телепортируются, детерминизм ломается, `rngSeed` в состоянии не даёт воспроизводимости.

Что **не** надо переписывать и что оправдывает отказ от рестарта: авторитетный мир в воркере ([localWorld.worker.ts](src/world/localWorld.worker.ts)), протокол команд/событий ([protocol.ts](packages/game-core/src/protocol.ts)), дельты состояния ([worldDelta.ts](packages/game-core/src/worldDelta.ts)), реконсиляция в реактивное дерево ([reconcileWorld.ts](src/world/reconcileWorld.ts)), сейвы, i18n на 556 строк, e2e-харнесс. Это ~половина работы и она жанрово-нейтральна.

**Цель:** живые юниты с непрерывными координатами, очередь приказов, враги и бой в реальном времени на текущей абстрактной карте (без тайлов, pathfinding и строительства). Рендер карты переводится на canvas.

---

## Целевая модель данных

```ts
// Кот = юнит. Позиция и бой живут здесь, не в отряде.
type Cat = {
  …существующие поля…
  position: MapPoint          // проценты 0-100, как и вся карта сейчас
  hp: number; maxHp: number
  damage: number; range: number; attackCooldown: number
  targetId?: string           // id враждебного юнита
  visionRadius: number        // из perception/scouting
}

// Отряд = группа выделения + владелец очереди приказов. Позиции больше нет.
type Order =
  | { kind: 'move'; x: number; y: number }
  | { kind: 'cleanup'; missionId: string }
  | { kind: 'attack'; targetId: string }
  | { kind: 'merge'; targetSquadId: string }
  | { kind: 'return' }
  | { kind: 'hold' }

type Squad = {
  id; name; customName?; members; style; autoDispatch; completed
  orders: Order[]             // вместо phase/travel/travelDuration/routeFrom/destination/mergePoint/missionArrivalTime
}

type Hostile = {
  id; kind: 'raider' | 'mutant'
  position: MapPoint; hp; maxHp; damage; range; attackCooldown
  aggroRadius; speed; targetId?
}

type State = { …; hostiles: Hostile[]; tick: number }
```

`Phase` **не удаляется**, а становится производным значением для UI: `squadActivity(state, squad): Phase` — читает `orders[0]` и состояние членов. Это сохраняет ~30 ключей i18n (`status.outbound`, `status.cleanup`, …) и `squadLabel()` в [OperationsMap.vue:97](src/components/OperationsMap.vue:97) почти без изменений.

Слой валидации (`getMoveSquadBlockReason`, `getAssignMissionBlockReason`, `getDeployCatsBlockReason`, `getSplitSquadBlockReason`, `getMergeSquadsBlockReason`) сохраняется целиком — он хороший, на нём держится вся обратная связь UI. Переписываются только внутренности: проверки `phase` → проверки очереди приказов.

---

## Этапы

Каждый этап — работающая игра, не «половина рефакторинга».

### Э1. Фиксированный шаг симуляции

- `packages/game-core/src/step.ts`: `const SIM_STEP = 0.1` (10 Гц), `stepWorld(state, SIM_STEP)` — один шаг без множителя скорости.
- `GameCore.advance(realSeconds)`: аккумулятор, `steps = floor(acc / SIM_STEP) * state.speed`, потолок ~40 шагов за вызов от спирали смерти.
- `state.tick: number` (целый счётчик), `state.time` выводится как `tick * SIM_STEP` — существующее форматирование времени в [App.vue:50](src/App.vue:50) и `note()` не трогаем.
- Воркер продолжает звать раз в 250 мс, но `advance(0.25)` вместо `tick(0.25)` ([localWorld.worker.ts:64](src/world/localWorld.worker.ts:64)).
- Публикация дельт остаётся на 250 мс — клиенту не нужно 10 патчей в секунду, интерполяция (Э4) сгладит.

**Проверка:** существующие `packages/game-core/test/simulation.test.ts` и `poc-flow.smoke.test.ts` проходят; новый тест — одна и та же последовательность команд с одного `rngSeed` даёт побайтово одинаковый `serializeState()` независимо от того, шли ли шаги на x1 или x10.

### Э2. Позиции у юнитов

- `packages/game-core/src/units.ts`: `position` у каждого кота, шаг движения к целевой точке со скоростью `CONFIG.mission.mapSpeed`, клампы в текущие границы карты (`x∈[5,95]`, `y∈[7,93]` — уже зашиты в `isMapCommandPoint`, [simulation.ts:1529](packages/game-core/src/simulation.ts:1529)).
- **Формации переезжают в ядро:** `formationOffsets()`/`baseFormationOffsets()` из [src/map/formation.ts](src/map/formation.ts) → `packages/game-core/src/formation.ts`. Симуляция сама раздаёт членам отряда слоты вокруг цели приказа. [src/formation.test.ts](src/formation.test.ts) переезжает вместе с ними.
- `getSquadMapPosition(squad)` сохраняет имя и сигнатуру, но считает центроид позиций членов. Весь UI и все e2e, которые её используют, продолжают работать.
- Энергия за перемещение (`spendTravelEnergy`) начинает списываться по фактически пройденному расстоянию, а не по `travel += elapsed`.

**Проверка:** e2e `rts-field-formation.firefox.spec.ts` зелёный без правок (формация всё ещё сходится в точку при движении); визуально — коты идут, а не прыгают.

### Э3. Очередь приказов вместо фаз

- `packages/game-core/src/orders.ts`: `pushOrder`/`replaceOrders`/`advanceOrders`. Один приказ = «дойти до точки → выполнить действие → снять из очереди».
- Схлопываются: `outbound`+`cleanup` → `{kind:'cleanup'}`; `merging` → `{kind:'merge'}`; `returning` → `{kind:'return'}`; `moving` → `{kind:'move'}`; `support` → `move`+`attack`.
- `squadActivity()` даёт `Phase` для отображения.
- Новая команда `{ type: 'queue_order'; squadId; order: Order }` в `GameCommand` ([simulation.ts:2424](packages/game-core/src/simulation.ts:2424)); существующие `move_squad`/`assign_squad_to_mission`/`return_squad`/`merge_squads` остаются как «заменить очередь одним приказом», их сигнатуры не меняются.
- **UI:** в `selectMapPoint()` ([OperationsMap.vue:155](src/components/OperationsMap.vue:155)) и `selectMission()` — `event.shiftKey` добавляет приказ в очередь вместо замены. Маршрут в [MapRouteLayer.vue](src/components/MapRouteLayer.vue) рисует всю цепочку waypoints, а не один отрезок.
- Автовыезд (`autoDispatch`) становится: «если очередь пуста — поставить `cleanup` на ближайшую доступную» — это ровно текущая логика `startMission()` без параметра, но без спецкейсов по фазам.

**Проверка:** `squad-management`, `field-squad-management`, `deferred-assignment` e2e зелёные; новый e2e — shift-клик по трём точкам, отряд обходит их по порядку.

### Э4. Враги и бой в реальном времени

- `packages/game-core/src/combat.ts`: спавн `Hostile` у миссии вместо `startRaidIncident()` ([simulation.ts:1884](packages/game-core/src/simulation.ts:1884)); выбор цели (ближайший в `range`), стрельба по кулдауну, урон, аггро при входе в `aggroRadius`.
- Кот на 0 HP → `injuredRemaining = CONFIG.raid.injuryRecoveryTime` и приказ `return` (переиспользуем существующую механику восстановления, `updateRestAndRecovery`, [simulation.ts:2247](packages/game-core/src/simulation.ts:2247)). Перманентной смерти на этом этапе нет.
- Снаряжение подключается напрямую: `nonlethal_weapon.attackBonus` → урон, `armor_vest.injuryReduction` → снижение получаемого урона, `medkit` → регенерация. Все три уже есть в [config.ts:78-85](packages/game-core/src/config.ts:78).
- **Модалка рейда убирается.** `resolveRaidDecision`/`resolveRaidFollowup`, `RaidIncident`, `RaidStage`, `getRaidOptions`, `getRaidSupportCandidates` и соответствующая часть [GameOverlays.vue](src/components/GameOverlays.vue) удаляются. `state.speed = 0` больше нигде не выставляется симуляцией.
- Стили отряда (`careful`/`balanced`/`risky`) переезжают из бонусов к броскам в поведение: дистанция удержания, порог отступления, готовность самому брать аггро.

**Проверка:** новый `packages/game-core/test/combat.test.ts` — детерминированная стычка от фиксированного сида; e2e — отряд получает приказ `attack`, HP врага падает, при нуле враг исчезает.

### Э5. Canvas-рендер с интерполяцией

- `src/map/MapCanvas.vue`: `<canvas>` + `requestAnimationFrame`. `OperationsMap.vue` сохраняет роль контроллера ввода и владельца выделения, отдаёт canvas'у проекцию.
- `src/map/interpolation.ts`: буфер из двух последних снапшотов позиций по id, рендер с задержкой в один шаг, `lerp` между ними. Без этого 10 Гц симуляции будут выглядеть как 10 fps.
- `src/map/hitTest.ts`: чистые `pickAt(view, point)` и `pickInBox(view, rect)` поверх `projectSquads()` из [mapProjection.ts](src/map/mapProjection.ts). Заменяют `formationIntersectsBox()` и `baseCatPosition()` из [OperationsMap.vue:60,81](src/components/OperationsMap.vue:60).
- Камера `{ x, y, zoom }` — пан драгом правой кнопки/пробелом, зум колесом. На canvas это дёшево и это базовый RTS-жест.
- `MapSquadLayer.vue`, `MapRouteLayer.vue`, соответствующий CSS в [missions.css:35-48](src/missions.css:35) удаляются; `MapSidePanel.vue`, `.command-hint`, `.split-panel` остаются DOM.

**Совместимость с тестами — обязательная часть этапа, не постскриптум:**
1. **Скрытый DOM-зеркальный слой** для доступности и e2e: `<ul class="map-a11y">` с `<button>` на каждого кота/миссию, несущий `data-cat-id`, `data-squad-id`, `aria-label` со статусом. Это настоящая доступность (сейчас карта кликабельна с клавиатуры, canvas это потеряет), и селекторы по имени из [rts-helpers.ts:5](e2e/rts-helpers.ts:5) продолжают работать.
2. **`window.__nlcMap`** в dev/test-сборке: `{ screenPositionOf(id), pick(x, y), boxPick(rect) }` — для геометрических утверждений в [rts-field-formation.firefox.spec.ts](e2e/rts-field-formation.firefox.spec.ts), которые сейчас читают `getBoundingClientRect()` у `.field-cat-marker`.
3. Переписать под них: три теста в `rts-field-formation.firefox.spec.ts`, ссылки на `.squad-formation`/`.field-cat-marker` в `field-squad-management` и `squad-management`, HTML-утверждения в [ui-flow.smoke.test.ts:139-145](src/ui-flow.smoke.test.ts:139).

### Э6. Чистка ядра

`simulation.ts` на 2506 строк разъезжается по модулям, `simulation.ts` остаётся barrel'ом + классом `GameCore`:

| Модуль | Что переезжает |
|---|---|
| `state.ts` | типы, `createState`, `serializeState`/`deserializeState`, валидаторы `isValid*` |
| `units.ts` | позиции, движение, формации, `getSquadMapPosition` |
| `orders.ts` | очередь приказов, все `get*BlockReason` |
| `combat.ts` | враги, наведение, урон |
| `economy.ts` | энергия, сон, исследования, снаряжение, поток миссий, ачивки |
| `step.ts` | фиксированный шаг, оркестрация |

- `SAVE_VERSION` 13 → 14. Миграции `migrateV1State`/`migrateLegacyState`/`migrateV1LogText` ([simulation.ts:431-656](packages/game-core/src/simulation.ts:431), ~225 строк) удаляются — старые сейвы уже корректно отбрасываются через `save.error.unsupported_version` → `save.error.legacy_discarded` ([useGameSession.ts:88](src/useGameSession.ts:88)).
- Отладочные `console.info('[NLC equipment:session]…')` в [useGameSession.ts:201-213](src/useGameSession.ts:201) удаляются.

---

## Что ломается осознанно

- **Все сейвы.** PoC, приемлемо; путь отбрасывания уже реализован и локализован.
- **Модалка рейда и её i18n-ключи** (`raid.*`, `toast.raid.*`) — заменяются на боевые события в ленте.
- **Все e2e, кликающие по `.field-cat-marker`/`.squad-formation`** — переписываются в Э5 через `map-a11y` и `window.__nlcMap`.
- **`ui-flow.smoke.test.ts`**, проверяющий отрендеренный HTML карты — переводится на утверждения о состоянии и о зеркальном слое.

## Порядок и объём

Э1–Э3 — фундамент, друг без друга не имеют смысла и должны идти подряд. Э4 — то, ради чего всё затевается. Э5 можно сдвинуть после Э4 (DOM-маркеры доживут до появления врагов), но не раньше: перевод рендера до появления позиций в состоянии — работа впустую. Э6 — гигиена, можно размазать.

Начинать с Э1: он самый дешёвый, ничего не ломает в UI и сразу даёт детерминизм, на который опираются тесты всех последующих этапов.

---

## Проверка

```bash
npm run check && npm test
```

```bash
npm run test:e2e:firefox
```

Ручной прогон после каждого этапа:

```bash
npm run dev
```

- **Э1:** переключение скорости x1/x5/x10 пробелом и цифрами не рвёт ход миссии; время в топбаре идёт ровно.
- **Э2:** коты идут к точке плавно, формация держится, энергия списывается пропорционально пройденному пути.
- **Э3:** shift-клик по нескольким точкам ставит очередь; маршрут рисуется целиком; отмена приказа Escape очищает очередь.
- **Э4:** после второй успешной уборки на карте появляются враги, отряд вступает в бой без модального окна, раненый кот сам уходит на базу.
- **Э5:** карта не дёргается на x1, зум и пан работают, Tab по зеркальному слою по-прежнему выделяет котов.
