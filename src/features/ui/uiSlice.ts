import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { DashboardFilters, UiState } from '@/types'

const initialState: UiState = {
  currentTab: 'interviewee',
  dashboardFilters: {
    searchTerm: '',
    sortBy: 'score-desc',
  },
  welcomeBackCandidateId: undefined,
  lastViewedCandidateId: undefined,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrentTab: (state, action: PayloadAction<UiState['currentTab']>) => {
      state.currentTab = action.payload
    },
    setDashboardFilters: (state, action: PayloadAction<Partial<DashboardFilters>>) => {
      state.dashboardFilters = {
        ...state.dashboardFilters,
        ...action.payload,
      }
    },
    setWelcomeBackCandidate: (
      state,
      action: PayloadAction<string | undefined>,
    ) => {
      state.welcomeBackCandidateId = action.payload
    },
    setLastViewedCandidate: (
      state,
      action: PayloadAction<string | undefined>,
    ) => {
      state.lastViewedCandidateId = action.payload
    },
  },
})

export const {
  setCurrentTab,
  setDashboardFilters,
  setWelcomeBackCandidate,
  setLastViewedCandidate,
} = uiSlice.actions

export const uiReducer = uiSlice.reducer
