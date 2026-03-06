export type MessageSender = 'assistant' | 'candidate' | 'system'

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface CandidateProfile {
  id: string
  name?: string
  email?: string
  phone?: string
  resumeText?: string
  resumeFileName?: string
  resumeFileType?: string
}

export interface ChatMessage {
  id: string
  sender: MessageSender
  timestamp: string
  content: string
  kind?: 'info' | 'question' | 'answer' | 'summary' | 'system'
  meta?: Record<string, unknown>
}

export interface InterviewQuestion {
  id: string
  prompt: string
  difficulty: QuestionDifficulty
  expectedKeywords?: string[]
}

export interface AnswerRecord {
  questionId: string
  response: string
  durationMs: number
  autoSubmitted: boolean
  submittedAt: string
  score: number
  reasoning: string
}

export type InterviewStatus =
  | 'collecting'
  | 'awaiting-start'
  | 'in-progress'
  | 'paused'
  | 'completed'

export interface ActiveTimerState {
  questionId: string
  startedAt?: string
  durationMs: number
  remainingMsOnPause?: number
  paused?: boolean
}

export interface CandidateInterview {
  status: InterviewStatus
  startedAt?: string
  completedAt?: string
  currentQuestionIndex: number
  questions: InterviewQuestion[]
  answers: AnswerRecord[]
  activeTimer?: ActiveTimerState
}

export interface CandidateSummary {
  overallScore: number
  strengths: string[]
  areasToImprove: string[]
  finalRemark: string
}

export interface CandidateRecord {
  id: string
  createdAt: string
  updatedAt: string
  profile: CandidateProfile
  interview: CandidateInterview
  chat: ChatMessage[]
  summary?: CandidateSummary
}

export interface DashboardFilters {
  searchTerm: string
  sortBy: 'score-desc' | 'score-asc' | 'recent'
}

export interface RootStateShape {
  candidates: CandidatesState
  ui: UiState
}

export interface CandidatesState {
  entities: Record<string, CandidateRecord>
  order: string[]
  activeCandidateId?: string
}

export interface UiState {
  currentTab: 'interviewee' | 'interviewer'
  dashboardFilters: DashboardFilters
  welcomeBackCandidateId?: string
  lastViewedCandidateId?: string
}
