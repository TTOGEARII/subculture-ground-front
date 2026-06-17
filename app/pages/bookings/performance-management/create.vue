<script setup lang="ts">
import { useAuth } from '../../../composables/useAuth'
import { usePerformances } from '../../../composables/usePerformances'
import { useImageUrl } from '../../../composables/useImageUrl'
import { useApi } from '../../../composables/useUtil'
import { useKakaoMap, type KakaoPlace } from '../../../composables/useKakaoMap'

definePageMeta({
  layout: 'bookings',
})

const { isAuthenticated, user, fetchProfile } = useAuth()
const { createPerformance, createTicketInfo } = usePerformances()
const { loadSdk, searchPlaces } = useKakaoMap()
const { resolveImageUrl: getImageSrc } = useImageUrl()

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

// 티켓: 공연과 함께 등록. 종류 0=계좌송금(유료) / 1=무료 / 2=유료(제휴, 비활성)
const ticketTypes = [
  { value: 0, label: '계좌송금 티켓', desc: '계좌송금으로 티켓값을 받아요' },
  { value: 1, label: '무료티켓', desc: '무료로 발급하는 티켓이에요' },
  { value: 2, label: '유료티켓', desc: '제휴 호스트 전용', disabled: true },
]
const makeTicket = () => ({ ticketType: 1, ticketName: '', ticketPrice: 0, ticketMax: 100, ticketMin: 1 })
const tickets = ref([makeTicket()])
const addTicket = () => tickets.value.push(makeTicket())
const removeTicket = (i: number) => tickets.value.splice(i, 1)
const selectTicketType = (i: number, value: number) => {
  tickets.value[i].ticketType = value
  if (value === 1) tickets.value[i].ticketPrice = 0 // 무료는 가격 0 고정
}
// 이름이 있는 행만 등록 대상으로 검증한다(티켓은 선택). 문제 있으면 메시지 반환.
const validateTickets = (): string | null => {
  for (const [i, t] of tickets.value.entries()) {
    const name = t.ticketName.trim()
    if (!name) continue
    if (name.length > 12) return `${i + 1}번 티켓: 이름은 최대 12글자예요.`
    if (t.ticketMax < 1) return `${i + 1}번 티켓: 발행 매수는 1 이상이어야 해요.`
    if (t.ticketType !== 1 && t.ticketPrice <= 0) return `${i + 1}번 티켓: 유료 티켓은 가격을 입력해주세요.`
    if (t.ticketMin < 1 || t.ticketMin > t.ticketMax) return `${i + 1}번 티켓: 1인당 최소 매수가 올바르지 않아요.`
  }
  return null
}

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

  // 함께 등록할 티켓 검증 (공연 생성 전에 먼저 막는다)
  const ticketErr = validateTickets()
  if (ticketErr) {
    errorMessage.value = ticketErr
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
      performanceAddress: formData.value.detailedAddress.trim() || null,
      performanceLat: selectedPlace.value?.lat,
      performanceLng: selectedPlace.value?.lng,
      performanceDate: formData.value.performanceDate,
      performanceTime: formatTimeForDisplay(formData.value.performanceTime),
      performanceCategory: JSON.stringify(formData.value.performanceCategory),
      performanceImage: imageUrl,
      performanceDescription: formData.value.performanceDescription.trim(),
    }

    const newPerformance = await createPerformance(performanceData)

    // 입력된(이름 있는) 티켓들을 새 공연 idx로 함께 등록
    const ticketsToCreate = tickets.value.filter((t) => t.ticketName.trim())
    try {
      for (const t of ticketsToCreate) {
        await createTicketInfo({
          pmIdx: newPerformance.id,
          ticketName: t.ticketName.trim(),
          ticketType: t.ticketType,
          ticketPrice: t.ticketType === 1 ? 0 : t.ticketPrice,
          ticketMax: t.ticketMax,
          ticketMin: t.ticketMin,
        })
      }
    } catch (ticketErr: any) {
      // 공연은 이미 생성됨 — 티켓 일부 실패 시 티켓 관리로 보내 마저 등록하게 한다
      errorMessage.value =
        ticketErr?.response?.data?.message ||
        '공연은 등록됐지만 일부 티켓 생성에 실패했어요. 티켓 관리에서 확인해주세요.'
      setTimeout(() => {
        navigateTo(`/bookings/performance-management/tickets?id=${newPerformance.id}`)
      }, 1800)
      return
    }

    successMessage.value = ticketsToCreate.length
      ? `공연과 티켓 ${ticketsToCreate.length}개가 등록되었습니다.`
      : '공연이 등록되었습니다.'
    setTimeout(() => {
      navigateTo(
        ticketsToCreate.length
          ? `/bookings/performance-management/tickets?id=${newPerformance.id}`
          : '/bookings/performance-management/select',
      )
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

// ===== 공연장 주소 검색 (카카오맵) =====
const showAddressModal = ref(false)
const addressKeyword = ref('')
const addressResults = ref<KakaoPlace[]>([])
const isSearchingAddress = ref(false)
const addressSearchError = ref('')
const hasSearchedAddress = ref(false)

// 지도
const mapContainer = ref<HTMLElement | null>(null)
const selectedPlace = ref<{ name: string; address: string; lat: number; lng: number } | null>(null)
let kakaoMap: any = null
let kakaoMarker: any = null

const handleFindAddress = () => {
  addressKeyword.value = formData.value.performanceVenue || ''
  addressResults.value = []
  hasSearchedAddress.value = false
  addressSearchError.value = ''
  showAddressModal.value = true
}

const handleSearchPlaces = async () => {
  const keyword = addressKeyword.value.trim()
  if (!keyword) {
    addressSearchError.value = '공연장 이름을 입력해주세요.'
    return
  }
  isSearchingAddress.value = true
  addressSearchError.value = ''
  try {
    addressResults.value = await searchPlaces(keyword)
    hasSearchedAddress.value = true
  } catch (error: any) {
    addressSearchError.value = error?.message || '검색 중 오류가 발생했습니다.'
  } finally {
    isSearchingAddress.value = false
  }
}

const handleSelectPlace = async (place: KakaoPlace) => {
  formData.value.performanceVenue = place.place_name
  formData.value.detailedAddress = place.road_address_name || place.address_name
  selectedPlace.value = {
    name: place.place_name,
    address: place.road_address_name || place.address_name,
    lat: Number(place.y),
    lng: Number(place.x),
  }
  showAddressModal.value = false
  await nextTick()
  await renderMap()
}

const renderMap = async () => {
  if (!selectedPlace.value || !mapContainer.value) return
  try {
    const kakao = await loadSdk()
    const position = new kakao.maps.LatLng(selectedPlace.value.lat, selectedPlace.value.lng)
    if (!kakaoMap) {
      kakaoMap = new kakao.maps.Map(mapContainer.value, { center: position, level: 3 })
      kakaoMarker = new kakao.maps.Marker({ position })
      kakaoMarker.setMap(kakaoMap)
    } else {
      kakaoMap.relayout()
      kakaoMap.setCenter(position)
      kakaoMarker.setPosition(position)
    }
  } catch (error) {
    console.error('지도 렌더링 실패:', error)
  }
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
      <NuxtLink to="/bookings/performance-management/select" class="back-button">
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

              <!-- 지도 영역 -->
              <div class="map-container">
                <div v-show="selectedPlace" ref="mapContainer" class="map-view"></div>
                <div v-if="!selectedPlace" class="map-placeholder">
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
                  <p>주소를 찾으면 지도가 표시됩니다</p>
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
                :src="getImageSrc(formData.performanceImagePreview)!"
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

        <!-- 티켓 섹션 (공연과 함께 등록) -->
        <section class="form-section">
          <h2 class="section-title">티켓</h2>
          <p class="form-hint form-hint--normal ticket-section__desc">
            공연과 함께 등록할 티켓이에요. 비워두면 나중에 티켓 관리에서 추가할 수 있어요.
          </p>

          <div class="ticket-builder">
            <article v-for="(ticket, i) in tickets" :key="i" class="ticket-card">
              <div class="ticket-card__head">
                <span class="ticket-card__no">티켓 {{ i + 1 }}</span>
                <button
                  v-if="tickets.length > 1"
                  type="button"
                  class="ticket-card__remove"
                  @click="removeTicket(i)"
                >
                  삭제
                </button>
              </div>

              <div class="form-group">
                <label class="form-label">티켓 종류</label>
                <div class="type-options">
                  <button
                    v-for="t in ticketTypes"
                    :key="t.value"
                    type="button"
                    class="type-option"
                    :class="{ 'is-active': ticket.ticketType === t.value }"
                    :disabled="t.disabled"
                    @click="selectTicketType(i, t.value)"
                  >
                    <span class="type-option__label">{{ t.label }}</span>
                    <span class="type-option__desc">{{ t.desc }}</span>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">티켓 이름</label>
                <input
                  v-model="ticket.ticketName"
                  type="text"
                  class="form-input"
                  placeholder="최대 12글자까지 쓸 수 있어요 (ex. 일반 티켓)"
                  maxlength="12"
                />
              </div>

              <div class="ticket-card__row">
                <div class="form-group">
                  <label class="form-label">티켓 가격</label>
                  <div class="input-suffix">
                    <input
                      v-model.number="ticket.ticketPrice"
                      type="number"
                      class="form-input"
                      min="0"
                      :disabled="ticket.ticketType === 1"
                      :placeholder="ticket.ticketType === 1 ? '무료' : '0'"
                    />
                    <span class="suffix">원</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">발행 매수</label>
                  <div class="input-suffix">
                    <input v-model.number="ticket.ticketMax" type="number" class="form-input" min="1" />
                    <span class="suffix">장</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">1인당 최소</label>
                  <div class="input-suffix">
                    <input v-model.number="ticket.ticketMin" type="number" class="form-input" min="1" />
                    <span class="suffix">매</span>
                  </div>
                </div>
              </div>
            </article>

            <button type="button" class="btn-add-ticket" @click="addTicket">
              + 티켓 추가
            </button>
          </div>
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
              제휴 이전에는 무료 티켓과 계좌/티켓 가격 정보를 입력할 수 있습니다.
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
            @click="() => navigateTo('/bookings/performance-management/select')"
          >
            취소
          </button>
          <button type="submit" class="btn btn--primary" :disabled="isLoading">
            {{ isLoading ? (isUploading ? '업로드 중...' : '저장 중...') : '공연 등록' }}
          </button>
        </div>
      </form>
    </div>

    <!-- 공연장 주소 검색 모달 -->
    <Modal
      :is-open="showAddressModal"
      title="공연장 주소 찾기"
      size="large"
      @close="showAddressModal = false"
    >
      <div class="address-search">
        <div class="address-search__bar">
          <input
            v-model="addressKeyword"
            type="text"
            class="form-input"
            placeholder="공연장 이름을 검색해주세요 (예: 올림픽홀, KSPO DOME)"
            @keyup.enter="handleSearchPlaces"
          />
          <button
            type="button"
            class="btn btn--search"
            :disabled="isSearchingAddress"
            @click="handleSearchPlaces"
          >
            {{ isSearchingAddress ? '검색 중...' : '검색' }}
          </button>
        </div>

        <p v-if="addressSearchError" class="address-search__error">
          {{ addressSearchError }}
        </p>

        <ul v-if="addressResults.length" class="address-results">
          <li
            v-for="place in addressResults"
            :key="place.id"
            class="address-result"
            @click="handleSelectPlace(place)"
          >
            <div class="address-result__name">{{ place.place_name }}</div>
            <div class="address-result__addr">
              {{ place.road_address_name || place.address_name }}
            </div>
            <div v-if="place.category_name" class="address-result__cat">
              {{ place.category_name }}
            </div>
          </li>
        </ul>

        <p
          v-else-if="hasSearchedAddress && !isSearchingAddress"
          class="address-search__empty"
        >
          검색 결과가 없습니다. 다른 키워드로 검색해보세요.
        </p>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.performance-create-page {
  min-height: 100vh;
  background: var(--color-page-bg);
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
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-body);
  transition: all 0.2s;
  flex-shrink: 0;
  text-decoration: none;
}

.back-button:hover {
  background: var(--color-surface-subtle);
  border-color: var(--color-border-strong);
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

.content-body {
  max-width: 1200px;
  margin: 0 auto;
}

.form {
  width: 100%;
}

.form-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-card);
}

.section-title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-top: 24px;
}

.running-time-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.form-input--running-time {
  padding-right: 50px;
}

.running-time-unit {
  position: absolute;
  right: 16px;
  font-size: 14px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.upload-guidelines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

/* 체크리스트 섹션 */
.checklist-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
}

.checklist-section .section-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.section-description {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--color-text-muted);
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
  color: var(--color-text-body);
}

/* 유의사항 섹션 */
.notes-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 32px;
}

.notes-section .section-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.notes-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  color: var(--color-text-body);
  line-height: 1.6;
}

.notes-content p {
  margin: 0;
}

.notes-subsection {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.subsection-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
}

/* 티켓 빌더 (공연과 함께 등록) */
.ticket-section__desc {
  margin-bottom: 16px;
}
.ticket-builder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ticket-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-subtle);
}
.ticket-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ticket-card__no {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}
.ticket-card__remove {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-muted);
}
.ticket-card__remove:hover {
  color: var(--color-danger);
}
.ticket-card__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.type-options {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.type-option.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.type-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.type-option__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.type-option__desc {
  font-size: 11px;
  color: var(--color-text-muted);
}
.input-suffix {
  position: relative;
  display: flex;
  align-items: center;
}
.input-suffix .form-input {
  padding-right: 36px;
}
.input-suffix .suffix {
  position: absolute;
  right: 14px;
  font-size: 14px;
  color: var(--color-text-muted);
  pointer-events: none;
}
.btn-add-ticket {
  padding: 12px;
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-primary-tint);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-add-ticket:hover {
  background: #ede9fe;
}

@media (max-width: 600px) {
  .ticket-card__row {
    grid-template-columns: 1fr;
  }
  .type-options {
    flex-direction: column;
  }
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

  .page-title {
    font-size: 22px;
  }

  .form-section,
  .checklist-section,
  .notes-section {
    padding: 20px 16px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .btn {
    width: 100%;
  }

  /* 날짜·시간·러닝타임이 한 줄에 다 들어가 넘치므로 줄바꿈 허용 */
  .date-time-group {
    flex-wrap: wrap;
  }

  .date-input-wrapper,
  .time-input-wrapper,
  .running-time-wrapper {
    flex: 1 1 140px;
  }
}
</style>
