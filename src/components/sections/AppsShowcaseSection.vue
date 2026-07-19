<script setup>
import { useI18n } from 'vue-i18n'
import SectionHeading from '../SectionHeading.vue'
import IconGlyph from '../IconGlyph.vue'

const { t } = useI18n()

// The 9 built-in games. `mp` = two-device multiplayer over Bluetooth.
const games = [
  { name: 'Tetris', mp: false },
  { name: 'Pong', mp: true },
  { name: 'Snake', mp: false },
  { name: 'Breakout', mp: false },
  { name: '2048', mp: false },
  { name: 'Flappy', mp: false },
  { name: 'Racer', mp: false },
  { name: 'Connect-4', mp: true },
  { name: 'Battleship', mp: true },
]

// Single-level, equal-weight list — no app is highlighted over another. Games
// carries a nested list of the built-in titles. (A per-app "simulator" slot can
// be dropped into an item later, the way the demoscene one was.)
const primary = [
  { id: 'games', icon: 'game', nested: true },
  { id: 'meetapp', icon: 'bluetooth' },
  { id: 'demoscene', icon: 'demo' },
]

// Less prominent, denser list for the more utilitarian built-ins.
const secondary = [
  { id: 'settings', icon: 'chip' },
  { id: 'webdav', icon: 'wifi' },
]

const key = (id) => id.replace(/-/g, '_')
</script>

<template>
  <section id="apps" class="section section--paper">
    <div class="container">
      <SectionHeading :eyebrow="t('apps.eyebrow')" :title="t('apps.title')">
        {{ t('apps.lead') }}
      </SectionHeading>

      <!-- Primary apps: single-level list, all equal weight -->
      <ul class="applist">
        <li v-for="a in primary" :key="a.id" class="appitem">
          <span class="appitem__icon"><IconGlyph :name="a.icon" /></span>
          <div class="appitem__main">
            <div class="appitem__head">
              <h3 class="appitem__name">{{ t(`apps.items.${key(a.id)}.name`) }}</h3>
              <span class="appitem__tag">{{ t(`apps.items.${key(a.id)}.tag`) }}</span>
            </div>
            <p class="appitem__body">{{ t(`apps.items.${key(a.id)}.body`) }}</p>

            <!-- Nested list of the built-in games -->
            <ul v-if="a.nested" class="gamelist">
              <li v-for="g in games" :key="g.name" class="gamechip">
                <span>{{ g.name }}</span>
                <span v-if="g.mp" class="gamechip__mp" :title="t('apps.multiplayerTitle')">
                  <IconGlyph name="bluetooth" /> {{ t('apps.multiplayerBadge') }}
                </span>
              </li>
            </ul>
          </div>
        </li>
      </ul>

      <!-- Secondary apps: less prominent -->
      <p class="apps__more">{{ t('apps.moreLabel') }}</p>
      <ul class="applist applist--muted">
        <li v-for="a in secondary" :key="a.id" class="appitem appitem--muted">
          <span class="appitem__icon"><IconGlyph :name="a.icon" /></span>
          <div class="appitem__main">
            <div class="appitem__head">
              <h4 class="appitem__name">{{ t(`apps.items.${key(a.id)}.name`) }}</h4>
              <span class="appitem__tag">{{ t(`apps.items.${key(a.id)}.tag`) }}</span>
            </div>
            <p class="appitem__body">{{ t(`apps.items.${key(a.id)}.body`) }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.applist {
  list-style: none;
  padding: 0;
  margin: 0;
}

.appitem {
  display: flex;
  gap: 1.25rem;
  padding: 1.75rem 0;
  border-top: 1px solid var(--line);
}
.appitem:first-child {
  border-top: none;
}
.appitem__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  font-size: 1.4rem;
  border-radius: 12px;
  background: var(--white);
  border: 1px solid var(--line);
  color: var(--ink);
}
.appitem__main {
  min-width: 0;
}
.appitem__head {
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
}
.appitem__name {
  font-size: var(--fs-h3);
  font-weight: 800;
}
.appitem__tag {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--ink-3);
}
.appitem__body {
  color: var(--ink-2);
  max-width: 46rem;
}

/* Nested games list */
.gamelist {
  list-style: none;
  padding: 0;
  margin: 1.1rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.gamechip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.85rem;
}
.gamechip__mp {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--ink);
  background: var(--yellow);
  padding: 0.08rem 0.4rem;
  border-radius: 999px;
}
.gamechip__mp :deep(.glyph) {
  font-size: 0.8rem;
}

/* Secondary (less prominent) list */
.apps__more {
  margin: 2.5rem 0 0.25rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.applist--muted .appitem {
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--line);
}
.applist--muted .appitem__icon {
  width: 2rem;
  height: 2rem;
  font-size: 1rem;
  border-radius: 9px;
  background: transparent;
  border-color: transparent;
  color: var(--ink-3);
}
.applist--muted .appitem__name {
  font-size: 1.05rem;
  font-weight: 700;
}
.applist--muted .appitem__body {
  font-size: 0.9rem;
  color: var(--ink-3);
}

@media (max-width: 600px) {
  .appitem {
    gap: 1rem;
  }
  .appitem__icon {
    width: 2.2rem;
    height: 2.2rem;
    font-size: 1.2rem;
  }
}
</style>
