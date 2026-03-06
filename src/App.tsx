import { useEffect, useMemo } from 'react'
import { Layout, Tabs, Typography, Badge } from 'antd'
import IntervieweeView from '@/features/interviewee/IntervieweeView'
import InterviewerView from '@/features/interviewer/InterviewerView'
import WelcomeBackModal from '@/components/WelcomeBackModal'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  selectActiveCandidate,
  selectCandidatesList,
} from '@/features/candidates/selectors'
import { pauseInterview } from '@/features/candidates/thunks'
import {
  setCurrentTab,
  setWelcomeBackCandidate,
} from '@/features/ui/uiSlice'
import './App.css'

const { Header, Content } = Layout
const { Title } = Typography

function App() {
  const dispatch = useAppDispatch()
  const currentTab = useAppSelector((state) => state.ui.currentTab)
  const candidates = useAppSelector(selectCandidatesList)
  const activeCandidate = useAppSelector(selectActiveCandidate)
  const welcomeBackId = useAppSelector((state) => state.ui.welcomeBackCandidateId)

  useEffect(() => {
    if (
      activeCandidate &&
      activeCandidate.interview.status === 'paused' &&
      !welcomeBackId
    ) {
      dispatch(setWelcomeBackCandidate(activeCandidate.id))
    }
  }, [activeCandidate, dispatch, welcomeBackId])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!activeCandidate) return
      if (activeCandidate.interview.status === 'in-progress') {
        dispatch(pauseInterview())
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [activeCandidate, dispatch])

  const tabItems = useMemo(
    () => [
      {
        key: 'interviewee',
        label: 'Interviewee',
        children: <IntervieweeView />,
      },
      {
        key: 'interviewer',
        label: (
          <span>
            Interviewer{' '}
            <Badge
              count={candidates.length}
              size="small"
              style={{ backgroundColor: '#3f51b5' }}
            />
          </span>
        ),
        children: <InterviewerView />,
      },
    ],
    [candidates.length],
  )

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <Title level={3} className="app-title">
          AI-Powered Interview Assistant
        </Title>
      </Header>
      <Content className="app-content">
        <Tabs
          items={tabItems}
          activeKey={currentTab}
          onChange={(key) => dispatch(setCurrentTab(key as 'interviewee' | 'interviewer'))}
        />
      </Content>
      <WelcomeBackModal />
    </Layout>
  )
}

export default App
