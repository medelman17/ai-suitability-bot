'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

interface ProblemIntakeProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const EXAMPLE_PROMPTS = [
  'We want to automatically categorize incoming customer support tickets and route them to the right team...',
  'We need AI to generate product descriptions for our e-commerce catalog with human review...',
  'We want to auto-approve loan applications under $50k without human review...',
  'We need to predict which sales leads will convert so our team can prioritize outreach...',
];

export function ProblemIntake({ value, onChange, onSubmit, isLoading }: ProblemIntakeProps) {
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          AI Suitability Screener
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Describe your business problem to get an honest assessment of whether AI is the right solution.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-2">
            What problem are you considering solving with AI?
          </label>
          <textarea
            id="problem"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe your business problem in detail. Include information about current processes, volume, error tolerance, and any constraints..."
            className="w-full h-48 p-4 text-gray-900 bg-white border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            disabled={isLoading}
          />
          <div className="absolute bottom-3 right-3 text-sm text-gray-400">
            {value.length} characters
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {showExamples ? 'Hide examples' : 'Show example problems'}
          </button>

          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze This Problem
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {showExamples && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Click an example to use it:</p>
            <div className="space-y-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange(prompt)}
                  className="w-full text-left p-3 text-sm text-gray-600 bg-white rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
