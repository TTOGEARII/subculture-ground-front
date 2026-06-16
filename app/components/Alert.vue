<template>
  <div class="alert" :style="{ 'border-color': color }">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
const { color } = defineProps({
  color: {
    type: String,
    default: '#ff385c'
  }
})
</script>

<style scoped>
.alert {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 1.5px solid;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0;
  font-size: 14px;
  color: var(--ink);
}
</style>
