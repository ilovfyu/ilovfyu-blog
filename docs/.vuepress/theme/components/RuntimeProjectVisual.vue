<script setup lang="ts">
import SiskinProjectVisual from './SiskinProjectVisual.vue'
import TaglineProjectVisual from './TaglineProjectVisual.vue'
import ShipGateProjectVisual from './ShipGateProjectVisual.vue'

defineProps<{ kind: 'siskin-base-control' | 'tagline' | 'shipgate' }>()
</script>

<template>
  <SiskinProjectVisual v-if="kind === 'siskin-base-control'" />
  <TaglineProjectVisual v-else-if="kind === 'tagline'" />
  <ShipGateProjectVisual v-else />
</template>
