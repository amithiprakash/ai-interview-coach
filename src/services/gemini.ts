import { GoogleGenerativeAI } from '@google/generative-ai'
import { v4 as uuid } from 'uuid'
import type { CandidateProfile, InterviewQuestion } from '@/types'
import { getFallbackQuestions } from '@/utils/questionBank'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? ''

const MODEL_CANDIDATES = ['gemini-pro'] as const

const modelCache = new Map<string, ReturnType<GoogleGenerativeAI['getGenerativeModel']>>()

function getModel(modelName: string) {
  if (!API_KEY) {
    return null
  }
  if (!modelCache.has(modelName)) {
    const client = new GoogleGenerativeAI(API_KEY)
    modelCache.set(
      modelName,
      client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
        systemInstruction:
          'You are an interviewer focusing on React and Node.js full stack skills. Generate concise, technical questions.',
      }),
    )
  }
  return modelCache.get(modelName) ?? null
}

interface GeminiQuestionResponse {
  prompt: string
  difficulty: 'easy' | 'medium' | 'hard'
  expectedKeywords?: string[]
}

function normalizeDifficulty(value: string): 'easy' | 'medium' | 'hard' {
  const lowered = value.toLowerCase()
  if (lowered.includes('hard')) return 'hard'
  if (lowered.includes('medium')) return 'medium'
  return 'easy'
}

export interface GeminiQuestionRequest {
  profile: CandidateProfile
  resumeText?: string
}

function parseGeminiResponse(text: string): InterviewQuestion[] {
  try {
    const parsed = JSON.parse(text) as { questions?: GeminiQuestionResponse[] }
    const questions = parsed.questions ?? []

    if (questions.length < 6) {
      throw new Error('Gemini returned fewer than 6 questions.')
    }

    return questions.slice(0, 6).map((question) => ({
      id: uuid(),
      prompt: question.prompt,
      difficulty: normalizeDifficulty(question.difficulty),
      expectedKeywords: question.expectedKeywords?.slice(0, 6) ?? [],
    }))
  } catch (error) {
    console.error('Failed to parse Gemini response', error, text)
    throw new Error('Failed to parse Gemini response.')
  }
}

export async function generateGeminiQuestions(
  request: GeminiQuestionRequest,
): Promise<InterviewQuestion[]> {
  if (!API_KEY) {
    throw new Error('Gemini API key missing. Provide VITE_GEMINI_API_KEY in your environment.')
  }

  const intro = [
    request.profile.name ? `Candidate: ${request.profile.name}` : null,
    request.profile.email ? `Email: ${request.profile.email}` : null,
    request.profile.phone ? `Phone: ${request.profile.phone}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `You are preparing a timed technical interview for a full-stack React/Node developer.
Resume snippet:
"""
${(request.resumeText ?? '').slice(0, 2000)}
"""

Return a JSON object with a "questions" array containing exactly 6 items ordered by difficulty: two easy, two medium, two hard.
Each item must be an object with keys: "prompt" (string question), "difficulty" (easy|medium|hard) and "expectedKeywords" (array of 3-5 keywords).
The questions must be concise and grounded in React, Node.js, TypeScript, system design, or web performance.`

  const payload = [intro, prompt].filter(Boolean).join('\n\n')

  let lastError: unknown

  for (const modelName of MODEL_CANDIDATES) {
    const model = getModel(modelName)
    if (!model) continue

    try {
      const result = await model.generateContent(payload)
      const text = result.response.text()
      return parseGeminiResponse(text)
    } catch (error) {
      lastError = error
      modelCache.delete(modelName)
      console.warn(`Gemini model ${modelName} failed; trying next fallback.`, error)
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Gemini request failed: ${lastError.message}`
      : 'Gemini request failed with an unknown error.',
  )
}

export async function generateQuestionsOrFallback(
  request: GeminiQuestionRequest,
): Promise<InterviewQuestion[]> {
  try {
    return await generateGeminiQuestions(request)
  } catch (error) {
    console.warn('Falling back to local question bank', error)
    return getFallbackQuestions()
  }
}
