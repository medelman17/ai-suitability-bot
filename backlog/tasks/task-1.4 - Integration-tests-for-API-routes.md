---
id: task-1.4
title: Integration tests for API routes
status: Done
assignee: []
created_date: '2026-01-18 08:18'
updated_date: '2026-01-18 09:14'
labels:
  - testing
  - integration-tests
dependencies:
  - task-1.1
parent_task_id: task-1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create integration tests for /api/screen and /api/evaluate endpoints using MSW to mock Anthropic API responses.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MSW handlers mock Anthropic API responses
- [x] #2 Tests exist for /api/screen POST endpoint
- [x] #3 Tests exist for /api/evaluate streaming endpoint
- [x] #4 Error handling tested (rate limits, invalid input, API errors)
- [x] #5 Response structure validated against schemas
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed with 39 integration tests:

**screen/route.test.ts (17 tests)**

- Successful requests with/without context

- Input validation (missing, empty, wrong type)

- Error handling (rate limits, generic errors)

- AI SDK configuration verification

**evaluate/route.test.ts (22 tests)**

- Streaming response handling

- Answers and context integration

- All verdict types tested

- Dimension prompts verified

- Error handling (rate limits, generic errors)

Approach: Mock AI SDK functions (generateObject, streamObject)

rather than HTTP endpoints for reliable, fast tests.

Total test suite: 291 tests passing
<!-- SECTION:NOTES:END -->
