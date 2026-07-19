<script setup>
defineProps({
  tone: { type: String, default: 'default' }, // default | soon | yellow | ink
})
</script>

<template>
  <span class="badge" :class="`badge--${tone}`"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.28em 0.66em;
  border-radius: 999px;
  border: 1.5px solid var(--ink);
  white-space: nowrap;
  line-height: 1.2;
}
.badge--default {
  background: transparent;
  color: var(--ink);
}
.badge--yellow {
  background: var(--yellow);
  border-color: var(--ink);
  color: var(--ink);
}
.badge--ink {
  background: var(--ink);
  color: var(--white);
}
.badge--soon {
  background: var(--yellow-soft);
  border-color: var(--yellow-deep);
  color: #7a6a00;
}
</style>
