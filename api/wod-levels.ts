import { handleLevelRequest } from '../src/levelApi.ts'

export function POST(request: Request): Promise<Response> {
  return handleLevelRequest(request)
}
