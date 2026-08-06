<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import SectionHeading from '../components/SectionHeading.vue'
import IconGlyph from '../components/IconGlyph.vue'
import {
  utf8ToBytes,
  bytesToUtf8,
  hexToBytes,
  b64urlToBytes,
  normalizeCertText,
  parseCertText,
  decodeSignatureInput,
  verifyCertBytes,
  verifyResponseBytes,
  splitChallengeForDisplay,
  parseIso8601Utc,
  relativeTimeLabel,
  computeVerdict,
  VERDICT,
  EPOCH_PLACEHOLDER,
} from '../lib/lrv.js'

const { t, locale } = useI18n()
const route = useRoute()

const certText = ref('')
const certSigInput = ref('')
const challengeInput = ref('')
const respSigInput = ref('')
const result = ref(null)
const prefillWarnings = ref([])

// Flow 2 (query-param redirect) carries the exact issued cert bytes — those
// get verified as-is, with none of the manual-paste cleanup below applied
// (spec §4). We track them here and use them for as long as the textarea
// still matches what was decoded; editing the field switches back to the
// normal manual-paste path automatically.
let exactCertText = null
let exactCertBytes = null

function decodeQueryCert(raw) {
  try {
    const bytes = b64urlToBytes(raw)
    return { bytes, text: bytesToUtf8(bytes) }
  } catch {
    return null
  }
}

onMounted(() => {
  const q = route.query
  let certOk = true

  if (typeof q.cert === 'string') {
    const decoded = decodeQueryCert(q.cert)
    if (decoded) {
      certText.value = decoded.text
      exactCertText = decoded.text
      exactCertBytes = decoded.bytes
    } else {
      certOk = false
      prefillWarnings.value.push(t('verify.prefill.badCert'))
    }
  }
  if (typeof q.certsig === 'string') certSigInput.value = q.certsig
  if (typeof q.challenge === 'string') challengeInput.value = q.challenge
  if (typeof q.resp === 'string') respSigInput.value = q.resp

  const hasMinimum = certText.value.trim() !== '' && certSigInput.value.trim() !== ''
  if (hasMinimum && certOk) runVerify()
})

function getCertBytesForVerify() {
  if (exactCertBytes && certText.value === exactCertText) return exactCertBytes
  return utf8ToBytes(normalizeCertText(certText.value))
}

function runVerify() {
  const certBytes = certText.value.trim() ? getCertBytesForVerify() : null
  const certSigBytes = certSigInput.value.trim() ? decodeSignatureInput(certSigInput.value) : null
  const certAttempted = !!(certBytes && certBytes.length > 0 && certSigBytes)
  const certValid = certAttempted && verifyCertBytes(certBytes, certSigBytes)
  const certParsed = certBytes ? parseCertText(bytesToUtf8(certBytes)) : null

  const challengeRaw = challengeInput.value
  const respSigBytes = respSigInput.value.trim() ? decodeSignatureInput(respSigInput.value) : null
  const responseAttempted = certValid && !!challengeRaw && !!respSigBytes
  const responsePartial = !responseAttempted && !!(challengeRaw || respSigBytes) && certValid
  const responseValid = responseAttempted && certParsed
    ? verifyResponseBytes(utf8ToBytes(challengeRaw), respSigBytes, hexToBytes(certParsed.devicePubkeyHex))
    : false

  const verdict = computeVerdict({ certAttempted, certValid, certParsed, responseAttempted, responseValid })

  result.value = {
    verdict,
    // Never expose parsed fields from a cert whose signature didn't verify —
    // they're attacker-controlled text at that point, not authenticated data.
    certParsed: certValid ? certParsed : null,
    challengeRaw,
    responsePartial,
  }
}

function resetForm() {
  certText.value = ''
  certSigInput.value = ''
  challengeInput.value = ''
  respSigInput.value = ''
  result.value = null
  prefillWarnings.value = []
  exactCertText = null
  exactCertBytes = null
}

const hasAnyInput = computed(
  () => !!(certText.value || certSigInput.value || challengeInput.value || respSigInput.value)
)

// ---- result display -----------------------------------------------------

const RESULT_META = {
  [VERDICT.INVALID]: { tone: 'neutral', icon: 'alert' },
  [VERDICT.CERT_FAIL]: { tone: 'bad', icon: 'shield-x' },
  [VERDICT.CERT_ONLY]: { tone: 'neutral', icon: 'shield' },
  [VERDICT.RESP_FAIL]: { tone: 'warn', icon: 'alert' },
  [VERDICT.VERIFIED]: { tone: 'good', icon: 'shield' },
}
const RESULT_TEXT_KEY = {
  [VERDICT.INVALID]: 'invalid',
  [VERDICT.CERT_FAIL]: 'certFail',
  [VERDICT.CERT_ONLY]: 'certOnly',
  [VERDICT.RESP_FAIL]: 'respFail',
  [VERDICT.VERIFIED]: 'verified',
}
const resultMeta = computed(() => (result.value ? RESULT_META[result.value.verdict] : null))
const resultKey = computed(() => (result.value ? RESULT_TEXT_KEY[result.value.verdict] : null))

const deviceTypeLabel = computed(() => {
  const type = result.value?.certParsed?.deviceType
  if (type === 0) return t('verify.fields.deviceTypeLimited')
  return t('verify.fields.deviceTypeOther', { n: type })
})

const challengeDisplay = computed(() =>
  result.value?.verdict === VERDICT.VERIFIED ? splitChallengeForDisplay(result.value.challengeRaw) : null
)
const hasParsedChallenge = computed(() => !!challengeDisplay.value && 'timestamp' in challengeDisplay.value)
const isEpochPlaceholder = computed(
  () => hasParsedChallenge.value && challengeDisplay.value.timestamp === EPOCH_PLACEHOLDER
)
const challengeDate = computed(() =>
  hasParsedChallenge.value && !isEpochPlaceholder.value ? parseIso8601Utc(challengeDisplay.value.timestamp) : null
)
const challengeRelative = computed(() =>
  challengeDate.value ? relativeTimeLabel(challengeDate.value, locale.value) : ''
)
const challengeInFuture = computed(() => (challengeDate.value ? challengeDate.value.getTime() > Date.now() : false))

// J++Device didn't exist before this year — a signed timestamp earlier than
// this means the device's clock is wrong (bad RTC/never synced past its
// default date), not that the signature itself is suspect. Distinct from the
// epoch placeholder above, which firmware uses specifically for "no RTC at
// all" — this catches a clock that's running, just set wrong.
const PLAUSIBLE_YEAR_FLOOR = 2026
const timeImplausible = computed(
  () => !!challengeDate.value && challengeDate.value.getUTCFullYear() < PLAUSIBLE_YEAR_FLOOR
)

// A verified signature with an implausible clock still cryptographically
// checks out, but is misleading to badge green — downgrade the banner to a
// warning without changing the underlying (still-VERIFIED) verdict.
const resultDisplayKey = computed(() => {
  if (result.value?.verdict === VERDICT.VERIFIED && timeImplausible.value) return 'verifiedBadClock'
  return resultKey.value
})
const resultDisplayMeta = computed(() => {
  if (result.value?.verdict === VERDICT.VERIFIED && timeImplausible.value) return { tone: 'warn', icon: 'alert' }
  return resultMeta.value
})
</script>

<template>
  <div class="vpage">
    <div class="container container-narrow">
      <SectionHeading :title="t('verify.title')">{{ t('verify.lead') }}</SectionHeading>

      <div v-if="prefillWarnings.length" class="mg-card vpage__prefill-warn">
        <p v-for="(w, i) in prefillWarnings" :key="i" class="mg-card__warn">
          <IconGlyph name="alert" /> {{ w }}
        </p>
      </div>

      <div v-if="result" class="mg-card vpage__result" :class="`vpage__result--${resultDisplayMeta.tone}`">
        <div class="mg-card__heading">
          <span class="vpage__result-icon"><IconGlyph :name="resultDisplayMeta.icon" /></span>
          <h3>{{ t(`verify.result.${resultDisplayKey}.title`) }}</h3>
        </div>
        <hr class="mg-card__sep">
        <p class="vpage__result-body">{{ t(`verify.result.${resultDisplayKey}.body`) }}</p>

        <template v-if="result.certParsed">
          <dl class="vpage__fields">
            <div>
              <dt>{{ t('verify.fields.serial') }}</dt>
              <dd>{{ t('verify.fields.unitOf', { n: result.certParsed.serial, total: result.certParsed.runSize }) }}</dd>
            </div>
            <div>
              <dt>{{ t('verify.fields.deviceType') }}</dt>
              <dd>{{ deviceTypeLabel }}</dd>
            </div>
          </dl>

          <details class="vpage__advanced">
            <summary>{{ t('verify.fields.advanced') }}</summary>
            <dl class="vpage__fields">
              <div>
                <dt>{{ t('verify.fields.hwid') }}</dt>
                <dd class="mono">{{ result.certParsed.hwid }}</dd>
              </div>
              <div>
                <dt>{{ t('verify.fields.devicePubkey') }}</dt>
                <dd class="mono vpage__break">{{ result.certParsed.devicePubkeyHex }}</dd>
              </div>
            </dl>
          </details>
        </template>
        <p v-else-if="resultKey !== 'invalid' && resultKey !== 'certFail'" class="vpage__result-note">
          {{ t('verify.result.unparseable') }}
        </p>

        <template v-if="result.verdict === VERDICT.VERIFIED">
          <hr class="mg-card__sep">
          <div v-if="hasParsedChallenge" class="vpage__challenge">
            <p>
              <IconGlyph name="user" />
              {{ t('verify.challenge.verifiedAs', { user: challengeDisplay.username || t('verify.challenge.noUsername') }) }}
            </p>
            <p v-if="isEpochPlaceholder"><IconGlyph name="clock" /> {{ t('verify.challenge.clockUnavailable') }}</p>
            <p v-else-if="challengeDate">
              <IconGlyph name="clock" />
              {{ t('verify.challenge.signedAt', { time: challengeDisplay.timestamp, rel: challengeRelative }) }}
            </p>
            <p v-if="timeImplausible" class="vpage__result-note vpage__result-note--warn">
              {{ t('verify.challenge.implausibleYear', { year: PLAUSIBLE_YEAR_FLOOR }) }}
            </p>
            <p v-if="challengeInFuture" class="vpage__result-note">{{ t('verify.challenge.futureWarning') }}</p>
          </div>
          <p v-else class="mono vpage__break">{{ result.challengeRaw }}</p>
        </template>
        <p v-else-if="result.verdict === VERDICT.RESP_FAIL" class="vpage__result-note mono vpage__break">
          {{ t('verify.result.respFailChallenge', { challenge: result.challengeRaw }) }}
        </p>

        <p v-if="result.verdict === VERDICT.VERIFIED || result.verdict === VERDICT.RESP_FAIL" class="vpage__caveat">
          {{ t('verify.livenessCaveat') }}
        </p>
      </div>

      <form class="mg-card vpage__form" @submit.prevent="runVerify">
        <div class="mg-card__heading">
          <IconGlyph name="shield" />
          <h3>{{ t('verify.form.title') }}</h3>
        </div>
        <hr class="mg-card__sep">

        <div class="field">
          <label for="v-cert">{{ t('verify.form.cert') }} <span class="req">*</span></label>
          <textarea
            id="v-cert"
            v-model="certText"
            class="mono"
            rows="6"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            :placeholder="t('verify.form.certPlaceholder')"
          />
        </div>

        <div class="field">
          <label for="v-certsig">{{ t('verify.form.certSig') }} <span class="req">*</span></label>
          <textarea
            id="v-certsig"
            v-model="certSigInput"
            class="mono"
            rows="2"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            :placeholder="t('verify.form.certSigPlaceholder')"
          />
        </div>

        <div class="field">
          <label for="v-challenge">{{ t('verify.form.challenge') }}</label>
          <input
            id="v-challenge"
            v-model="challengeInput"
            type="text"
            class="mono"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            :placeholder="t('verify.form.challengePlaceholder')"
          >
        </div>

        <div class="field">
          <label for="v-respsig">{{ t('verify.form.respSig') }}</label>
          <textarea
            id="v-respsig"
            v-model="respSigInput"
            class="mono"
            rows="2"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            :placeholder="t('verify.form.respSigPlaceholder')"
          />
        </div>
        <p v-if="result?.responsePartial" class="field-hint">
          <IconGlyph name="alert" /> {{ t('verify.form.responsePartialHint') }}
        </p>

        <div class="mg-card__actions">
          <button type="submit" class="btn btn--yellow">{{ t('verify.form.submit') }}</button>
          <button v-if="hasAnyInput" type="button" class="btn btn--ghost" @click="resetForm">
            {{ t('verify.form.reset') }}
          </button>
        </div>
      </form>

      <p class="vpage__privacy">
        <IconGlyph name="shield" /> {{ t('verify.privacyNote') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.vpage {
  padding-block: clamp(2.5rem, 1.5rem + 4vw, 4.5rem) var(--section-y);
  background: var(--paper);
  min-height: 60vh;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.1rem;
}
.field label {
  font-size: 0.85rem;
  color: var(--ink-3);
}
.req {
  color: var(--error);
}
.field textarea,
.field input {
  font: inherit;
  font-size: 0.88rem;
  padding: 0.7em 0.85em;
  border: 1.5px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--ink);
  background: var(--white);
  resize: vertical;
  width: 100%;
}
.field textarea:focus-visible,
.field input:focus-visible {
  outline: none;
  border-color: var(--ink);
}
.field-hint {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-size: 0.82rem;
  color: var(--warning-deep);
  margin: -0.5rem 0 1rem;
}
.vpage__prefill-warn {
  margin-bottom: 1.5rem;
}
.vpage__form {
  margin-bottom: 1.5rem;
}
.vpage__result {
  margin-bottom: 1.75rem;
  border-width: 2px;
  box-shadow: var(--shadow);
}
.vpage__result .mg-card__heading h3 {
  font-size: var(--fs-h3);
}
.vpage__result-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  background: currentColor;
}
.vpage__result-icon :deep(.glyph) {
  color: var(--white);
}
.vpage__result--good { background: var(--success-soft); border-color: var(--success-deep); color: var(--success-deep); }
.vpage__result--bad { background: var(--error-soft); border-color: var(--error-deep); color: var(--error-deep); }
.vpage__result--warn { background: var(--warning-soft); border-color: var(--warning-deep); color: var(--warning-deep); }
.vpage__result--neutral { background: var(--paper-2); border-color: var(--line-mid); color: var(--ink-2); }
.vpage__result .mg-card__sep {
  border-bottom-color: currentColor;
  opacity: 0.25;
}
.vpage__result-body {
  color: var(--ink-2);
}
.vpage__result-note {
  margin-top: 0.75rem;
  font-size: 0.88rem;
  color: var(--ink-3);
}
.vpage__result-note--warn {
  color: var(--warning-deep);
  font-weight: 600;
}
.vpage__break {
  overflow-wrap: anywhere;
}
.vpage__fields {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.vpage__fields div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--line);
}
.vpage__fields dt {
  color: var(--ink-3);
  font-size: 0.85rem;
  flex: 0 0 auto;
}
.vpage__fields dd {
  text-align: right;
  overflow-wrap: anywhere;
}
.vpage__advanced {
  margin-top: 1rem;
}
.vpage__advanced summary {
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--ink-3);
  font-family: var(--font-display);
  font-weight: 600;
}
.vpage__challenge {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.vpage__challenge p {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.vpage__caveat {
  margin-top: 1.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--line);
  font-size: 0.82rem;
  color: var(--ink-3);
}
.vpage__privacy {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.82rem;
  color: var(--ink-3);
}

@media (max-width: 480px) {
  .vpage__fields div {
    flex-wrap: wrap;
  }
  .vpage__fields dd {
    text-align: left;
    flex-basis: 100%;
  }
}
</style>
