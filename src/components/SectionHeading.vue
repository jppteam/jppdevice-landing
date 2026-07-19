<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  align: { type: String, default: 'start' }, // start | center
})
</script>

<template>
  <header class="sh" :class="`sh--${align}`">
    <p v-if="eyebrow" class="eyebrow sh__eyebrow">{{ eyebrow }}</p>
    <h2 class="sh__title">
      <slot name="title">{{ title }}</slot>
    </h2>
    <p v-if="$slots.default" class="lead sh__lead"><slot /></p>
  </header>
</template>

<style scoped>
.sh {
  max-width: 46rem;
  margin-bottom: clamp(2rem, 1rem + 3vw, 3.5rem);
}
.sh--center {
  margin-inline: auto;
  text-align: center;
}
.sh__eyebrow {
  margin-bottom: 0.75rem;
}
.sh__title {
  font-size: var(--fs-h2);
  font-weight: 800;
}
.sh__lead {
  margin-top: 1rem;
}
</style>
