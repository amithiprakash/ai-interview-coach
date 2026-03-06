import { InboxOutlined } from '@ant-design/icons'
import { Card, Typography, Upload, message } from 'antd'
import type { UploadProps } from 'antd'

const { Dragger } = Upload

interface ResumeUploadCardProps {
  onUpload: (file: File) => Promise<void> | void
  loading?: boolean
}

const ACCEPT = '.pdf,.docx'

export function ResumeUploadCard({ onUpload, loading }: ResumeUploadCardProps) {
  const props: UploadProps = {
    multiple: false,
    accept: ACCEPT,
    showUploadList: false,
    beforeUpload: async (file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !['pdf', 'docx'].includes(extension)) {
        message.error('Please upload a PDF or DOCX resume.')
        return Upload.LIST_IGNORE
      }

      try {
        await onUpload(file as File)
      } catch (error) {
        console.error(error)
        message.error(
          error instanceof Error
            ? error.message
            : 'Failed to read the resume. Please try again.',
        )
      }

      return Upload.LIST_IGNORE
    },
    disabled: loading,
  }

  return (
    <Card style={{ maxWidth: 560, margin: '0 auto' }} bordered>
      <Typography.Title level={3} style={{ textAlign: 'center' }}>
        Upload your resume to get started
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
        We&apos;ll extract your name, email, and phone number automatically. You can
        edit anything before the interview begins.
      </Typography.Paragraph>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click or drag PDF / DOCX file to this area to upload
        </p>
        <p className="ant-upload-hint">
          Your data stays in your browser. We use it only to personalize the
          interview.
        </p>
      </Dragger>
    </Card>
  )
}

export default ResumeUploadCard
