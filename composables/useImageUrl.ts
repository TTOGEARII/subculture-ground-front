/**
 * 공연 이미지 등 업로드 이미지의 표시 URL을 환경(로컬/운영) 무관하게 절대화한다.
 * 백엔드는 `/uploads/<file>` 상대경로를 저장하지만, 과거엔 `http://localhost:3001/...`
 * 처럼 호스트가 박힌 절대 URL이 저장된 적이 있어 그대로 쓰면 운영에서 엑박이 난다.
 * 어떤 형태가 와도 `/uploads/` 이하만 잘라 `apiBase`로 다시 절대화한다.
 *
 * 처리 규칙:
 * - `data:` URL(업로드 직후 미리보기) → 그대로 통과
 * - 저장된 `/uploads/...` 경로(상대 또는 호스트 박힌 레거시 절대) → `apiBase + /uploads/...`
 * - 그 외 외부 `http(s)` URL → 그대로 통과
 */
export function useImageUrl() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const resolveImageUrl = (image?: string | null): string | null => {
    if (!image) return null
    if (image.startsWith('data:')) return image
    const uploadsIdx = image.indexOf('/uploads/')
    if (uploadsIdx >= 0) return `${apiBase}${image.slice(uploadsIdx)}`
    if (image.startsWith('http')) return image
    return `${apiBase}${image}`
  }

  return { resolveImageUrl }
}
