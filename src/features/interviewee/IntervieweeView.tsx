import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Statistic,
  Typography,
  message,
  Tag,
} from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'
import TextArea from 'antd/es/input/TextArea'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { ResumeUploadCard } from '@/components/ResumeUploadCard'
import ChatMessages from '@/components/ChatMessages'
import QuestionTimer from '@/components/QuestionTimer'
import {
  selectActiveCandidate,
  selectCurrentQuestion,
  selectInterviewProgress,
  selectOutstandingProfileFields,
} from '@/features/candidates/selectors'
import {
  ingestResume,
  pauseInterview,
  resumeInterview,
  startInterview,
  submitAnswer,
  submitProfileField,
} from '@/features/candidates/thunks'

const { Title, Paragraph } = Typography

export function IntervieweeView() {
  const dispatch = useAppDispatch()
  const candidate = useAppSelector(selectActiveCandidate)
  const missingFields = useAppSelector(selectOutstandingProfileFields)
  const currentQuestion = useAppSelector(selectCurrentQuestion)
  const progress = useAppSelector(selectInterviewProgress)

  const [uploading, setUploading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [collectingField, setCollectingField] = useState(false)
  const [answer, setAnswer] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [resuming, setResuming] = useState(false)

  const answerRef = useRef(answer)
  answerRef.current = answer

  const status = candidate?.interview.status

  const canUpload = !candidate || status === 'completed'

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        await dispatch(ingestResume({ file })).unwrap()
        message.success('Resume processed!')
      } catch (error) {
        console.error(error)
        message.error(
          error instanceof Error
            ? error.message
            : 'Could not process the resume. Please try another file.',
        )
      } finally {
        setUploading(false)
      }
    },
    [dispatch],
  )

  const handleProfileSubmit = useCallback(
    async (values: { response: string }) => {
      if (!missingFields.length) return
      setCollectingField(true)
      try {
        await dispatch(
          submitProfileField({ field: missingFields[0], value: values.response }),
        ).unwrap()
      } catch (error) {
        console.error(error)
      } finally {
        setCollectingField(false)
      }
    },
    [dispatch, missingFields],
  )

  const handleStartInterview = useCallback(async () => {
    setStarting(true)
    try {
      await dispatch(startInterview()).unwrap()
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      }
    } finally {
      setStarting(false)
    }
  }, [dispatch])

  const handleSubmitAnswer = useCallback(async () => {
    if (!answer.trim()) {
      message.warning('Please write your answer before submitting.')
      return
    }
    setSubmittingAnswer(true)
    try {
      await dispatch(
        submitAnswer({ response: answer.trim(), autoSubmitted: false }),
      ).unwrap()
      setAnswer('')
    } catch (error) {
      console.error(error)
      message.error('Could not submit your answer. Please try again.')
    } finally {
      setSubmittingAnswer(false)
    }
  }, [answer, dispatch])

  const handleTimerExpired = useCallback(() => {
    dispatch(
      submitAnswer({
        response: answerRef.current,
        autoSubmitted: true,
      }),
    )
    setAnswer('')
  }, [dispatch])

  const handlePauseInterview = useCallback(async () => {
    setPausing(true)
    try {
      await dispatch(pauseInterview()).unwrap()
      message.info('Interview paused. Come back when you are ready to resume.')
    } catch (error) {
      console.error(error)
      message.error('Could not pause the interview. Please try again.')
    } finally {
      setPausing(false)
    }
  }, [dispatch])

  const handleResumeInterview = useCallback(async () => {
    setResuming(true)
    try {
      await dispatch(resumeInterview()).unwrap()
      message.success('Welcome back! Resuming the interview.')
    } catch (error) {
      console.error(error)
      message.error('Could not resume the interview. Please try again.')
    } finally {
      setResuming(false)
    }
  }, [dispatch])

  const profileSummary = useMemo(() => {
    if (!candidate) return null
    return [
      candidate.profile.name ? `Name: ${candidate.profile.name}` : null,
      candidate.profile.email ? `Email: ${candidate.profile.email}` : null,
      candidate.profile.phone ? `Phone: ${candidate.profile.phone}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }, [candidate])

  return (
    <div className="interviewee-view">
      {!candidate && (
        <ResumeUploadCard onUpload={handleUpload} loading={uploading} />
      )}

      {candidate && (
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Card>
            <Row gutter={[16, 16]} align="middle">
              <Col flex="auto">
                <Title level={3} style={{ marginBottom: 4 }}>
                  {candidate.profile.name || 'Interview in progress'}
                </Title>
                {profileSummary && (
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    {profileSummary}
                  </Paragraph>
                )}
              </Col>
              <Col>
                <Statistic
                  title="Questions"
                  value={`${progress.answered}/${progress.total || 6}`}
                />
              </Col>
            </Row>
          </Card>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
              <Card title="Conversation" bodyStyle={{ padding: 0 }}>
                <ChatMessages messages={candidate.chat} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              {status === 'in-progress' && currentQuestion && (
                <Card>
                  <QuestionTimer
                    timer={candidate.interview.activeTimer}
                    difficulty={currentQuestion.difficulty}
                    onExpired={handleTimerExpired}
                  />
                </Card>
              )}

              {status === 'collecting' && missingFields.length > 0 && (
                <Card title={`Provide your ${missingFields[0]}`}>
                  <Form layout="vertical" onFinish={handleProfileSubmit}>
                    <Form.Item
                      name="response"
                      rules={[{ required: true, message: 'This field is required.' }]}
                    >
                      <Input placeholder={`Enter your ${missingFields[0]}`} />
                    </Form.Item>
                    <Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={collectingField}>
                          Submit
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>
              )}

              {status === 'awaiting-start' && (
                <Card>
                  <Space direction="vertical" size="middle">
                    <Paragraph>
                      Ready to begin? You&apos;ll face 6 questions with increasing
                      difficulty. Timers will auto-submit your answer when time is
                      up.
                    </Paragraph>
                    <Button
                      type="primary"
                      onClick={handleStartInterview}
                      loading={starting}
                    >
                      Start interview
                    </Button>
                  </Space>
                </Card>
              )}

              {status === 'in-progress' && currentQuestion && (
                <Card
                  title="Your answer"
                  extra={
                    <Button
                      icon={<PauseCircleOutlined />}
                      onClick={handlePauseInterview}
                      loading={pausing}
                    >
                      Pause
                    </Button>
                  }
                >
                  <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                    {currentQuestion.prompt}
                  </Paragraph>
                  <TextArea
                    rows={6}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Share your thought process, trade-offs, and examples."
                  />
                  <Space style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      onClick={handleSubmitAnswer}
                      loading={submittingAnswer}
                    >
                      Submit answer
                    </Button>
                    <Button onClick={() => setAnswer('')} disabled={submittingAnswer}>
                      Clear
                    </Button>
                  </Space>
                </Card>
              )}

              {status === 'paused' && (
                <Card title="Interview paused">
                  <Space direction="vertical" size="middle">
                    <Alert
                      message="Take your time. When you're ready, resume to pick up where you left off."
                      type="warning"
                      showIcon
                    />
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleResumeInterview}
                      loading={resuming}
                    >
                      Resume interview
                    </Button>
                  </Space>
                </Card>
              )}

              {status === 'completed' && candidate.summary && (
                <Card title="AI summary">
                  <Statistic
                    title="Final score"
                    value={candidate.summary.overallScore}
                    suffix="/ 100"
                    valueStyle={{ color: '#3f51b5' }}
                  />
                  <Space direction="vertical" style={{ marginTop: 16 }}>
                    <div>
                      <Title level={5}>Strengths</Title>
                      <Space size={[8, 8]} wrap>
                        {candidate.summary.strengths.map((item) => (
                          <Tag key={item} color="green">
                            {item}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                    <div>
                      <Title level={5}>Areas to improve</Title>
                      <Space size={[8, 8]} wrap>
                        {candidate.summary.areasToImprove.map((item) => (
                          <Tag key={item} color="orange">
                            {item}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                    <Alert
                      message={candidate.summary.finalRemark}
                      type="success"
                      showIcon
                    />
                  </Space>
                </Card>
              )}

              {canUpload && (
                <ResumeUploadCard
                  onUpload={handleUpload}
                  loading={uploading}
                />
              )}
            </Col>
          </Row>
        </Space>
      )}
    </div>
  )
}

export default IntervieweeView
