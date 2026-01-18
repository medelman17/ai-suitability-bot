'use client';

import { ArrowRight, Loader2, MessageCircleQuestion } from 'lucide-react';
import type { ClarifyingQuestion } from '@/lib/schemas';

interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  partialInsights: string[];
  onAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function ClarifyingQuestions({
  questions,
  answers,
  partialInsights,
  onAnswer,
  onSubmit,
  isLoading
}: ClarifyingQuestionsProps) {
  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MessageCircleQuestion className="w-6 h-6 text-blue-700" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            A few clarifying questions
          </h2>
          <p className="text-sm text-gray-600">
            Your answers will help provide a more accurate assessment.
          </p>
        </div>
      </div>

      {partialInsights.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">What we can already infer:</p>
          <ul className="space-y-1">
            {partialInsights.map((insight, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-900 text-white text-sm font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-gray-900">{q.question}</p>
                <p className="text-sm text-gray-500 mt-1">{q.rationale}</p>
              </div>
            </div>

            {q.options ? (
              <div className="ml-10 space-y-2">
                {q.options.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      answers[q.id] === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={option.value}
                      checked={answers[q.id] === option.value}
                      onChange={() => onAnswer(q.id, option.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="ml-10">
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  placeholder="Enter your answer..."
                  className="w-full h-24 p-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onSubmit}
          disabled={!allAnswered || isLoading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Evaluating...
            </>
          ) : (
            <>
              Get Full Assessment
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
