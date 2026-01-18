'use client';

import { useState, useCallback, useEffect } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { EvaluationResultSchema } from '@/lib/schemas';
import type { ScreeningResult, EvaluationResult } from '@/lib/schemas';

export type ScreenerPhase =
  | 'intake'
  | 'screening'
  | 'questions'
  | 'evaluating'
  | 'complete';

// Deep partial type to handle streaming object structure from AI SDK
type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type StreamingEvaluation = DeepPartial<EvaluationResult>;

interface UseScreenerReturn {
  phase: ScreenerPhase;
  problem: string;
  setProblem: (p: string) => void;
  screeningResult: ScreeningResult | null;
  answers: Record<string, string>;
  evaluation: StreamingEvaluation | null;
  isStreaming: boolean;
  error: Error | null;

  submitProblem: () => Promise<void>;
  answerQuestion: (questionId: string, answer: string) => void;
  submitAnswers: () => void;
  reset: () => void;
}

export function useScreener(): UseScreenerReturn {
  const [phase, setPhase] = useState<ScreenerPhase>('intake');
  const [problem, setProblem] = useState('');
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<Error | null>(null);

  // Streaming evaluation with useObject
  const {
    object: evaluation,
    submit: startEvaluation,
    isLoading: isStreaming,
    error: streamError
  } = useObject({
    api: '/api/evaluate',
    schema: EvaluationResultSchema
  });

  // Handle streaming errors
  useEffect(() => {
    if (streamError) {
      setError(streamError);
    }
  }, [streamError]);

  const submitProblem = useCallback(async () => {
    setPhase('screening');
    setError(null);

    try {
      const res = await fetch('/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Screening failed');
      }

      const result: ScreeningResult = await res.json();
      setScreeningResult(result);

      if (result.clarifyingQuestions.length > 0) {
        setPhase('questions');
      } else {
        // Skip to evaluation if no questions needed
        setPhase('evaluating');
        startEvaluation({ problem, answers: [], context: '' });
      }
    } catch (e) {
      setError(e as Error);
      setPhase('intake');
    }
  }, [problem, startEvaluation]);

  const answerQuestion = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const submitAnswers = useCallback(() => {
    if (!screeningResult) return;

    setPhase('evaluating');

    const formattedAnswers = screeningResult.clarifyingQuestions.map(q => ({
      question: q.question,
      answer: answers[q.id] || 'Not answered'
    }));

    startEvaluation({ problem, answers: formattedAnswers, context: '' });
  }, [problem, answers, screeningResult, startEvaluation]);

  // Watch for evaluation completion
  useEffect(() => {
    if (evaluation?.verdict && !isStreaming) {
      setPhase('complete');
    }
  }, [evaluation, isStreaming]);

  const reset = useCallback(() => {
    setPhase('intake');
    setProblem('');
    setScreeningResult(null);
    setAnswers({});
    setError(null);
  }, []);

  return {
    phase,
    problem,
    setProblem,
    screeningResult,
    answers,
    evaluation: (evaluation as StreamingEvaluation) ?? null,
    isStreaming,
    error,
    submitProblem,
    answerQuestion,
    submitAnswers,
    reset
  };
}
