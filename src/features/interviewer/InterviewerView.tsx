import { useMemo, useState } from 'react'
import {
  Badge,
  Card,
  Col,
  Descriptions,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  selectCandidateById,
  selectDashboardRows,
} from '@/features/candidates/selectors'
import {
  setDashboardFilters,
  setLastViewedCandidate,
} from '@/features/ui/uiSlice'
import type { CandidateRecord } from '@/types'
import ChatMessages from '@/components/ChatMessages'

const { Title, Paragraph } = Typography

interface TableRow {
  key: string
  name: string
  email: string
  score: number
  status: string
  updatedAt: string
}

const statusColor: Record<string, string> = {
  collecting: 'gold',
  'awaiting-start': 'blue',
  'in-progress': 'geekblue',
  paused: 'orange',
  completed: 'green',
}

export function InterviewerView() {
  const dispatch = useAppDispatch()
  const candidates = useAppSelector(selectDashboardRows)
  const filters = useAppSelector((state) => state.ui.dashboardFilters)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  const selectedCandidate = useAppSelector((state) =>
    selectedCandidateId
      ? selectCandidateById(selectedCandidateId)(state)
      : undefined,
  )

  const dataSource: TableRow[] = useMemo(
    () =>
      candidates.map((candidate) => ({
        key: candidate.id,
        name: candidate.profile.name ?? 'Unknown candidate',
        email: candidate.profile.email ?? '—',
        score: candidate.summary?.overallScore ?? 0,
        status: candidate.interview.status,
        updatedAt: candidate.updatedAt,
      })),
    [candidates],
  )

  const columns: ColumnsType<TableRow> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (value: number) => `${value || 0}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={statusColor[value] ?? 'default'}>{value.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Last update',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string) => dayjs(value).format('MMM D, HH:mm'),
    },
  ]

  return (
    <div className="interviewer-view">
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Input.Search
              placeholder="Search by name or email"
              value={filters.searchTerm}
              onChange={(event) =>
                dispatch(
                  setDashboardFilters({ searchTerm: event.target.value }),
                )
              }
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              value={filters.sortBy}
              style={{ width: '100%' }}
              onChange={(value) => dispatch(setDashboardFilters({ sortBy: value }))}
              options={[
                { label: 'Score (high → low)', value: 'score-desc' },
                { label: 'Score (low → high)', value: 'score-asc' },
                { label: 'Most recent', value: 'recent' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={dataSource}
          columns={columns}
          pagination={{ pageSize: 6 }}
          onRow={(record) => ({
            onClick: () => {
              setSelectedCandidateId(record.key)
              dispatch(setLastViewedCandidate(record.key))
            },
          })}
          rowClassName="clickable-row"
        />
      </Card>

      <Modal
        open={Boolean(selectedCandidate)}
        onCancel={() => setSelectedCandidateId(null)}
        footer={null}
        centered
        width={780}
        title={selectedCandidate?.profile.name ?? 'Candidate details'}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
        destroyOnClose
      >
        {selectedCandidate && <CandidateDetails candidate={selectedCandidate} />}
      </Modal>
      </Space>
    </div>
  )
}

interface CandidateDetailsProps {
  candidate: CandidateRecord
}

function CandidateDetails({ candidate }: CandidateDetailsProps) {
  const summary = candidate.summary

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Email">
          {candidate.profile.email ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          {candidate.profile.phone ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Badge
            status="processing"
            color={statusColor[candidate.interview.status] ?? 'default'}
            text={candidate.interview.status}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Last update">
          {dayjs(candidate.updatedAt).format('MMM D, YYYY HH:mm')}
        </Descriptions.Item>
      </Descriptions>

      {summary && (
        <Card title="AI summary">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Statistic title="Final score" value={summary.overallScore} suffix="/ 100" />
            </Col>
            <Col span={12}>
              <Paragraph>{summary.finalRemark}</Paragraph>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
            <Col span={12}>
              <Title level={5}>Strengths</Title>
              {summary.strengths.map((item) => (
                <Tag key={item} color="green">
                  {item}
                </Tag>
              ))}
            </Col>
            <Col span={12}>
              <Title level={5}>Areas to improve</Title>
              {summary.areasToImprove.map((item) => (
                <Tag key={item} color="orange">
                  {item}
                </Tag>
              ))}
            </Col>
          </Row>
        </Card>
      )}

      <Card title="Chat history" bodyStyle={{ maxHeight: 320, overflow: 'auto' }}>
        <ChatMessages messages={candidate.chat} />
      </Card>

      <Card title="Full transcript" bodyStyle={{ maxHeight: 400, overflow: 'auto' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {candidate.interview.questions.map((question, index) => {
            const answer = candidate.interview.answers.find(
              (item) => item.questionId === question.id,
            )
            return (
              <Card key={question.id} size="small">
                <Title level={5}>
                  Question {index + 1} · {question.difficulty.toUpperCase()}
                </Title>
                <Paragraph>{question.prompt}</Paragraph>
                <Paragraph type="secondary">
                  Expected keywords:{' '}
                  {question.expectedKeywords?.length
                    ? question.expectedKeywords.join(', ')
                    : '—'}
                </Paragraph>
                {answer ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Paragraph>
                      <strong>Candidate:</strong> {answer.response || '(no answer)'}
                    </Paragraph>
                    <Paragraph>
                      <strong>Score:</strong> {answer.score} ·{' '}
                      {dayjs(answer.submittedAt).format('HH:mm:ss')}
                    </Paragraph>
                    <Paragraph type="secondary">{answer.reasoning}</Paragraph>
                  </Space>
                ) : (
                  <Paragraph>Not answered.</Paragraph>
                )}
              </Card>
            )
          })}
        </Space>
      </Card>
    </Space>
  )
}

export default InterviewerView
