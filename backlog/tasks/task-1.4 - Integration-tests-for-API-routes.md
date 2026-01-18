---
id: task-1.4
title: Integration tests for API routes
status: To Do
assignee: []
created_date: '2026-01-18 08:18'
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
- [ ] #1 MSW handlers mock Anthropic API responses
- [ ] #2 Tests exist for /api/screen POST endpoint
- [ ] #3 Tests exist for /api/evaluate streaming endpoint
- [ ] #4 Error handling tested (rate limits, invalid input, API errors)
- [ ] #5 Response structure validated against schemas
<!-- AC:END -->
