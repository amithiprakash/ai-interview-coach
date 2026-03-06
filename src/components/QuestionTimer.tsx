import { useEffect, useMemo, useRef, useState } from 'react'
import { Progress, Typography, Tag } from 'antd'
import type { ActiveTimerState, QuestionDifficulty } from '@/types'
import { QUESTION_TIMINGS } from '@/utils/questionBank'

interface QuestionTimerProps {
  timer?: ActiveTimerState
  difficulty?: QuestionDifficulty
  onExpired: () => void
}

const difficultyColor: Record<QuestionDifficulty, string> = {
  easy: 'green',
  medium: 'orange',
  hard: 'red',
}

export function QuestionTimer({ timer, difficulty = 'easy', onExpired }: QuestionTimerProps) {
  const [remainingMs, setRemainingMs] = useState(() => timer?.durationMs ?? 0)
  const expiredRef = useRef(false)

  useEffect(() => {
    setRemainingMs(timer?.remainingMsOnPause ?? timer?.durationMs ?? 0)
    expiredRef.current = false
  }, [timer])

  useEffect(() => {
    if (!timer || timer.paused || !timer.startedAt) {
      return
    }

    const tick = () => {
      const elapsed = Date.now() - new Date(timer.startedAt!).getTime()
      const nextRemaining = Math.max(timer.durationMs - elapsed, 0)
      setRemainingMs(nextRemaining)

      if (nextRemaining <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpired()
      }
    }

    tick()
    const interval = window.setInterval(tick, 500)
    return () => window.clearInterval(interval)
  }, [timer, onExpired])

  const total = timer?.durationMs ?? QUESTION_TIMINGS[difficulty]
  const percent = total > 0 ? Math.max(0, Math.round((remainingMs / total) * 100)) : 0

  const label = useMemo(() => {
    if (!timer) return 'Ready'
    if (timer.paused) return 'Paused'
    const seconds = Math.ceil(remainingMs / 1000)
    return `${seconds}s left`
  }, [timer, remainingMs])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Progress
        type="dashboard"
        percent={percent}
        size={120}
        strokeColor={difficultyColor[difficulty]}
      />
      <div>
        <Typography.Title level={4} style={{ marginBottom: 8 }}>
          Timer
        </Typography.Title>
        <Typography.Text strong>{label}</Typography.Text>
        <div style={{ marginTop: 8 }}>
          <Tag color={difficultyColor[difficulty]}>{difficulty.toUpperCase()}</Tag>
        </div>
      </div>
    </div>
  )
}

export default QuestionTimer
