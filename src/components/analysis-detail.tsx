'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Shield } from 'lucide-react';

// Accept partial data during streaming
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

export function AnalysisDetail({
  favorableFactors,
  riskFactors,
  recommendedArchitecture
}: AnalysisDetailProps) {
  return (
    <div className="space-y-6">
      {/* Favorable Factors */}
      {favorableFactors && favorableFactors.filter(f => f.factor).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-emerald-50 rounded-lg border border-emerald-200 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h4 className="font-semibold text-emerald-800">Favorable Factors</h4>
          </div>
          <ul className="space-y-3">
            {favorableFactors.filter(f => f.factor).map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-emerald-500 mt-1">✓</span>
                <div>
                  <span className="font-medium text-emerald-900">{f.factor}</span>
                  {f.explanation && <p className="text-sm text-emerald-700 mt-0.5">{f.explanation}</p>}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Risk Factors */}
      {riskFactors && riskFactors.filter(r => r.risk).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-amber-50 rounded-lg border border-amber-200 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-amber-800">Risk Factors</h4>
          </div>
          <ul className="space-y-3">
            {riskFactors.filter(r => r.risk).map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`mt-1 ${
                  r.severity === 'high' ? 'text-red-500' :
                  r.severity === 'medium' ? 'text-amber-500' :
                  'text-yellow-500'
                }`}>
                  ⚠
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-amber-900">{r.risk}</span>
                    {r.severity && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.severity === 'high' ? 'bg-red-100 text-red-700' :
                        r.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.severity}
                      </span>
                    )}
                  </div>
                  {r.mitigation && (
                    <p className="text-sm text-amber-700 mt-1">
                      <span className="font-medium">Mitigation:</span> {r.mitigation}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Recommended Architecture */}
      {recommendedArchitecture && recommendedArchitecture.description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 rounded-lg border border-blue-200 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-blue-800">Recommended Architecture</h4>
          </div>
          <p className="text-blue-900 mb-4">{recommendedArchitecture.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedArchitecture.components && recommendedArchitecture.components.filter(Boolean).length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-700 mb-2">Components:</p>
                <ul className="space-y-1">
                  {recommendedArchitecture.components.filter((c): c is string => Boolean(c)).map((c, i) => (
                    <li key={i} className="text-sm text-blue-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              {recommendedArchitecture.humanInLoop !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-700">Human-in-loop:</span>
                  <span className={`text-sm px-2 py-0.5 rounded ${
                    recommendedArchitecture.humanInLoop
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {recommendedArchitecture.humanInLoop ? 'Required' : 'Optional'}
                  </span>
                </div>
              )}

              {recommendedArchitecture.confidenceThreshold && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-700">Confidence threshold:</span>
                  <span className="text-sm text-blue-800">
                    {Math.round(recommendedArchitecture.confidenceThreshold * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
