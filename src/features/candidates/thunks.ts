import { createAsyncThunk } from '@reduxjs/toolkit'
import { v4 as uuid } from 'uuid'
import type { RootState } from '@/app/store'
import type { ChatMessage } from '@/types'
import {
  appendChatMessage,
  createCandidateSession,
  recordAnswer,
  setActiveTimer,
  setCandidateSummary,
  setInterviewQuestions,
  setInterviewStatus,
  advanceQuestion,
  updateProfileField,
} from './candidatesSlice'
import {
  selectActiveCandidate,
  selectOutstandingProfileFields,
} from './selectors'
import { parseResumeFile } from '@/utils/resumeParser'
import { generateQuestionsOrFallback } from '@/services/gemini'
import { QUESTION_TIMINGS } from '@/utils/questionBank'
import { buildSummary, evaluateAnswer } from '@/utils/scoring'
import { setWelcomeBackCandidate } from '@/features/ui/uiSlice'

function createMessage(
  sender: ChatMessage['sender'],
  content: string,
  kind: ChatMessage['kind'] = 'info',
): ChatMessage {
  return {
    id: uuid(),
    sender,
    content,
    timestamp: new Date().toISOString(),
    kind,
  }
}

function formatMissingFields(fields: Array<'name' | 'email' | 'phone'>) {
  return fields
    .map((field) => field.charAt(0).toUpperCase() + field.slice(1))
    .join(', ')
}

function validateProfileField(
  field: 'name' | 'email' | 'phone',
  value: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = value.trim()
  if (!trimmed) {
    return {
      ok: false,
      message: `Please provide a valid ${field}.`,
    }
  }

  if (field === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      return {
        ok: false,
        message: 'That email does not look valid. Could you double-check it?',
      }
    }
  }

  if (field === 'phone') {
    const phoneRegex = /^(\+?\d{1,3}[\s-]?)?(\d{10})$/
    const digitsOnly = trimmed.replace(/[^\d]/g, '')
    if (!phoneRegex.test(trimmed) && digitsOnly.length < 10) {
      return {
        ok: false,
        message: 'Please share a phone number with at least 10 digits.',
      }
    }
  }

  if (field === 'name' && trimmed.split(/\s+/).length < 2) {
    return {
      ok: false,
      message: 'Could you provide your full name?',
    }
  }

  return { ok: true, value: trimmed }
}

export const ingestResume = createAsyncThunk<
  { candidateId: string },
  { file: File }
>('candidates/ingestResume', async ({ file }, { dispatch }) => {
  const parsed = await parseResumeFile(file)

  const action = createCandidateSession({
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    resumeText: parsed.text,
    resumeFileName: file.name,
    resumeFileType: file.type,
  })

  const created = dispatch(action)
  const candidate = created.payload

  const missing: Array<'name' | 'email' | 'phone'> = []
  if (!parsed.name) missing.push('name')
  if (!parsed.email) missing.push('email')
  if (!parsed.phone) missing.push('phone')

  const summaryParts = [
    'Resume uploaded successfully.',
    parsed.name ? `Name detected: ${parsed.name}` : 'Name missing in resume.',
    parsed.email ? `Email detected: ${parsed.email}` : 'Email missing in resume.',
    parsed.phone ? `Phone detected: ${parsed.phone}` : 'Phone missing in resume.',
  ]

  dispatch(
    appendChatMessage({
      candidateId: candidate.id,
      message: createMessage(
        'assistant',
        summaryParts.join(' '),
        'system',
      ),
    }),
  )

  if (missing.length > 0) {
    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage(
          'assistant',
          `Before we start, I still need ${formatMissingFields(missing)}. Let's tackle them one at a time—please provide your ${missing[0]}.`,
          'system',
        ),
      }),
    )
    dispatch(
      setInterviewStatus({
        candidateId: candidate.id,
        status: 'collecting',
      }),
    )
  } else {
    dispatch(
      setInterviewStatus({
        candidateId: candidate.id,
        status: 'awaiting-start',
      }),
    )
    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage(
          'assistant',
          "Great! We're ready to begin. Type 'start' or press the Start Interview button when you're ready.",
          'system',
        ),
      }),
    )
  }

  return { candidateId: candidate.id }
})

export const submitProfileField = createAsyncThunk<
  void,
  { field: 'name' | 'email' | 'phone'; value: string }
>('candidates/submitProfileField', async ({ field, value }, { dispatch, getState }) => {
  const state = getState() as RootState
  const candidate = selectActiveCandidate(state)
  if (!candidate) return

  dispatch(
    appendChatMessage({
      candidateId: candidate.id,
      message: createMessage('candidate', value, 'answer'),
    }),
  )

  const validation = validateProfileField(field, value)

  if (!validation.ok) {
    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage('assistant', validation.message, 'system'),
      }),
    )
    return
  }

  dispatch(
    updateProfileField({
      candidateId: candidate.id,
      field,
      value: validation.value,
    }),
  )

  const nextState = getState() as RootState
  const missing = selectOutstandingProfileFields(nextState)

  if (missing.length > 0) {
    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage(
          'assistant',
          `Thanks! Could you also share your ${missing[0]}?`,
          'system',
        ),
      }),
    )
  } else {
    dispatch(
      setInterviewStatus({
        candidateId: candidate.id,
        status: 'awaiting-start',
      }),
    )
    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage(
          'assistant',
          "Awesome, we have everything we need. Type 'start' or hit the Start Interview button whenever you're ready!",
          'system',
        ),
      }),
    )
  }
})

export const startInterview = createAsyncThunk<void, void, { rejectValue: string }>(
  'candidates/startInterview',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as RootState
    const candidate = selectActiveCandidate(state)
    if (!candidate) {
      return rejectWithValue('No active candidate to start interview.')
    }

    const outstanding = selectOutstandingProfileFields(state)
    if (outstanding.length > 0) {
      return rejectWithValue('Profile still missing required fields.')
    }

    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage(
          'assistant',
          "Starting your timed interview now. You'll get six questions (2 easy, 2 medium, 2 hard). Take a deep breath and let's begin!",
          'system',
        ),
      }),
    )

    dispatch(
      setInterviewStatus({
        candidateId: candidate.id,
        status: 'in-progress',
      }),
    )

    let questions = await generateQuestionsOrFallback({
      profile: candidate.profile,
      resumeText: candidate.profile.resumeText,
    })

    if (questions.length !== 6) {
      questions = questions.slice(0, 6)
    }

    dispatch(setInterviewQuestions({ candidateId: candidate.id, questions }))

    const firstQuestion = questions[0]

    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage(
          'assistant',
          `Question 1 (${firstQuestion.difficulty.toUpperCase()} · ${QUESTION_TIMINGS[firstQuestion.difficulty] / 1000}s): ${firstQuestion.prompt}`,
          'question',
        ),
      }),
    )

    dispatch(
      setActiveTimer({
        candidateId: candidate.id,
        timer: {
          questionId: firstQuestion.id,
          startedAt: new Date().toISOString(),
          durationMs: QUESTION_TIMINGS[firstQuestion.difficulty],
          paused: false,
        },
      }),
    )
  },
)

export const submitAnswer = createAsyncThunk<
  void,
  { response: string; autoSubmitted?: boolean }
>('candidates/submitAnswer', async ({ response, autoSubmitted = false }, { dispatch, getState }) => {
  const state = getState() as RootState
  const candidate = selectActiveCandidate(state)
  if (!candidate) return

  const question =
    candidate.interview.questions[candidate.interview.currentQuestionIndex]
  if (!question) return

  const now = new Date().toISOString()

  if (!autoSubmitted || response.trim()) {
    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage('candidate', response, 'answer'),
      }),
    )
  } else {
    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage(
          'assistant',
          "⏰ Time's up! Let's move to the next question.",
          'system',
        ),
      }),
    )
  }

  const timer = candidate.interview.activeTimer
  const elapsed = timer?.startedAt
    ? Math.max(Date.now() - new Date(timer.startedAt).getTime(), 0)
    : QUESTION_TIMINGS[question.difficulty]

  const evaluation = evaluateAnswer(question, response, elapsed, autoSubmitted)

  dispatch(
    recordAnswer({
      candidateId: candidate.id,
      answer: {
        questionId: question.id,
        response,
        durationMs: elapsed,
        autoSubmitted,
        submittedAt: now,
        score: evaluation.score,
        reasoning: evaluation.reasoning,
      },
    }),
  )

  dispatch(
    appendChatMessage({
      candidateId: candidate.id,
      message: createMessage(
        'assistant',
        evaluation.reasoning,
        'system',
      ),
    }),
  )

  dispatch(advanceQuestion({ candidateId: candidate.id }))

  const updatedState = getState() as RootState
  const updatedCandidate = selectActiveCandidate(updatedState)
  if (!updatedCandidate) return

  const nextIndex = updatedCandidate.interview.currentQuestionIndex
  const nextQuestion = updatedCandidate.interview.questions[nextIndex]

  if (nextQuestion) {
    dispatch(
      appendChatMessage({
        candidateId: updatedCandidate.id,
        message: createMessage(
          'assistant',
          `Question ${nextIndex + 1} (${nextQuestion.difficulty.toUpperCase()} · ${QUESTION_TIMINGS[nextQuestion.difficulty] / 1000}s): ${nextQuestion.prompt}`,
          'question',
        ),
      }),
    )

    dispatch(
      setActiveTimer({
        candidateId: updatedCandidate.id,
        timer: {
          questionId: nextQuestion.id,
          startedAt: new Date().toISOString(),
          durationMs: QUESTION_TIMINGS[nextQuestion.difficulty],
          paused: false,
        },
      }),
    )
  } else {
    dispatch(
      setActiveTimer({
        candidateId: updatedCandidate.id,
        timer: undefined,
      }),
    )

    const summary = buildSummary(updatedCandidate)
    dispatch(
      setCandidateSummary({
        candidateId: updatedCandidate.id,
        summary,
      }),
    )

    dispatch(
      setInterviewStatus({
        candidateId: updatedCandidate.id,
        status: 'completed',
      }),
    )

    dispatch(
      appendChatMessage({
        candidateId: updatedCandidate.id,
        message: createMessage(
          'assistant',
          `Interview complete! Final score: ${summary.overallScore}. ${summary.finalRemark}`,
          'summary',
        ),
      }),
    )
  }
})

export const pauseInterview = createAsyncThunk<void, void>(
  'candidates/pauseInterview',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState
    const candidate = selectActiveCandidate(state)
    if (!candidate) return

    const timer = candidate.interview.activeTimer
    if (timer && timer.startedAt) {
      const elapsed = Math.max(Date.now() - new Date(timer.startedAt).getTime(), 0)
      const remaining = Math.max(timer.durationMs - elapsed, 0)
      dispatch(
        setActiveTimer({
          candidateId: candidate.id,
          timer: {
            questionId: timer.questionId,
            durationMs: remaining,
            remainingMsOnPause: remaining,
            paused: true,
          },
        }),
      )
    }

    dispatch(
      setInterviewStatus({
        candidateId: candidate.id,
        status: 'paused',
      }),
    )

    dispatch(setWelcomeBackCandidate(candidate.id))

    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage(
          'assistant',
          'Interview paused. Resume when you are ready.',
          'system',
        ),
      }),
    )
  },
)

export const resumeInterview = createAsyncThunk<void, void>(
  'candidates/resumeInterview',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState
    const candidate = selectActiveCandidate(state)
    if (!candidate) return

    const timer = candidate.interview.activeTimer

    if (timer?.paused && timer.remainingMsOnPause) {
      dispatch(
        setActiveTimer({
          candidateId: candidate.id,
          timer: {
            questionId: timer.questionId,
            startedAt: new Date().toISOString(),
            durationMs: timer.remainingMsOnPause,
            paused: false,
          },
        }),
      )
    }

    dispatch(
      setInterviewStatus({
        candidateId: candidate.id,
        status: 'in-progress',
      }),
    )

    dispatch(
      appendChatMessage({
        candidateId: candidate.id,
        message: createMessage('assistant', 'Welcome back! Resuming the interview.', 'system'),
      }),
    )
  },
)
