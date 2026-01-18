// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { http, HttpResponse } from 'msw'

/**
 * MSW handlers for mocking API routes.
 *
 * Add handlers here as you write integration tests for API routes.
 * Each handler intercepts network requests and returns mock responses.
 */
export const handlers = [
  // Example handler for /api/screen endpoint
  // Uncomment and customize when writing integration tests
  //
  // http.post('/api/screen', async () => {
  //   return HttpResponse.json({
  //     questions: [
  //       { id: '1', text: 'What is your primary use case?' },
  //     ],
  //   })
  // }),

  // Example handler for /api/evaluate endpoint (streaming)
  // http.post('/api/evaluate', async () => {
  //   const stream = new ReadableStream({
  //     start(controller) {
  //       controller.enqueue(new TextEncoder().encode('data: {...}\n\n'))
  //       controller.close()
  //     },
  //   })
  //   return new HttpResponse(stream, {
  //     headers: { 'Content-Type': 'text/event-stream' },
  //   })
  // }),
]
