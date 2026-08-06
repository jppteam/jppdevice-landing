<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import {
  parseCertText,
  verifyCertBytes,
  verifyResponseBytes,
  hexToBytes,
  utf8ToBytes,
  buildVerifyQuery,
  computeVerdict,
  VERDICT,
} from '../../lib/lrv.js'
import IconGlyph from '../IconGlyph.vue'
import Badge from '../Badge.vue'

const { t } = useI18n()
const router = useRouter()
const { sessionOpen, info, lrv } = useManagerConnection()

function fmt(n) {
  if (n === 0n || n === 0) return '0 B'
  const mb = Number(n) / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

// Runs the same two Ed25519 checks as the /verify page against the identity
// the connected device just reported, so the badge reflects a real result
// rather than a static placeholder.
const verification = computed(() => {
  const data = lrv.value
  if (!data) return null
  const certAttempted = data.cert.length > 0 && data.certSig?.length === 64
  const certParsed = certAttempted ? parseCertText(data.cert) : null
  const certValid = certAttempted && verifyCertBytes(utf8ToBytes(data.cert), data.certSig)
  const responseAttempted = certValid && !!data.challenge && data.respSig?.length === 64
  const responseValid =
    responseAttempted && certParsed
      ? verifyResponseBytes(utf8ToBytes(data.challenge), data.respSig, hexToBytes(certParsed.devicePubkeyHex))
      : false
  const verdict = computeVerdict({ certAttempted, certValid, certParsed, responseAttempted, responseValid })
  return { verdict, certParsed }
})

const BADGE_TONE = {
  [VERDICT.VERIFIED]: 'good',
  [VERDICT.RESP_FAIL]: 'warn',
  [VERDICT.CERT_FAIL]: 'bad',
  [VERDICT.CERT_ONLY]: 'default',
  [VERDICT.INVALID]: 'default',
}
const badgeTone = computed(() => BADGE_TONE[verification.value?.verdict] ?? 'default')

const BADGE_LABEL_KEY = {
  [VERDICT.VERIFIED]: 'manager.info.lrvBadge.verified',
  [VERDICT.RESP_FAIL]: 'manager.info.lrvBadge.mismatch',
  [VERDICT.CERT_FAIL]: 'manager.info.lrvBadge.invalid',
  [VERDICT.CERT_ONLY]: 'manager.info.lrvBadge.authentic',
  [VERDICT.INVALID]: 'manager.info.lrvBadge.invalid',
}
const badgeLabel = computed(() =>
  t(verification.value ? BADGE_LABEL_KEY[verification.value.verdict] : 'manager.info.lrvBadge.none')
)

const lrvSerialLabel = computed(() => {
  const parsed = verification.value?.certParsed
  return parsed ? `${parsed.serial} / ${parsed.runSize}` : t('manager.info.lrvNone')
})

// Deep-links into /verify prefilled with this exact device's live identity —
// same query scheme the device's own port-3000 redirect uses (spec §4) — so
// it can be shared/checked outside the Manager page's USB session.
const verifyHref = computed(() => {
  const data = lrv.value
  if (!data) return null
  const query = buildVerifyQuery(data)
  return router.resolve({ path: '/verify', query }).href
})
</script>

<template>
  <div v-if="sessionOpen && info" class="mg-card mg-info">
    <div class="mg-card__heading">
      <IconGlyph name="chip"/>
      <h3>{{ t('manager.info.title') }}</h3>
    </div>
    <hr class="mg-card__sep">

    <div class="info-groups">
      <div class="info-group">
        <span class="info-group__title"><IconGlyph name="id" />{{ t('manager.info.identity') }}</span>
        <div class="info-rows">
          <div class="info-row">
            <span class="info-row__icon"><IconGlyph name="tag" /></span>
            <span class="info-row__label">{{ t('manager.info.fw') }}</span>
            <span class="info-row__value mono">{{ info.fwVersion }}</span>
          </div>
          <div v-if="info.username" class="info-row">
            <span class="info-row__icon"><IconGlyph name="user" /></span>
            <span class="info-row__label">{{ t('manager.info.user') }}</span>
            <span class="info-row__value mono">{{ info.username }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__icon"><IconGlyph name="id" /></span>
            <span class="info-row__label">{{ t('manager.info.hwid') }}</span>
            <span class="info-row__value mono">{{ info.hwid }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__icon"><IconGlyph name="shield" /></span>
            <span class="info-row__label">{{ t('manager.info.lrv') }}</span>
            <component
              :is="verifyHref ? 'a' : 'span'"
              class="info-row__value lrv-value"
              :class="{ 'lrv-value--link': !!verifyHref }"
              :href="verifyHref"
              :target="verifyHref ? '_blank' : null"
              :rel="verifyHref ? 'noopener' : null"
              :title="verifyHref ? t('manager.info.lrvVerifyLink') : null"
            >
              <span class="mono">{{ lrvSerialLabel }}</span>
              <Badge :tone="badgeTone">{{ badgeLabel }}</Badge>
            </component>
          </div>
        </div>
      </div>

      <div class="info-group">
        <span class="info-group__title"><IconGlyph name="sd" />{{ t('manager.info.sd') }}</span>
        <div v-if="info.sdTotal > 0n" class="info-rows">
          <div class="info-row">
            <span class="info-row__icon"><IconGlyph name="tag" /></span>
            <span class="info-row__label">{{ t('manager.info.label') }}</span>
            <span class="info-row__value mono">{{ info.sdLabel || t('manager.info.noLabel') }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__icon"><IconGlyph name="sd" /></span>
            <span class="info-row__label">{{ t('manager.info.used') }}</span>
            <span class="info-row__value mono">{{ fmt(info.sdUsed) }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__icon"><IconGlyph name="sd" /></span>
            <span class="info-row__label">{{ t('manager.info.free') }}</span>
            <span class="info-row__value mono">{{ fmt(info.sdFree) }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__icon"><IconGlyph name="sd" /></span>
            <span class="info-row__label">{{ t('manager.info.total') }}</span>
            <span class="info-row__value mono">{{ fmt(info.sdTotal) }}</span>
          </div>
        </div>
        <div v-else class="info-rows">
          <div class="info-row">
            <span class="info-row__icon"><IconGlyph name="sd" /></span>
            <span class="info-row__value">{{ t('manager.info.noCard') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mg-info {
  margin-bottom: clamp(1.5rem, 1rem + 2vw, 2.5rem);
}
.lrv-hint {
  margin-top: 1.25rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--line);
  max-width: 42rem;
}
.mg-info .mg-card__actions {
  margin-top: 0.75rem;
  align-items: center;
}
.info-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.5rem 2.5rem;
}
.info-group {
  min-width: 0;
}
.info-group__title {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.info-group__title :deep(.glyph) {
  width: 0.95rem;
  height: 0.95rem;
}
.info-rows {
  display: flex;
  flex-direction: column;
  margin-top: 0.5rem;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--line);
}
.info-row:last-child {
  border-bottom: none;
}
.info-row__icon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--ink-3);
}
.info-row__icon :deep(.glyph) {
  width: 1.05rem;
  height: 1.05rem;
}
.info-row__label {
  flex: 0 0 auto;
  min-width: 6rem;
  font-size: 0.85rem;
  color: var(--ink-3);
}
.info-row__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: right;
  font-size: 0.9rem;
}
.lrv-value {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  color: inherit;
  text-decoration: none;
}
.lrv-value--link:hover .mono {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .info-row {
    flex-wrap: wrap;
  }
  .info-row__value {
    text-align: left;
    flex-basis: 100%;
    padding-left: 1.65rem;
  }
  .lrv-value {
    justify-content: flex-start;
  }
}
</style>
