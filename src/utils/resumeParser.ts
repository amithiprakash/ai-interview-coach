import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'
import { extractRawText } from 'mammoth/mammoth.browser'

let isWorkerBootstrapped = false

export interface ResumeParseResult {
  text: string
  name?: string
  email?: string
  phone?: string
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function ensurePdfWorker() {
  if (!isWorkerBootstrapped) {
    GlobalWorkerOptions.workerPort = new PdfWorker()
    isWorkerBootstrapped = true
  }
}

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim()
}

export function isResumeFileValid(file: File) {
  if (ACCEPTED_TYPES.includes(file.type)) {
    return true
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension === 'pdf' || extension === 'docx'
}

async function parsePdf(arrayBuffer: ArrayBuffer) {
  ensurePdfWorker()

  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pageTexts: string[] = []

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)

    pageTexts.push(strings.join(' '))
  }

  return pageTexts.join('\n')
}

async function parseDocx(arrayBuffer: ArrayBuffer) {
  const result = await extractRawText({ arrayBuffer })
  return result.value
}

function extractName(text: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines.slice(0, 10)) {
    if (line.includes('@') || /\d/.test(line)) continue

    const match = line.match(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,3}$/)
    if (match) {
      return match[0]
    }
  }
  return undefined
}

function extractEmail(text: string) {
  const match = text.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)
  return match ? match[0] : undefined
}

function extractPhone(text: string) {
  const match = text.match(
    /(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?){2}\d{4}/,
  )
  if (!match) return undefined

  return match[0]
    .replace(/[\s(-)]/g, '')
    .replace(/^(\d{10})$/, '+1$1')
}

function extractFields(text: string) {
  const normalized = normalizeWhitespace(text)

  return {
    name: extractName(normalized),
    email: extractEmail(normalized),
    phone: extractPhone(normalized),
  }
}

export async function parseResumeFile(file: File): Promise<ResumeParseResult> {
  if (!isResumeFileValid(file)) {
    throw new Error('Only PDF or DOCX resumes are supported.')
  }

  const arrayBuffer = await file.arrayBuffer()
  const extension = file.name.split('.').pop()?.toLowerCase()
  let rawText = ''

  if (file.type === 'application/pdf' || extension === 'pdf') {
    rawText = await parsePdf(arrayBuffer)
  } else if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    rawText = await parseDocx(arrayBuffer)
  } else {
    throw new Error('Unsupported resume format.')
  }

  const fields = extractFields(rawText)

  return {
    text: rawText,
    ...fields,
  }
}
