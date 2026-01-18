'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Shield,
  Cpu,
  Users,
  Gauge,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

// ============================================================================
// TYPES
// ============================================================================

interface PartialFavorableFactor {
  factor?: string;
  explanation?: string;
}

interface PartialRiskFactor {
  risk?: string;
  severity?: 'low' | 'medium' | 'high';
  mitigation?: string;
}

interface PartialArchitecture {
  description?: string;
  components?: (string | undefined)[];
  humanInLoop?: boolean;
  confidenceThreshold?: number;
}

interface AnalysisDetailProps {
  favorableFactors: PartialFavorableFactor[];
  riskFactors: PartialRiskFactor[];
  recommendedArchitecture?: PartialArchitecture;
}

// ============================================================================
// SEVERITY CONFIGURATION
// ============================================================================

const severityConfig = {
  low: {
    badge: 'success' as const,
    label: 'Low',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  medium: {
    badge: 'warning' as const,
    label: 'Medium',
    color: 'text-amber-600 dark:text-amber-400',
  },
  high: {
    badge: 'error' as const,
    label: 'High',
    color: 'text-red-600 dark:text-red-400',
  },
};

// ============================================================================
// FAVORABLE FACTORS SECTION
// ============================================================================

function FavorableFactorsSection({
  factors,
}: {
  factors: PartialFavorableFactor[];
}) {
  const validFactors = factors.filter((f) => f.factor);

  if (validFactors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card
        variant="outlined"
        padding="lg"
        className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">
              Strengths
            </h4>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Favorable factors for AI implementation
            </p>
          </div>
        </div>

        <ul className="space-y-4">
          {validFactors.map((f, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="font-medium text-emerald-900 dark:text-emerald-100">
                  {f.factor}
                </p>
                {f.explanation && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                    {f.explanation}
                  </p>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// RISK FACTORS SECTION
// ============================================================================

function RiskFactorsSection({ factors }: { factors: PartialRiskFactor[] }) {
  const validFactors = factors.filter((r) => r.risk);

  if (validFactors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card
        variant="outlined"
        padding="lg"
        className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-200">
              Risks & Challenges
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Factors to consider and mitigate
            </p>
          </div>
        </div>

        <ul className="space-y-4">
          {validFactors.map((r, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-white/50 dark:bg-slate-900/30 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {r.risk}
                </p>
                {r.severity && (
                  <Badge variant={severityConfig[r.severity].badge} size="sm">
                    {severityConfig[r.severity].label}
                  </Badge>
                )}
              </div>
              {r.mitigation && (
                <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/50">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">Mitigation: </span>
                    {r.mitigation}
                  </p>
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// ARCHITECTURE SECTION
// ============================================================================

function ArchitectureSection({
  architecture,
}: {
  architecture: PartialArchitecture;
}) {
  if (!architecture.description) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card
        variant="outlined"
        padding="lg"
        className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">
              Recommended Architecture
            </h4>
            <p className="text-sm text-indigo-700 dark:text-indigo-400">
              Suggested implementation approach
            </p>
          </div>
        </div>

        <p className="text-indigo-900 dark:text-indigo-100 mb-5 leading-relaxed">
          {architecture.description}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Components */}
          {architecture.components &&
            architecture.components.filter(Boolean).length > 0 && (
              <div className="bg-white/50 dark:bg-slate-900/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                    Components
                  </span>
                </div>
                <ul className="space-y-2">
                  {architecture.components
                    .filter((c): c is string => Boolean(c))
                    .map((c, i) => (
                      <li
                        key={i}
                        className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {c}
                      </li>
                    ))}
                </ul>
              </div>
            )}

          {/* Settings */}
          <div className="space-y-3">
            {architecture.humanInLoop !== undefined && (
              <div className="bg-white/50 dark:bg-slate-900/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                      Human-in-Loop
                    </span>
                  </div>
                  <Badge
                    variant={architecture.humanInLoop ? 'success' : 'default'}
                    size="sm"
                  >
                    {architecture.humanInLoop ? 'Required' : 'Optional'}
                  </Badge>
                </div>
              </div>
            )}

            {architecture.confidenceThreshold && (
              <div className="bg-white/50 dark:bg-slate-900/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                      Confidence Threshold
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                    {Math.round(architecture.confidenceThreshold * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AnalysisDetail({
  favorableFactors,
  riskFactors,
  recommendedArchitecture,
}: AnalysisDetailProps) {
  return (
    <div className="space-y-4">
      <FavorableFactorsSection factors={favorableFactors} />
      <RiskFactorsSection factors={riskFactors} />
      {recommendedArchitecture && (
        <ArchitectureSection architecture={recommendedArchitecture} />
      )}
    </div>
  );
}
