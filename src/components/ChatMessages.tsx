import { Typography, Tag } from 'antd'
import type { ChatMessage } from '@/types'
import './ChatMessages.css'

const { Text } = Typography

interface ChatMessagesProps {
  messages: ChatMessage[]
}

const senderLabel: Record<ChatMessage['sender'], string> = {
  assistant: 'Assistant',
  candidate: 'You',
  system: 'System',
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div className="chat-window">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`chat-message chat-message--${message.sender}`}
        >
          <div className="chat-message__header">
            <Text strong>{senderLabel[message.sender]}</Text>
            <span className="chat-message__timestamp">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="chat-message__bubble">
            {message.kind === 'question' && (
              <Tag color="blue" className="chat-message__tag">
                Question
              </Tag>
            )}
            {message.kind === 'summary' && (
              <Tag color="green" className="chat-message__tag">
                Summary
              </Tag>
            )}
            <Text>{message.content}</Text>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChatMessages
