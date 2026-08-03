<script setup>
import { onMounted } from 'vue'
import HeroSection from '../components/sections/HeroSection.vue'
import WhatIsItSection from '../components/sections/WhatIsItSection.vue'
import AppsShowcaseSection from '../components/sections/AppsShowcaseSection.vue'
import DevelopersSection from '../components/sections/DevelopersSection.vue'
import SpecsSection from '../components/sections/SpecsSection.vue'
import OpenSourceSection from '../components/sections/OpenSourceSection.vue'
import GetOneSection from '../components/sections/GetOneSection.vue'

// Progressive scroll-reveal for sections (content is fully visible without JS).
onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const targets = document.querySelectorAll('.section')
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'))
    return
  }
  targets.forEach((t) => t.classList.add('reveal'))
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      })
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  )
  targets.forEach((t) => io.observe(t))
})
</script>

<template>
  <div id="top">
    <HeroSection />
    <WhatIsItSection />
    <SpecsSection />
    <OpenSourceSection />
    <AppsShowcaseSection />
    <DevelopersSection />
    <GetOneSection />
  </div>
</template>
