import { fileOpen } from 'browser-fs-access'

export interface FileReadResult {
  name: string
  content: string
  size: number
  type: string
}

export async function readLocalFile(): Promise<FileReadResult> {
  const file = await fileOpen({
    extensions: ['.txt', '.md', '.json', '.csv', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.xml', '.yaml', '.yml'],
    description: 'Text files',
  })

  const content = await file.text()
  return {
    name: file.name,
    content,
    size: file.size,
    type: file.type || 'text/plain',
  }
}

export async function readFileContent(file: File): Promise<FileReadResult> {
  const content = await file.text()
  return {
    name: file.name,
    content,
    size: file.size,
    type: file.type || 'text/plain',
  }
}
