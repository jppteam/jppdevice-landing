<script setup>
import { useI18n } from 'vue-i18n'
import SectionHeading from '../SectionHeading.vue'

const { t } = useI18n()

// Row ids in display order; part/detail copy lives in i18n under specs.table.<id>.
const specs = [
  'processor',
  'screen',
  'input',
  'storage',
  'clock',
  'sound',
  'radio',
  'connection',
  'power',
  'enclosure',
]
</script>

<template>
  <section id="specs" class="section">
    <div class="container">
      <SectionHeading :eyebrow="t('specs.eyebrow')" :title="t('specs.title')">
        {{ t('specs.lead') }}
      </SectionHeading>

      <div class="specs">
        <table class="specs__table">
          <tbody>
            <tr v-for="s in specs" :key="s">
              <th scope="row">{{ t(`specs.table.${s}.part`) }}</th>
              <td>{{ t(`specs.table.${s}.detail`) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.specs__table {
  width: 100%;
  border-collapse: collapse;
}
.specs__table tr {
  border-bottom: 1px solid var(--line);
}
.specs__table tr:first-child {
  border-top: 2px solid var(--ink);
}
.specs__table th {
  text-align: left;
  vertical-align: top;
  padding: 0.9rem 1rem 0.9rem 0;
  width: 34%;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--ink);
}
.specs__table td {
  padding: 0.9rem 0;
  color: var(--ink-2);
  vertical-align: top;
}
</style>
