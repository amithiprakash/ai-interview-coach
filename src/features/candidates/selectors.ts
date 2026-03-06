import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import type { CandidateRecord } from '@/types'

const selectCandidatesEntities = (state: RootState) => state.candidates.entities
const selectCandidateOrder = (state: RootState) => state.candidates.order

export const selectCandidatesList = createSelector(
  [selectCandidatesEntities, selectCandidateOrder],
  (entities, order) => order.map((id) => entities[id]).filter(Boolean) as CandidateRecord[],
)

export const selectActiveCandidateId = (state: RootState) =>
  state.candidates.activeCandidateId

export const selectActiveCandidate = createSelector(
  [selectCandidatesEntities, selectActiveCandidateId],
  (entities, id) => (id ? entities[id] : undefined),
)

export const selectCandidateById = (id: string) => (state: RootState) =>
  state.candidates.entities[id]

export const selectDashboardFilters = (state: RootState) => state.ui.dashboardFilters

export const selectDashboardRows = createSelector(
  [selectCandidatesList, selectDashboardFilters],
  (candidates, filters) => {
    const searchTerm = filters.searchTerm.trim().toLowerCase()

    const filtered = searchTerm
      ? candidates.filter((candidate) => {
          const haystack = [
            candidate.profile.name,
            candidate.profile.email,
            candidate.profile.phone,
            candidate.summary?.finalRemark,
          ]
            .filter(Boolean)
            .join(' ') // simple search
            .toLowerCase()

          return haystack.includes(searchTerm)
        })
      : candidates

    const sorted = [...filtered]

    if (filters.sortBy === 'recent') {
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    } else {
      sorted.sort((a, b) => {
        const scoreA = a.summary?.overallScore ?? 0
        const scoreB = b.summary?.overallScore ?? 0
        return filters.sortBy === 'score-desc' ? scoreB - scoreA : scoreA - scoreB
      })
    }

    return sorted
  },
)

export const selectOutstandingProfileFields = createSelector(
  [selectActiveCandidate],
  (candidate) => {
    if (!candidate) return [] as Array<'name' | 'email' | 'phone'>
    const missing: Array<'name' | 'email' | 'phone'> = []
    if (!candidate.profile.name) missing.push('name')
    if (!candidate.profile.email) missing.push('email')
    if (!candidate.profile.phone) missing.push('phone')
    return missing
  },
)

export const selectCurrentQuestion = createSelector(
  [selectActiveCandidate],
  (candidate) => {
    if (!candidate) return undefined
    return candidate.interview.questions[candidate.interview.currentQuestionIndex]
  },
)

export const selectInterviewProgress = createSelector(
  [selectActiveCandidate],
  (candidate) => {
    if (!candidate) return { answered: 0, total: 0 }
    return {
      answered: candidate.interview.answers.length,
      total: candidate.interview.questions.length,
    }
  },
)
