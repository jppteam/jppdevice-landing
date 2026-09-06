<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconGlyph from '../IconGlyph.vue'
import { parseIso8601Utc, relativeTimeLabel, VERDICT, EPOCH_PLACEHOLDER } from '../../lib/lrv.js'

const props = defineProps({
  result: { type: Object, required: true },
})

const { t, locale } = useI18n()

// One row per verdict: banner tone, banner icon, and the
// `verify.result.verdict.*` block the title and body are read from.
const DISPLAY = {
  [VERDICT.INVALID]: { tone: 'neutral', icon: 'alert', key: 'invalid' },
  [VERDICT.CERT_FAIL]: { tone: 'bad', icon: 'shield-x', key: 'certFail' },
  [VERDICT.CERT_ONLY]: { tone: 'neutral', icon: 'shield', key: 'certOnly' },
  [VERDICT.RESP_FAIL]: { tone: 'warn', icon: 'alert', key: 'respFail' },
  [VERDICT.VERIFIED]: { tone: 'good', icon: 'shield', key: 'verified' },
}
// A verified signature with an implausible clock still cryptographically
// checks out, but is misleading to badge green — downgrade the banner to a
// warning without changing the underlying (still-VERIFIED) verdict.
const BAD_CLOCK_DISPLAY = { tone: 'warn', icon: 'alert', key: 'verifiedBadClock' }

// J++Device didn't exist before this year — a signed timestamp earlier than
// this means the device's clock is wrong (bad RTC/never synced past its
// default date), not that the signature itself is suspect. Distinct from the
// epoch placeholder below, which firmware uses specifically for "no RTC at
// all" — this catches a clock that's running, just set wrong.
const PLAUSIBLE_YEAR_FLOOR = 2026

const verdict = computed(() => props.result.verdict)
const isVerified = computed(() => verdict.value === VERDICT.VERIFIED)

// ---- signed challenge ---------------------------------------------------

const challenge = computed(() => props.result.challenge)
const hasParsedChallenge = computed(() => !!challenge.value && 'timestamp' in challenge.value)
const isEpochPlaceholder = computed(
  () => hasParsedChallenge.value && challenge.value.timestamp === EPOCH_PLACEHOLDER
)
const challengeDate = computed(() =>
  hasParsedChallenge.value && !isEpochPlaceholder.value ? parseIso8601Utc(challenge.value.timestamp) : null
)
const challengeAbsolute = computed(() => (challengeDate.value ? challengeDate.value.toLocaleString() : ''))
const challengeRelative = computed(() =>
  challengeDate.value ? relativeTimeLabel(challengeDate.value, locale.value) : ''
)
const challengeInFuture = computed(() => (challengeDate.value ? challengeDate.value.getTime() > Date.now() : false))
const timeImplausible = computed(
  () => !!challengeDate.value && challengeDate.value.getUTCFullYear() < PLAUSIBLE_YEAR_FLOOR
)

// ---- display ------------------------------------------------------------

const display = computed(() =>
  isVerified.value && timeImplausible.value ? BAD_CLOCK_DISPLAY : DISPLAY[verdict.value]
)

// Shown only when the cert text itself didn't parse, and only where saying so
// adds something — for `invalid`/`certFail` the banner already explains it.
const showUnparseableNote = computed(
  () => verdict.value !== VERDICT.INVALID && verdict.value !== VERDICT.CERT_FAIL
)

const devicePubkeyGrouped = computed(
  () => props.result.certParsed?.devicePubkeyHex.toUpperCase().replace(/\w{2}/g, '$& ') ?? ''
)
</script>

<template>
  <div class="mg-card vresult" :class="`vresult--${display.tone}`">
    <div class="mg-card__heading">
      <span class="vresult__icon"><IconGlyph :name="display.icon" /></span>
      <h3>{{ t(`verify.result.verdict.${display.key}.title`) }}</h3>
    </div>
    <hr class="mg-card__sep">
    <p class="vresult__body">{{ t(`verify.result.verdict.${display.key}.body`) }}</p>

    <template v-if="result.certParsed">
      <dl class="vresult__fields">
        <dt>
          <IconGlyph name="shield" />
          {{ t('verify.result.row.serial') }}
        </dt>
        <dd>{{ t('verify.result.row.unitOf', { n: result.certParsed.serial, total: result.certParsed.runSize }) }}</dd>

        <template v-if="challenge">
          <dt>
            <IconGlyph name="user" />
            {{ t('verify.result.row.username') }}
          </dt>
          <dd>{{ challenge.username || t('verify.result.row.noUsername') }}</dd>

          <p v-if="isEpochPlaceholder" class="vresult__warn-text">
            <IconGlyph name="clock" />
            {{ t('verify.result.warning.clockUnavailable') }}
          </p>
          <template v-else-if="challengeDate">
            <dt>
              <IconGlyph name="clock" />
              {{ t('verify.result.row.timestamp') }}
            </dt>
            <dd>{{ challengeAbsolute }} ({{ challengeRelative }})</dd>
          </template>

          <p v-if="timeImplausible" class="vresult__warn-text">
            {{ t('verify.result.warning.implausibleYear', { year: PLAUSIBLE_YEAR_FLOOR }) }}
          </p>
          <p v-if="challengeInFuture" class="vresult__warn-text">{{ t('verify.result.warning.futureWarning') }}</p>
        </template>
      </dl>

      <details class="vresult__advanced">
        <summary>{{ t('verify.result.row.advanced') }}</summary>
        <dl class="vresult__fields">
          <dt>{{ t('verify.result.row.hwid') }}</dt>
          <dd class="mono">{{ result.certParsed.hwid }}</dd>
          <dt>{{ t('verify.result.row.devicePubkey') }}</dt>
          <dd class="mono vresult__break">{{ devicePubkeyGrouped }}</dd>
        </dl>
      </details>
    </template>
    <p v-else-if="showUnparseableNote" class="vresult__note">
      {{ t('verify.result.note.unparseable') }}
    </p>

    <p v-else-if="verdict === VERDICT.RESP_FAIL" class="vresult__note mono vresult__break">
      {{ t('verify.result.note.respFailChallenge', { challenge: result.challengeRaw }) }}
    </p>

    <p v-if="verdict === VERDICT.VERIFIED || verdict === VERDICT.RESP_FAIL" class="vresult__caveat">
      {{ t('verify.result.note.liveness') }}
    </p>
  </div>
</template>

<style scoped>
.vresult {
  margin-bottom: 1.75rem;
  border-width: 2px;
  box-shadow: var(--shadow);
}
.vresult .mg-card__heading h3 {
  font-size: var(--fs-h3);
}
.vresult__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  background: currentColor;
}
.vresult__icon :deep(.glyph) {
  color: var(--white);
}
.vresult--good { background: var(--success-soft); border-color: var(--success-deep); color: var(--success-deep); }
.vresult--bad { background: var(--error-soft); border-color: var(--error-deep); color: var(--error-deep); }
.vresult--warn { background: var(--warning-soft); border-color: var(--warning-deep); color: var(--warning-deep); }
.vresult--neutral { background: var(--paper-2); border-color: var(--line-mid); color: var(--ink-2); }
.vresult .mg-card__sep {
  border-bottom-color: currentColor;
  opacity: 0.25;
}
.vresult__body {
  color: var(--ink-2);
}
.vresult__note {
  margin-top: 0.75rem;
  font-size: 0.88rem;
  color: var(--warning);
}
.vresult__break {
  overflow-wrap: anywhere;
}
.vresult__fields {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: auto 1fr;
  padding: 0.4rem 0;
  gap: 0.5rem 0.75rem;
  align-items: center;
}
.vresult__fields dt {
  color: var(--ink-3);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.vresult__fields dd {
  overflow-wrap: anywhere;
}
.vresult__fields .vresult__warn-text {
  color: var(--warning);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  grid-column: 1 / -1;
}
.vresult__advanced {
  margin-top: 1rem;
}
.vresult__advanced summary {
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--ink-3);
  font-family: var(--font-display);
  font-weight: 600;
}
.vresult__caveat {
  margin-top: 1.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--line);
  font-size: 0.82rem;
  color: var(--ink-3);
}
</style>
