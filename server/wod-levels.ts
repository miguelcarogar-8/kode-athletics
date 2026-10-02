import { handleLevelRequest } from '../src/levelApi.ts'

export function POST(request: Request): Promise<Response> {
  return handle(request)
}

export default {
  async fetch(request: Request): Promise<Response> {
    return handle(request)
  },
}

async function handle(request: Request): Promise<Response> {
  try {
    return await handleLevelRequest(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron calcular los niveles.'
    return Response.json({ error: message }, { status: 500 })
  }
}
