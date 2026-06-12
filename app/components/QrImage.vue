<script setup lang="ts">
interface Props {
  src: string
  label?: string
  size?: number // 썸네일 한 변(px)
}

const props = withDefaults(defineProps<Props>(), {
  label: '입장 QR',
  size: 96,
})

const zoomed = ref(false)

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') zoomed.value = false
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="qr-image">
    <button
      type="button"
      class="qr-thumb"
      :aria-label="`${label} 확대해서 보기`"
      @click="zoomed = true"
    >
      <img :src="src" :alt="label" :style="{ width: size + 'px', height: size + 'px' }" />
    </button>
    <span class="qr-thumb__label">{{ label }}</span>
    <span class="qr-thumb__hint">탭하여 확대</span>

    <Teleport to="body">
      <Transition name="qr-fade">
        <div v-if="zoomed" class="qr-overlay" @click="zoomed = false">
          <div class="qr-overlay__inner" @click.stop>
            <img :src="src" :alt="label" class="qr-overlay__img" />
            <p class="qr-overlay__label">{{ label }}</p>
            <button type="button" class="qr-overlay__close" @click="zoomed = false">닫기</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.qr-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.qr-thumb {
  padding: 0;
  border: none;
  background: none;
  cursor: zoom-in;
  line-height: 0;
}

.qr-thumb img {
  border: 1px solid #ebebeb;
  border-radius: 8px;
  display: block;
}

.qr-thumb__label {
  font-size: 11px;
  color: #929292;
}

.qr-thumb__hint {
  font-size: 10px;
  color: #c4c4c4;
}

/* 확대 오버레이 */
.qr-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  padding: 24px;
}

.qr-overlay__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  max-width: min(90vw, 380px);
  width: 100%;
}

.qr-overlay__img {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 1 / 1;
  image-rendering: pixelated; /* QR은 또렷하게 */
}

.qr-overlay__label {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #222222;
}

.qr-overlay__close {
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  background: #222222;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.qr-fade-enter-active,
.qr-fade-leave-active {
  transition: opacity 0.18s ease;
}

.qr-fade-enter-from,
.qr-fade-leave-to {
  opacity: 0;
}
</style>
