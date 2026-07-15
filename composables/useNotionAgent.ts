import { ref } from 'vue'
import { useApi, useEncrypt } from './useUtil'

export interface CredentialStatus {
  hasNotionToken: boolean
  hasGeminiKey: boolean
  hasYoutubeKey: boolean
  notionWorkspace: string | null
}

export interface ToolCallTrace {
  tool: string
  input: Record<string, unknown>
  ok: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallTrace[]
}

/**
 * 노션 AI 에이전트 API 통신.
 * - 자격증명 저장은 암호화 필수(PUT /notion-agent/credentials)
 * - 상태 조회/채팅은 평문 + JWT
 */
export const useNotionAgent = () => {
  const api = useApi()
  const { encryptRequest } = useEncrypt()

  const status = ref<CredentialStatus | null>(null)
  const statusLoading = ref(false)

  const fetchStatus = async (): Promise<CredentialStatus> => {
    statusLoading.value = true
    try {
      const { data } = await api.get<CredentialStatus>('/notion-agent/credentials/status')
      status.value = data
      return data
    } finally {
      statusLoading.value = false
    }
  }

  const saveCredentials = async (dto: {
    notionToken?: string
    geminiKey?: string
    youtubeKey?: string
  }): Promise<void> => {
    await api.put('/notion-agent/credentials', encryptRequest(dto))
  }

  const deleteCredentials = async (): Promise<void> => {
    await api.delete('/notion-agent/credentials')
    status.value = null
  }

  /** 에이전트에게 메시지 전송. 도구 호출이 있으면 수십 초 걸릴 수 있어 타임아웃을 넉넉히 준다. */
  const sendMessage = async (
    message: string,
    history: ChatMessage[],
    model?: string,
  ): Promise<{ reply: string; toolCalls: ToolCallTrace[] }> => {
    const { data } = await api.post<{ reply: string; toolCalls: ToolCallTrace[] }>(
      '/notion-agent/chat',
      {
        message,
        // 백엔드는 텍스트 턴만 받는다 — 도구 트레이스는 UI 표시용이라 제외
        history: history.map((m) => ({ role: m.role, content: m.content })),
        model,
      },
      { timeout: 300_000 },
    )
    return data
  }

  return {
    status,
    statusLoading,
    fetchStatus,
    saveCredentials,
    deleteCredentials,
    sendMessage,
  }
}
