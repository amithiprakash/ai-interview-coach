import type { InterviewQuestion, QuestionDifficulty } from '@/types'
import { v4 as uuid } from 'uuid'

export const QUESTION_TIMINGS: Record<QuestionDifficulty, number> = {
  easy: 20_000,
  medium: 60_000,
  hard: 120_000,
}

const QUESTION_BANK: Record<QuestionDifficulty, Array<Omit<InterviewQuestion, 'id'>>> = {
  easy: [
    {
      prompt:
        'Explain the difference between const, let, and var in JavaScript. When would you prefer each?',
      difficulty: 'easy',
      expectedKeywords: ['const', 'let', 'var', 'scope', 'hoisting'],
    },
    {
      prompt: 'What does JSX compile down to under the hood in React?',
      difficulty: 'easy',
      expectedKeywords: ['React.createElement', 'function', 'component'],
    },
    {
      prompt:
        'How would you describe the purpose of the package.json file in a Node.js project?',
      difficulty: 'easy',
      expectedKeywords: ['dependencies', 'scripts', 'metadata'],
    },
    {
      prompt: 'What problem does React Hooks solve compared to class components?',
      difficulty: 'easy',
      expectedKeywords: ['state', 'reusability', 'classes', 'hooks'],
    },
  ],
  medium: [
    {
      prompt:
        'Describe how you would structure API error handling in an Express.js application that consumes a third-party service.',
      difficulty: 'medium',
      expectedKeywords: ['middleware', 'try/catch', 'async', 'logging', 'retries'],
    },
    {
      prompt:
        'Imagine a React list component becomes slow when rendering 1,000 items. What optimizations would you apply?',
      difficulty: 'medium',
      expectedKeywords: ['virtualization', 'memoization', 'key', 'pagination'],
    },
    {
      prompt:
        'Walk through how you would secure an API route in Node.js that requires both authentication and role-based authorization.',
      difficulty: 'medium',
      expectedKeywords: ['JWT', 'middleware', 'roles', 'permissions'],
    },
    {
      prompt:
        'Explain how React Query (or a similar data fetching library) helps manage server state compared to Redux.',
      difficulty: 'medium',
      expectedKeywords: ['cache', 'stale', 'mutations', 'server state'],
    },
  ],
  hard: [
    {
      prompt:
        'Design an end-to-end logging and monitoring pipeline for a Node.js microservice deployed on Kubernetes handling spikes in traffic.',
      difficulty: 'hard',
      expectedKeywords: ['monitoring', 'metrics', 'kubernetes', 'logging', 'scaling'],
    },
    {
      prompt:
        'How would you architect a multi-tenant SaaS dashboard using React and Node.js to ensure data isolation and efficient querying?',
      difficulty: 'hard',
      expectedKeywords: ['multi-tenant', 'isolation', 'database', 'sharding', 'security'],
    },
    {
      prompt:
        'Discuss your strategy to migrate a large React codebase from JavaScript to TypeScript without halting feature development.',
      difficulty: 'hard',
      expectedKeywords: ['incremental', 'tsconfig', 'types', 'automation'],
    },
    {
      prompt:
        'Outline a caching strategy for a Node.js API that serves personalized feeds with strict freshness requirements.',
      difficulty: 'hard',
      expectedKeywords: ['caching', 'invalidation', 'redis', 'freshness', 'strategy'],
    },
  ],
}

function pickRandom<T>(items: T[], count: number) {
  const copy = [...items]
  const selected: T[] = []
  while (selected.length < count && copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length)
    selected.push(copy.splice(index, 1)[0]!)
  }
  return selected
}

export function getFallbackQuestions() {
  const easy = pickRandom(QUESTION_BANK.easy, 2)
  const medium = pickRandom(QUESTION_BANK.medium, 2)
  const hard = pickRandom(QUESTION_BANK.hard, 2)

  const combined = [...easy, ...medium, ...hard]
  return combined.map((question) => ({ ...question, id: uuid() }))
}

