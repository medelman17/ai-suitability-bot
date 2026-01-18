'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, CheckSquare, Square, Copy, Check } from 'lucide-react';

// Accept partial data during streaming
interface PartialQuestion {
  question?: string;
  whyItMatters?: string;
}

interface ActionChecklistProps {
  questions: PartialQuestion[];
}

export function ActionChecklist({ questions }: ActionChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  // Filter to only complete questions
  const validQuestions = questions.filter(q => q.question);

  const toggleCheck = (index: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const copyAsMarkdown = () => {
    const markdown = validQuestions
      .map((q) => `- [ ] **${q.question}**\n  ${q.whyItMatters || ''}`)
      .join('\n\n');

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!validQuestions || validQuestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Before You Build</h3>
        </div>
        <button
          onClick={copyAsMarkdown}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy as Markdown
            </>
          )}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Answer these questions before starting implementation:
      </p>

      <ul className="space-y-3">
        {validQuestions.map((q, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3"
          >
            <button
              onClick={() => toggleCheck(i)}
              className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {checked.has(i) ? (
                <CheckSquare className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <div className={checked.has(i) ? 'opacity-60' : ''}>
              <p className={`font-medium text-gray-900 ${checked.has(i) ? 'line-through' : ''}`}>
                {q.question}
              </p>
              {q.whyItMatters && <p className="text-sm text-gray-600 mt-0.5">{q.whyItMatters}</p>}
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          {checked.size} of {validQuestions.length} addressed
        </p>
      </div>
    </div>
  );
}
