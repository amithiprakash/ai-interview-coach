import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import type {
  AnswerRecord,
  CandidateRecord,
  CandidateSummary,
  ChatMessage,
  CandidateInterview,
  CandidateProfile,
  InterviewQuestion,
  InterviewStatus,
  CandidatesState,
} from '@/types'

const initialState: CandidatesState = {
  entities: {},
  order: [],
  activeCandidateId: undefined,
}

function ensureCandidate(state: CandidatesState, candidateId: string) {
  const candidate = state.entities[candidateId]
  if (!candidate) {
    throw new Error(`Candidate ${candidateId} not found`)
  }
  return candidate
}

function touch(candidate: CandidateRecord) {
  candidate.updatedAt = new Date().toISOString()
}

function createEmptyInterview(): CandidateInterview {
  return {
    status: 'collecting',
    questions: [],
    answers: [],
    currentQuestionIndex: 0,
  }
}

export interface AppendMessagePayload {
  candidateId: string
  message: ChatMessage
}

export interface UpdateProfilePayload {
  candidateId: string
  field: Exclude<keyof CandidateProfile, 'id'>
  value?: string
}

export interface SetQuestionsPayload {
  candidateId: string
  questions: InterviewQuestion[]
}

export interface SetStatusPayload {
  candidateId: string
  status: InterviewStatus
}

export interface SetTimerPayload {
  candidateId: string
  timer?: CandidateInterview['activeTimer']
}

export interface RecordAnswerPayload {
  candidateId: string
  answer: AnswerRecord
}

export interface SetSummaryPayload {
  candidateId: string
  summary: CandidateSummary
}

export const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    createCandidateSession: {
      reducer: (state, action: PayloadAction<CandidateRecord>) => {
        const candidate = action.payload
        state.entities[candidate.id] = candidate
        state.order = Array.from(new Set([candidate.id, ...state.order]))
        state.activeCandidateId = candidate.id
      },
      prepare: (profile: Partial<CandidateProfile>) => {
        const id = profile.id ?? nanoid()
        const timestamp = new Date().toISOString()
        const candidate: CandidateRecord = {
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
          profile: {
            id,
            ...profile,
          },
          interview: createEmptyInterview(),
          chat: [],
        }

        return { payload: candidate }
      },
    },
    setActiveCandidate: (state, action: PayloadAction<string | undefined>) => {
      state.activeCandidateId = action.payload
    },
    appendChatMessage: (state, action: PayloadAction<AppendMessagePayload>) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.chat.push(action.payload.message)
      touch(candidate)
    },
    updateProfileField: (state, action: PayloadAction<UpdateProfilePayload>) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.profile[action.payload.field] = action.payload.value
      touch(candidate)
    },
    setInterviewQuestions: (state, action: PayloadAction<SetQuestionsPayload>) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.interview.questions = action.payload.questions
      candidate.interview.currentQuestionIndex = 0
      candidate.interview.answers = []
      touch(candidate)
    },
    setInterviewStatus: (state, action: PayloadAction<SetStatusPayload>) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.interview.status = action.payload.status
      if (action.payload.status === 'in-progress' && !candidate.interview.startedAt) {
        candidate.interview.startedAt = new Date().toISOString()
      }
      if (action.payload.status === 'completed') {
        candidate.interview.completedAt = new Date().toISOString()
      }
      touch(candidate)
    },
    setActiveTimer: (state, action: PayloadAction<SetTimerPayload>) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.interview.activeTimer = action.payload.timer
      touch(candidate)
    },
    advanceQuestion: (state, action: PayloadAction<{ candidateId: string }>) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.interview.currentQuestionIndex += 1
      candidate.interview.activeTimer = undefined
      touch(candidate)
    },
    recordAnswer: (state, action: PayloadAction<RecordAnswerPayload>) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.interview.answers = [...candidate.interview.answers, action.payload.answer]
      touch(candidate)
    },
    setCandidateSummary: (state, action: PayloadAction<SetSummaryPayload>) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.summary = action.payload.summary
      touch(candidate)
    },
    resetCandidateInterview: (
      state,
      action: PayloadAction<{ candidateId: string }>,
    ) => {
      const candidate = ensureCandidate(state, action.payload.candidateId)
      candidate.interview = createEmptyInterview()
      candidate.chat = []
      touch(candidate)
    },
  },
})

export const {
  createCandidateSession,
  setActiveCandidate,
  appendChatMessage,
  updateProfileField,
  setInterviewQuestions,
  setInterviewStatus,
  setActiveTimer,
  advanceQuestion,
  recordAnswer,
  setCandidateSummary,
  resetCandidateInterview,
} = candidatesSlice.actions

export const candidatesReducer = candidatesSlice.reducer
