'use client';

/**
 * PipelineResults - Final results composition for completed pipeline analysis.
 *
 * Composes the final result display including:
 * - Verdict with confidence
 * - Dimension breakdown
 * - Risk analysis
 * - Alternative approaches
 * - Architecture recommendations
 * - Pre-build questions
 *
 * @module components/pipeline/pipeline-results
 */

import { motion } from 'framer-motion';
import {
  Shield,
  Lightbulb,
  GitBranch,
  HelpCircle,
  FileText,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import type { AnalysisResult, RiskFactor, Alternative, RecommendedArchitecture, PreBuildQuestion } from '@/lib/pipeline';
import { VerdictDisplay } from '@/components/verdict-display';
import { DimensionBreakdown } from '@/components/dimension-breakdown';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PipelineResultsProps {
  result: AnalysisResult | null;
  isStreaming?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

interface ResultSectionProps {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  delay?: number;
  children: React.ReactNode;
}

function ResultSection({
  title,
  icon: Icon,
  iconBg,
  iconColor,
  delay = 0,
  children
}: ResultSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

interface RiskAnalysisProps {
  risks: RiskFactor[];
}

function RiskAnalysis({ risks }: RiskAnalysisProps) {
  const [expandedRisk, setExpandedRisk] = useState<number | null>(null);

  if (!risks || risks.length === 0) return null;

  const severityColors = {
    high: {
      badge: 'error' as const,
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800'
    },
    medium: {
      badge: 'warning' as const,
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800'
    },
    low: {
      badge: 'default' as const,
      bg: 'bg-slate-50 dark:bg-slate-800/50',
      border: 'border-slate-200 dark:border-slate-700'
    }
  };

  return (
    <ResultSection
      title="Risk Analysis"
      icon={Shield}
      iconBg="bg-red-100 dark:bg-red-900/30"
      iconColor="text-red-600 dark:text-red-400"
      delay={0.3}
    >
      <div className="space-y-3">
        {risks.map((risk, index) => {
          const config = severityColors[risk.severity];
          const isExpanded = expandedRisk === index;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <Card
                variant="ghost"
                padding="none"
                className={`${config.bg} border ${config.border}`}
              >
                <button
                  onClick={() => setExpandedRisk(isExpanded ? null : index)}
                  className="w-full p-4 flex items-start gap-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 dark:text-white text-sm">
                        {risk.risk}
                      </span>
                      <Badge variant={config.badge} size="sm">
                        {risk.severity}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {risk.likelihood} likelihood
                      </Badge>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isExpanded && risk.mitigation && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="pt-3">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Mitigation
                      </span>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {risk.mitigation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </ResultSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ALTERNATIVES
// ═══════════════════════════════════════════════════════════════════════════

interface AlternativesDisplayProps {
  alternatives: Alternative[];
}

function AlternativesDisplay({ alternatives }: AlternativesDisplayProps) {
  if (!alternatives || alternatives.length === 0) return null;

  const typeLabels: Record<Alternative['type'], string> = {
    rule_based: 'Rule-Based',
    traditional_ml: 'Traditional ML',
    human_process: 'Human Process',
    hybrid: 'Hybrid Approach',
    no_change: 'No Change'
  };

  const effortColors = {
    low: 'success' as const,
    medium: 'warning' as const,
    high: 'error' as const
  };

  return (
    <ResultSection
      title="Alternative Approaches"
      icon={GitBranch}
      iconBg="bg-indigo-100 dark:bg-indigo-900/30"
      iconColor="text-indigo-600 dark:text-indigo-400"
      delay={0.5}
    >
      <div className="space-y-4">
        {alternatives.map((alt, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
          >
            <Card variant="default" padding="md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {alt.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" size="sm">
                      {typeLabels[alt.type]}
                    </Badge>
                    <Badge variant={effortColors[alt.estimatedEffort]} size="sm">
                      {alt.estimatedEffort} effort
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {alt.description}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase">
                    Advantages
                  </span>
                  <ul className="mt-1 space-y-1">
                    {alt.advantages.slice(0, 3).map((adv, i) => (
                      <li key={i} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1">
                        <span className="mt-1">+</span>
                        {adv}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <span className="text-xs font-medium text-red-700 dark:text-red-400 uppercase">
                    Disadvantages
                  </span>
                  <ul className="mt-1 space-y-1">
                    {alt.disadvantages.slice(0, 3).map((dis, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                        <span className="mt-1">-</span>
                        {dis}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {alt.whenToChoose && (
                <p className="text-xs text-slate-500 mt-3 italic">
                  <Lightbulb className="w-3 h-3 inline mr-1" />
                  {alt.whenToChoose}
                </p>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </ResultSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE RECOMMENDATION
// ═══════════════════════════════════════════════════════════════════════════

interface ArchitectureDisplayProps {
  architecture: RecommendedArchitecture | null;
}

function ArchitectureDisplay({ architecture }: ArchitectureDisplayProps) {
  if (!architecture) return null;

  return (
    <ResultSection
      title="Recommended Architecture"
      icon={GitBranch}
      iconBg="bg-purple-100 dark:bg-purple-900/30"
      iconColor="text-purple-600 dark:text-purple-400"
      delay={0.7}
    >
      <Card variant="default" padding="md">
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {architecture.description}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {architecture.components.map((component, i) => (
            <Badge key={i} variant="secondary" size="sm">
              {component}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm">
          {architecture.humanInLoop && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <HelpCircle className="w-4 h-4" />
              <span>Human-in-the-loop required</span>
            </div>
          )}
          {architecture.confidenceThreshold && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span>Confidence threshold: {Math.round(architecture.confidenceThreshold * 100)}%</span>
            </div>
          )}
        </div>
      </Card>
    </ResultSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRE-BUILD QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════

interface PreBuildQuestionsProps {
  questions: PreBuildQuestion[];
}

function PreBuildQuestionsDisplay({ questions }: PreBuildQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <ResultSection
      title="Questions Before Building"
      icon={HelpCircle}
      iconBg="bg-blue-100 dark:bg-blue-900/30"
      iconColor="text-blue-600 dark:text-blue-400"
      delay={0.9}
    >
      <div className="space-y-3">
        {questions.map((q, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + index * 0.1 }}
          >
            <Card
              variant="ghost"
              padding="md"
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">
                    {q.question}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {q.whyItMatters}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </ResultSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REASONING SECTION
// ═══════════════════════════════════════════════════════════════════════════

interface ReasoningDisplayProps {
  reasoning: string;
}

function ReasoningDisplay({ reasoning }: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!reasoning) return null;

  const isLong = reasoning.length > 500;
  const displayText = isLong && !isExpanded
    ? reasoning.slice(0, 500) + '...'
    : reasoning;

  return (
    <ResultSection
      title="Detailed Reasoning"
      icon={FileText}
      iconBg="bg-slate-100 dark:bg-slate-800"
      iconColor="text-slate-600 dark:text-slate-400"
      delay={1.1}
    >
      <Card variant="ghost" padding="md" className="bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </Card>
    </ResultSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PipelineResults({ result, isStreaming }: PipelineResultsProps) {
  if (!result) return null;

  // Map dimensions to the format expected by DimensionBreakdown
  const dimensionsForBreakdown = result.dimensions.map(d => ({
    id: d.id,
    name: d.name,
    score: d.score,
    reasoning: d.reasoning,
    evidence: d.evidence,
    weight: d.weight
  }));

  return (
    <div className="space-y-8">
      {/* Verdict */}
      {result.verdict && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <VerdictDisplay
            verdict={result.verdict}
            confidence={result.confidence}
            summary={result.summary}
            isStreaming={isStreaming}
          />
        </motion.div>
      )}

      {/* Dimension Breakdown */}
      {dimensionsForBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DimensionBreakdown dimensions={dimensionsForBreakdown} />
        </motion.div>
      )}

      {/* Risk Analysis */}
      <RiskAnalysis risks={result.risks} />

      {/* Alternative Approaches */}
      <AlternativesDisplay alternatives={result.alternatives} />

      {/* Architecture Recommendation */}
      <ArchitectureDisplay architecture={result.architecture} />

      {/* Pre-build Questions */}
      <PreBuildQuestionsDisplay questions={result.questionsBeforeBuilding} />

      {/* Detailed Reasoning */}
      <ReasoningDisplay reasoning={result.reasoning} />
    </div>
  );
}

export default PipelineResults;
