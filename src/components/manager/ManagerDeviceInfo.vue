<script setup>
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import { site } from '../../data/site.js'
import IconGlyph from '../IconGlyph.vue'
import Badge from '../Badge.vue'

const { t } = useI18n()
const { sessionOpen, info, lrv } = useManagerConnection()
const verifyReady = site.links.verify !== '#'

function fmt(n) {
  if (n === 0n || n === 0) return '0 B'
  const mb = Number(n) / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function parseSerialFromCert(cert) {
  const serial = cert.match(/serial=(\d+)/)
  const runSize = cert.match(/run_size=(\d+)/)

  if (!serial || !runSize) return 'N/A'

  return `${serial[1]} / ${runSize[1]}`
}
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
            <span class="info-row__label">{{ t('manager.info.lrv') }} <Badge tone="soon">{{ t('manager.info.lrvHint') }}</Badge></span>
            <span class="info-row__value mono">{{ lrv ? parseSerialFromCert(lrv.cert) : t('manager.info.lrvNone') }}</span>
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

@media (max-width: 480px) {
  .info-row {
    flex-wrap: wrap;
  }
  .info-row__value {
    text-align: left;
    flex-basis: 100%;
    padding-left: 1.65rem;
  }
}
</style>
