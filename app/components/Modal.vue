<script setup lang="ts">
interface Props {
  isOpen: boolean
  title?: string
  size?: 'small' | 'medium' | 'large'
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'medium',
})

const emit = defineEmits<Emits>()

const handleClose = () => {
  emit('close')
}

// ESC 키로 모달 닫기
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 모달 외부 클릭 시 닫기
const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}

const sizeClasses = {
  small: 'modal-container--small',
  medium: 'modal-container--medium',
  large: 'modal-container--large',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="handleBackdropClick"
      >
        <div
          :class="['modal-container', sizeClasses[size]]"
          @click.stop
        >
          <div v-if="title || $slots.header" class="modal-header">
            <h2 v-if="title" class="modal-title">{{ title }}</h2>
            <slot name="header" />
            <button class="modal-close" @click="handleClose" aria-label="닫기">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <slot />
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: radial-gradient(circle at 0 0, rgba(124, 58, 237, 0.18), transparent 55%),
    rgba(7, 10, 19, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

.modal-container--small {
  max-width: 400px;
}

.modal-container--medium {
  max-width: 500px;
}

.modal-container--large {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text, #ffffff);
}

.modal-close {
  background: none;
  border: none;
  color: var(--muted, rgba(255, 255, 255, 0.6));
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background-color 120ms ease, color 120ms ease;
  margin-left: auto;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text, #ffffff);
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* 모달 애니메이션 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 200ms ease, opacity 200ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>
