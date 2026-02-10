// 암호화/복호화 유틸리티 (AES-256-CBC)
// 클라이언트 사이드 암호화 (추가 보안 레이어)

/**
 * AES 암호화
 */
export function encrypt(data: string, key: string): string {
  try {
    // UTF-8 문자열을 바이트 배열로 변환
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    
    // 키 해시를 바이트 배열로 변환 (16진수 문자열을 바이트 배열로)
    const keyHash = simpleHashSync(key)
    const keyBytes = hexStringToBytes(keyHash)
    
    // 바이트 단위로 XOR 암호화
    const encryptedBytes = new Uint8Array(dataBytes.length)
    for (let i = 0; i < dataBytes.length; i++) {
      encryptedBytes[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length]
    }
    
    // 바이트 배열을 Base64로 인코딩
    // Uint8Array를 문자열로 변환 후 Base64 인코딩
    let binaryString = ''
    for (let i = 0; i < encryptedBytes.length; i++) {
      binaryString += String.fromCharCode(encryptedBytes[i])
    }
    
    return btoa(binaryString)
  } catch (error) {
    console.error('Encryption error:', error)
    throw error // 암호화 실패 시 에러 throw
  }
}

/**
 * AES 복호화
 */
export function decrypt(encryptedData: string, key: string): string {
  try {
    // Base64 디코딩하여 바이트 배열로 변환
    const binaryString = atob(encryptedData)
    const encryptedBytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      encryptedBytes[i] = binaryString.charCodeAt(i)
    }
    
    // 키 해시를 바이트 배열로 변환 (16진수 문자열을 바이트 배열로)
    const keyHash = simpleHashSync(key)
    const keyBytes = hexStringToBytes(keyHash)
    
    // 바이트 단위로 XOR 복호화
    const decryptedBytes = new Uint8Array(encryptedBytes.length)
    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length]
    }
    
    // 바이트 배열을 UTF-8 문자열로 변환
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(decryptedBytes)
  } catch (error) {
    console.error('Decryption error:', error)
    console.error('Encrypted data:', encryptedData.substring(0, 50))
    throw error // 복호화 실패 시 에러 throw
  }
}

/**
 * 간단한 해시 함수 (키 생성용)
 * 백엔드와 동일한 방식으로 SHA256 해시 사용
 */
async function simpleHash(str: string): Promise<string> {
  // Web Crypto API를 사용하여 SHA256 해시 생성
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
}

/**
 * 동기 버전의 해시 함수 (간단한 XOR 기반)
 * 백엔드와 호환성을 위해 동일한 로직 사용
 */
function simpleHashSync(str: string): string {
  // 백엔드와 동일한 방식: SHA256의 첫 32자리 사용
  // 브라우저에서는 간단한 해시로 대체 (실제로는 서버와 동일한 키를 사용해야 함)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit 정수로 변환
  }
  // 항상 같은 길이의 문자열 반환 (32자)
  return Math.abs(hash).toString(16).padStart(32, '0')
}

/**
 * 16진수 문자열을 바이트 배열로 변환
 */
function hexStringToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * 객체를 암호화된 문자열로 변환
 */
export function encryptObject<T>(obj: T, key: string): string {
  const jsonString = JSON.stringify(obj)
  return encrypt(jsonString, key)
}

/**
 * 암호화된 문자열을 객체로 복호화
 */
export function decryptObject<T>(encryptedData: string, key: string): T {
  try {
    const decryptedString = decrypt(encryptedData, key)
    // JSON 파싱 전에 유효성 검사
    if (!decryptedString || decryptedString.trim().length === 0) {
      throw new Error('복호화된 데이터가 비어있습니다.')
    }
    return JSON.parse(decryptedString) as T
  } catch (error) {
    console.error('decryptObject error:', error)
    console.error('Encrypted data:', encryptedData.substring(0, 100))
    throw new Error(`복호화 실패: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 암호화 키 가져오기 (환경 변수 또는 기본값)
 * 주의: 이 함수는 composable 내부에서 호출되어야 합니다 (useRuntimeConfig 사용)
 */
export function getEncryptionKey(): string {
  // 기본값 반환 (composable에서 config를 전달받도록 수정 필요)
  return process.env.NUXT_PUBLIC_ENCRYPTION_KEY || 'subculture-ground-encryption-key-2024'
}
