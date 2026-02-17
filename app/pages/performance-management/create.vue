<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'
import { usePerformances } from '../../../composables/usePerformances'
import { useApi } from '../../../composables/useUtil'

definePageMeta({
  layout: 'bookings',
})

const { isAuthenticated, user, fetchProfile } = useAuth()
const { createPerformance } = usePerformances()

// 폼 데이터
const formData = ref({
  performanceName: '',
  performanceArtist: '',
  performanceVenue: '',
  performanceDate: '',
  performanceTime: '',
  runningTime: '', // 관람 시간 (분)
  detailedAddress: '', // 상세주소
  performanceCategory: [] as string[], // 카테고리 (배열)
  performanceImage: null as File | null,
  performanceImagePreview: '' as string | null,
  performanceDescription: '',
})

// 카테고리 옵션
const categoryOptions = [
  '록',
  'jpop',
  'kpop',
  '재즈',
  '클래식',
  '힙합',
  'R&B',
  '일렉트로닉',
  '인디',
  '포크',
  '컨트리',
  '메탈',
  '펑크',
  '레게',
  '블루스',
  '기타',
]

const selectedCategories = ref<string[]>([])

const isLoading = ref(false)
const isUploading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

// 시간 표시 포맷팅 (HH:mm AM/PM)
const formatTimeForDisplay = (time: string): string => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour24 = Number(hours)
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  const period = hour24 >= 12 ? 'PM' : 'AM'
  return `${String(hour12).padStart(2, '0')}:${minutes} ${period}`
}

onMounted(async () => {
  if (!isAuthenticated.value) {
    await navigateTo('/auth/login')
    return
  }

  if (!user.value) {
    await fetchProfile()
  }
})

useSeoMeta({
  title: '새 공연 등록 - Subculture Ground',
  description: '새 공연을 등록합니다.',
})

// 파일 선택 핸들러
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 파일 형식 검증
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'JPG, JPEG, PNG 형식만 업로드 가능합니다.'
    return
  }

  // 파일 크기 검증 (10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    errorMessage.value = '파일 크기는 10MB 이하여야 합니다.'
    return
  }

  formData.value.performanceImage = file

  // 미리보기 생성
  const reader = new FileReader()
  reader.onload = (e) => {
    formData.value.performanceImagePreview = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// 드래그 앤 드롭 핸들러
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()

  const file = event.dataTransfer?.files[0]
  if (!file) return

  // 파일 형식 검증
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'JPG, JPEG, PNG 형식만 업로드 가능합니다.'
    return
  }

  formData.value.performanceImage = file

  // 미리보기 생성
  const reader = new FileReader()
  reader.onload = (e) => {
    formData.value.performanceImagePreview = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// 파일 input 클릭 핸들러
const handleFileInputClick = () => {
  if (process.client && fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// 이미지 업로드 (서버에 업로드하고 URL을 받아옴)
const uploadImage = async (file: File): Promise<string> => {
  const apiClient = useApi()
  
  const formDataObj = new FormData()
  formDataObj.append('image', file)

  try {
    const response = await apiClient.post<{ url: string; filename: string }>(
      '/events/upload-image',
      formDataObj,
    )
    
    return response.data.url
  } catch (error: any) {
    console.error('이미지 업로드 실패:', error)
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      '이미지 업로드에 실패했습니다.'
    )
  }
}

const handleSubmit = async () => {
  // 유효성 검사
  if (!formData.value.performanceName.trim()) {
    errorMessage.value = '공연 이름을 입력해주세요.'
    return
  }
  if (!formData.value.performanceArtist.trim()) {
    errorMessage.value = '아티스트를 입력해주세요.'
    return
  }
  if (!formData.value.performanceVenue.trim()) {
    errorMessage.value = '공연 장소를 입력해주세요.'
    return
  }
  
  // 카테고리 배열을 JSON 문자열로 변환
  formData.value.performanceCategory = selectedCategories.value
  if (!formData.value.performanceDate) {
    errorMessage.value = '공연 날짜를 선택해주세요.'
    return
  }
  if (!formData.value.performanceTime) {
    errorMessage.value = '공연 시간을 선택해주세요.'
    return
  }
  if (!formData.value.performanceImage && !formData.value.performanceImagePreview) {
    errorMessage.value = '공연 포스터를 업로드해주세요.'
    return
  }
  if (!formData.value.performanceDescription.trim()) {
    errorMessage.value = '공연 상세 내용을 입력해주세요.'
    return
  }

  isLoading.value = true
  isUploading.value = false
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // 이미지 업로드 처리
    let imageUrl = formData.value.performanceImagePreview

    // 새 이미지가 업로드된 경우
    if (formData.value.performanceImage) {
      isUploading.value = true
      imageUrl = await uploadImage(formData.value.performanceImage)
      isUploading.value = false
    }

    const performanceData = {
      performanceName: formData.value.performanceName.trim(),
      performanceArtist: formData.value.performanceArtist.trim(),
      performanceVenue: formData.value.performanceVenue.trim(),
      performanceDate: formData.value.performanceDate,
      performanceTime: formatTimeForDisplay(formData.value.performanceTime),
      performanceCategory: JSON.stringify(formData.value.performanceCategory),
      performanceImage: imageUrl,
      performanceDescription: formData.value.performanceDescription.trim(),
    }

    const newPerformance = await createPerformance(performanceData)
    successMessage.value = '공연이 등록되었습니다.'
    // 선택 페이지로 이동
    setTimeout(() => {
      navigateTo('/performance-management/select')
    }, 1500)
  } catch (error: any) {
    console.error('공연 등록 에러:', error)
    errorMessage.value =
      error?.response?.data?.message ||
      error?.message ||
      '공연 등록 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
    isUploading.value = false
  }
}

const handleResetRunningTime = () => {
  formData.value.runningTime = ''
}

const handleFindAddress = () => {
  // TODO: 카카오 주소 검색 API 연동
  alert('주소 찾기 기능은 준비 중입니다.')
}

const toggleCategory = (category: string) => {
  const index = selectedCategories.value.indexOf(category)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(category)
  }
}
</script>

<template>
  <div class="performance-create-page">
    <div class="content-header">
      <NuxtLink to="/performance-management/select" class="back-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </NuxtLink>
      <div>
        <h1 class="page-title">새 공연 등록</h1>
        <p class="page-subtitle">공연 정보를 입력하고 등록하세요.</p>
      </div>
    </div>

    <div class="content-body">
      <form @submit.prevent="handleSubmit" class="form">
        <!-- 에러/성공 메시지 -->
        <div v-if="errorMessage" class="alert alert--error">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="alert alert--success">
          {{ successMessage }}
        </div>

        <!-- 공연 기본 정보 섹션 -->
        <section class="form-section">
          <h2 class="section-title">공연 기본 정보</h2>
          
          <div class="form-grid">
            <!-- 왼쪽 컬럼 -->
            <div class="form-column">
              <!-- 공연 이름 -->
              <div class="form-group">
                <label for="performanceName" class="form-label">
                  공연 이름 <span class="required">*</span>
                </label>
                <input
                  id="performanceName"
                  v-model="formData.performanceName"
                  type="text"
                  class="form-input"
                  placeholder="공연 이름을 입력해주세요"
                  maxlength="255"
                  required
                />
                <p class="form-hint form-hint--normal">최대 25글자까지 쓸 수 있어요.</p>
              </div>

              <!-- 아티스트 -->
              <div class="form-group">
                <label for="performanceArtist" class="form-label">
                  아티스트 <span class="required">*</span>
                </label>
                <input
                  id="performanceArtist"
                  v-model="formData.performanceArtist"
                  type="text"
                  class="form-input"
                  placeholder="아티스트 이름을 입력해주세요"
                  maxlength="255"
                  required
                />
              </div>

              <!-- 공연 날짜와 시간 -->
              <div class="form-group">
                <label for="performanceDate" class="form-label">
                  공연 날짜와 시간을 입력해주세요 <span class="required">*</span>
                </label>
                <div class="date-time-group">
                  <div class="date-input-wrapper">
                    <input
                      id="performanceDate"
                      v-model="formData.performanceDate"
                      type="date"
                      class="form-input form-input--date"
                      required
                    />
                    <svg
                      class="input-icon"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 2v2M14 2v2M3 6h14M4 4h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <div class="time-input-wrapper">
                    <input
                      id="performanceTime"
                      v-model="formData.performanceTime"
                      type="time"
                      class="form-input form-input--time"
                      required
                    />
                    <svg
                      class="input-icon"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 5v5l3 2M10 19a9 9 0 100-18 9 9 0 000 18z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <div class="running-time-wrapper">
                    <input
                      id="runningTime"
                      v-model.number="formData.runningTime"
                      type="number"
                      class="form-input form-input--running-time"
                      placeholder="러닝타임"
                      min="0"
                    />
                    <span class="running-time-unit">분</span>
                  </div>
                </div>
              </div>

              <!-- 카테고리 -->
              <div class="form-group">
                <label class="form-label">카테고리</label>
                <p class="form-hint form-hint--normal">
                  공연 장르를 선택해주세요 (여러 개 선택 가능)
                </p>
                <div class="category-tags">
                  <button
                    v-for="category in categoryOptions"
                    :key="category"
                    type="button"
                    class="category-tag"
                    :class="{ 'category-tag--active': selectedCategories.includes(category) }"
                    @click="toggleCategory(category)"
                  >
                    {{ category }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 오른쪽 컬럼 -->
            <div class="form-column">
              <!-- 공연 장소 -->
              <div class="form-group">
                <div class="form-label-row">
                  <label for="performanceVenue" class="form-label">
                    공연 장소 <span class="required">*</span>
                  </label>
                  <button
                    type="button"
                    class="btn btn--find-address"
                    @click="handleFindAddress"
                  >
                    주소 찾기
                  </button>
                </div>
                <input
                  id="performanceVenue"
                  v-model="formData.performanceVenue"
                  type="text"
                  class="form-input"
                  placeholder="공연장 이름을 적어주세요"
                  required
                />
              </div>

              <!-- 상세주소 -->
              <div class="form-group">
                <label for="detailedAddress" class="form-label">
                  상세주소 <span class="required">*</span>
                </label>
                <p class="form-hint">중요! 상세주소를 그대로 적어주세요!</p>
                <input
                  id="detailedAddress"
                  v-model="formData.detailedAddress"
                  type="text"
                  class="form-input"
                  placeholder="상세주소를 입력해주세요"
                  required
                />
              </div>

              <!-- 지도 영역 (플레이스홀더) -->
              <div class="map-container">
                <div class="map-placeholder">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 10c-4.418 0-8 3.582-8 8 0 6 8 14 8 14s8-8 8-14c0-4.418-3.582-8-8-8zm0 11a3 3 0 100-6 3 3 0 000 6z"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <p>지도 영역</p>
                  <p class="map-scale">100m</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 공연 포스터 업로드 섹션 -->
        <section class="form-section">
          <h2 class="section-title">공연 포스터</h2>
          <label class="form-label">
            공연 포스터 <span class="required">*</span>
          </label>
          <div class="upload-guidelines">
            <p class="guideline guideline--red">
              포스터 이미지는 표준 종이규격 (A,B) 에 최적화되어 있어요.
            </p>
            <p class="guideline guideline--red">
              사진형식은 JPG, JPEG, PNG만 가능해요.
            </p>
          </div>

          <div
            class="upload-area"
            :class="{ 'upload-area--has-image': formData.performanceImagePreview }"
            @dragover="handleDragOver"
            @drop="handleDrop"
            @click="handleFileInputClick"
          >
            <input
              ref="fileInputRef"
              id="fileInput"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              class="file-input"
              @change="handleFileSelect"
            />

            <div v-if="formData.performanceImagePreview" class="upload-preview">
              <img
                :src="formData.performanceImagePreview"
                alt="공연 포스터 미리보기"
                class="preview-image"
              />
              <button
                type="button"
                class="remove-image-btn"
                @click.stop="
                  () => {
                    formData.performanceImage = null
                    formData.performanceImagePreview = null
                  }
                "
              >
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

            <div v-else class="upload-placeholder">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  width="48"
                  height="48"
                  rx="8"
                  fill="#f3f4f6"
                  stroke="#9ca3af"
                  stroke-width="2"
                  stroke-dasharray="4 4"
                />
                <path
                  d="M24 16v16M16 24h16"
                  stroke="#9ca3af"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <p class="upload-text">
                여기에 이미지를 드래그 앤 드롭 또는 클릭해서 업로드 할 수 있어요
              </p>
            </div>
          </div>
        </section>

        <!-- 공연 상세 내용 섹션 -->
        <section class="form-section">
          <h2 class="section-title">공연 상세 내용</h2>
          <label for="performanceDescription" class="form-label">
            공연 상세 내용 <span class="required">*</span>
          </label>
          <p class="form-hint form-hint--normal">공연 상세 내용을 적어주세요</p>
          <textarea
            id="performanceDescription"
            v-model="formData.performanceDescription"
            class="form-textarea"
            rows="10"
            placeholder="공연에 대한 상세한 설명을 입력해주세요..."
            required
          ></textarea>
        </section>

        <!-- 체크리스트 섹션 -->
        <section class="checklist-section">
          <h2 class="section-title">체크리스트</h2>
          <p class="section-description">
            공연을 등록하기 이전에 필수로 수행 되어야 할 체크리스트 입니다.
          </p>
          <div class="checklist-items">
            <div class="checklist-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="8" stroke="#9ca3af" stroke-width="1.5"/>
              </svg>
              <span>공연 기본 정보</span>
            </div>
            <div class="checklist-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="8" stroke="#9ca3af" stroke-width="1.5"/>
              </svg>
              <span>공연 이미지 / 상세 정보 작성</span>
            </div>
            <div class="checklist-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="8" stroke="#9ca3af" stroke-width="1.5"/>
              </svg>
              <span>하나 이상의 티켓 생성</span>
            </div>
          </div>
        </section>

        <!-- 유의사항 섹션 -->
        <section class="notes-section">
          <h2 class="section-title">유의사항</h2>
          <div class="notes-content">
            <p>
              예매 마감 및 환불 마감은 공연 시작 시간 이전으로 설정되어야 합니다.
            </p>
            <p>
              공연 기본 정보 탭의 정보는 공연 등록 이후 수정이 불가능합니다.
            </p>
            <p>
              결제 기능은 제휴 호스트에게만 제공됩니다.
            </p>
            <p>
              제휴 이전에는 무료 티켓 옵션과 계좌/티켓 가격 정보를 입력할 수 있습니다.
            </p>
            <p>
              제휴 호스트의 유료 티켓 정산은 카드 수수료 및 부가세를 제외한 금액으로 정산됩니다.
            </p>
            <p>
              정산 연락은 공연 종료 후 일주일 이내에 연락드립니다.
            </p>
            <div class="notes-subsection">
              <h3 class="subsection-title">티켓 관련</h3>
              <p>
                판매된 티켓은 공연 등록 이후 수정 및 삭제가 불가능합니다.
              </p>
              <p>
                "이미 판매된 티켓"은 사용자에게 판매되어 재고가 차감된 티켓을 의미합니다.
              </p>
              <p>
                공연 등록 이후에도 티켓 추가는 가능합니다.
              </p>
            </div>
          </div>
        </section>

        <!-- 제출 버튼 -->
        <div class="form-actions">
          <button
            type="button"
            class="btn btn--secondary"
            @click="() => navigateTo('/performance-management/select')"
          >
            취소
          </button>
          <button type="submit" class="btn btn--primary" :disabled="isLoading">
            {{ isLoading ? (isUploading ? '업로드 중...' : '저장 중...') : '공연 등록' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.performance-create-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 32px;
}

.content-header {
  max-width: 1200px;
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #374151;
  transition: all 0.2s;
  flex-shrink: 0;
  text-decoration: none;
}

.back-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: #6b7280;
}

.content-body {
  max-width: 1200px;
  margin: 0 auto;
}

.form {
  width: 100%;
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
}

.alert--error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.alert--success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.form-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-top: 24px;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: stretch;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0;
}

.form-label-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.form-label-row .form-label {
  flex: 1;
  margin: 0;
}

.required {
  color: #ef4444;
}

.form-hint {
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
  margin-top: 4px;
  margin-bottom: 0;
}

.form-hint--normal {
  color: #6b7280;
  font-weight: 400;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: #ffffff;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.date-time-group {
  display: flex;
  gap: 12px;
}

.date-input-wrapper,
.time-input-wrapper {
  position: relative;
  flex: 1;
}

.running-time-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.form-input--date,
.form-input--time {
  padding-right: 40px;
}

.form-input--running-time {
  padding-right: 50px;
}

.running-time-unit {
  position: absolute;
  right: 16px;
  font-size: 14px;
  color: #6b7280;
  pointer-events: none;
}

.input-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.category-tag {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.category-tag:hover {
  border-color: #7c3aed;
  color: #7c3aed;
  background: #f5f3ff;
}

.category-tag--active {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #ffffff;
}

.category-tag--active:hover {
  background: #6d28d9;
  border-color: #6d28d9;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn--find-address {
  background: #7c3aed;
  color: #ffffff;
  padding: 8px 16px;
  white-space: nowrap;
  height: fit-content;
}

.btn--find-address:hover {
  background: #6d28d9;
}

.btn--primary {
  background: #7c3aed;
  color: #ffffff;
}

.btn--primary:hover:not(:disabled) {
  background: #6d28d9;
}

.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn--secondary:hover {
  background: #e5e7eb;
}

.map-container {
  width: 100%;
  height: 400px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb;
  position: relative;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #9ca3af;
  position: relative;
}

.map-placeholder p {
  margin: 0;
  font-size: 14px;
}

.map-scale {
  position: absolute;
  bottom: 12px;
  left: 12px;
  font-size: 12px;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
}

.upload-guidelines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.guideline {
  font-size: 12px;
}

.guideline--red {
  color: #ef4444;
}

.upload-area {
  width: 100%;
  min-height: 400px;
  border: 2px dashed #7c3aed;
  border-radius: 12px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.upload-area:hover {
  border-color: #6d28d9;
  background: #f3f4f6;
}

.upload-area--has-image {
  border-style: solid;
  border-color: #d1d5db;
  background: #ffffff;
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
}

.upload-text {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  max-width: 300px;
}

.upload-preview {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.preview-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
  border-radius: 8px;
}

.remove-image-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.remove-image-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: #ffffff;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-textarea:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

/* 체크리스트 섹션 */
.checklist-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.checklist-section .section-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.section-description {
  margin: 0 0 20px;
  font-size: 14px;
  color: #6b7280;
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #374151;
}

/* 유의사항 섹션 */
.notes-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
}

.notes-section .section-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.notes-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
}

.notes-content p {
  margin: 0;
}

.notes-subsection {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.subsection-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
}

@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .performance-create-page {
    padding: 16px;
  }

  .content-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
