import type {
  CandidateRecord,
  CandidateSummary,
  InterviewQuestion,
} from '@/types'
import { QUESTION_TIMINGS } from './questionBank'

const BASE_POINTS = {
  easy: 10,
  medium: 20,
  hard: 30,
} as const

export interface ScoreResult {
  score: number
  reasoning: string
  keywordMatches: string[]
  coverageRatio: number
  lengthQuality: 'short' | 'ideal' | 'long'
}

function cleanText(text: string) {
  return text.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').toLowerCase()
}

export function evaluateAnswer(
  question: InterviewQuestion,
  response: string,
  durationMs: number,
  autoSubmitted: boolean,
): ScoreResult {
  if (!response.trim() || autoSubmitted) {
    return {
      score: 0,
      reasoning: 'The answer was empty or auto-submitted when the timer expired.',
      keywordMatches: [],
      coverageRatio: 0,
      lengthQuality: 'short',
    }
  }

  const base = BASE_POINTS[question.difficulty]
  const normalized = cleanText(response)
  const keywords = (question.expectedKeywords ?? []).map(cleanText)
  const matches: string[] = []

  keywords.forEach((keyword, idx) => {
    if (!keyword) return
    if (normalized.includes(keyword)) {
      matches.push(question.expectedKeywords?.[idx] ?? keyword)
    }
  })

  const coverageRatio = keywords.length > 0 ? matches.length / keywords.length : 0.5
  const durationRatio = Math.min(durationMs / (QUESTION_TIMINGS[question.difficulty] || 1), 1)
  const wordCount = response.trim().split(/\s+/).length
  let lengthQuality: ScoreResult['lengthQuality'] = 'ideal'

  if (wordCount < 30) {
    lengthQuality = 'short'
  } else if (wordCount > 180) {
    lengthQuality = 'long'
  }

  const lengthFactor = lengthQuality === 'ideal' ? 1 : lengthQuality === 'short' ? 0.7 : 0.85

  const score = Math.round(base * (0.5 + coverageRatio * 0.4 + durationRatio * 0.1) * lengthFactor)

  const reasoningParts = []
  if (matches.length) {
    reasoningParts.push(`Covered keywords: ${matches.join(', ')}`)
  } else if (keywords.length) {
    reasoningParts.push('Missed most of the expected keywords.')
  }

  if (lengthQuality === 'short') {
    reasoningParts.push('Answer felt brief; add more depth next time.')
  } else if (lengthQuality === 'long') {
    reasoningParts.push('Answer was quite long; try to focus on the most relevant points.')
  }

  if (!reasoningParts.length) {
    reasoningParts.push('Solid response overall.')
  }

  return {
    score,
    reasoning: reasoningParts.join(' '),
    keywordMatches: matches,
    coverageRatio,
    lengthQuality,
  }
}

export function buildSummary(candidate: CandidateRecord): CandidateSummary {
  const answered = candidate.interview.answers
  const totalPossible = candidate.interview.questions.reduce(
    (sum, q) => sum + BASE_POINTS[q.difficulty],
    0,
  )

  const achieved = answered.reduce((sum, answer) => sum + answer.score, 0)
  const overallScore = totalPossible > 0 ? Math.round((achieved / totalPossible) * 100) : 0

  const sortedAnswers = [...answered].sort((a, b) => b.score - a.score)
  const strengths = sortedAnswers
    .filter((answer) => answer.score >= BASE_POINTS.hard * 0.7)
    .slice(0, 3)
    .map((answer) => {
      const question = candidate.interview.questions.find(
        (q) => q.id === answer.questionId,
      )
      return question
        ? `${question.prompt.slice(0, 60)}${question.prompt.length > 60 ? '…' : ''}`
        : 'Strong domain knowledge'
    })

  const areasToImprove = sortedAnswers
    .filter((answer) => answer.score <= BASE_POINTS.easy * 0.4)
    .slice(0, 3)
    .map((answer) => {
      const question = candidate.interview.questions.find(
        (q) => q.id === answer.questionId,
      )
      if (!question) return 'Clarify reasoning in future answers.'
      return `Revisit: ${question.prompt.slice(0, 50)}${question.prompt.length > 50 ? '…' : ''}`
    })

  const finalRemark = overallScore >= 75
    ? 'Great performance with strong full-stack understanding.'
    : overallScore >= 55
      ? 'Decent interview; focus on deepening architectural discussions.'
      : 'Needs improvement on core full-stack concepts and communication.'

  return {
    overallScore,
    strengths: strengths.length ? strengths : ['Communicated clearly during the interview.'],
    areasToImprove: areasToImprove.length
      ? areasToImprove
      : ['Consider expanding answers with more concrete technical examples.'],
    finalRemark,
  }
}
