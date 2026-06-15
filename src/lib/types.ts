export interface Message {
  id: string
  username: string
  message: string
  created_at: string
  images: MessageImage[]
}

export interface MessageImage {
  id: string
  message_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
}

export interface SubmitMessageRequest {
  username: string
  message: string
  images: File[]
}

export interface SubmitMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}