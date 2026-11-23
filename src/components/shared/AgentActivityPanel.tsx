import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { useEdu } from '../../context/EduContext';
import type { AgentActivityStatus, AgentId } from '../../types/edu';

const AGENT_ORDER: Array<{ id: AgentId; shortLabel: string }> = [
  { id: 'diagnostic', shortLabel: 'Diagnostic' },
  { id: 'learner-model', shortLabel: 'Learner Model' },
  { id: 'reasoning', shortLabel: 'Reasoning' },
  { id: 'adaptive', shortLabel: 'Adaptive' },
  { id: 'revision-insights', shortLabel: 'Revision & Insights' },
];

const STATUS_DOT: Record<AgentActivityStatus, string> = {
  completed: 'bg-emerald-400',
  active: 'bg-cyan-400',
  attention: 'bg-amber-400',
};

interface AgentActivityPanelProps {
  variant?: 'student' | 'teacher';
  defaultExpanded?: boolean;
}

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({
  variant = 'student',
  defaultExpanded = false,
}) => {
  const { agentActivity, orchestratorMode } = useEdu();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const visibleEntries = expanded ? agentActivity.slice(0, 8) : agentActivity.slice(0, 3);
  const surfaceClass =
    variant === 'teacher'
      ? 'rounded-xl border border-slate-800 bg-[#0F172A] p-4 sm:p-5'
      : 'rounded-2xl border border-white/10 bg-[#0D1733] p-4 sm:p-5';
  const itemClass =
    variant === 'teacher'
      ? 'rounded-lg border border-slate-800 bg-[#0B1222] px-3 py-2'
      : 'rounded-xl border border-white/10 bg-[#091228] px-3 py-2';

  return (
    <section data-testid="agent-activity-panel" className={`${surfaceClass} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-cyan-300 shrink-0" />
          <h3 className="font-display text-sm font-bold text-white">AI Activity</h3>
          <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
            <Cpu className="h-3 w-3" />
            <span>
              {orchestratorMode === 'gemini'
                ? '5-Agent · Live Gemini'
                : '5-Agent Engine'}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
        >
          <span>{expanded ? 'Show less' : `History (${agentActivity.length})`}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* 5-Agent Coordination Strip */}
      <div className="flex flex-wrap gap-1.5">
        {AGENT_ORDER.map((agent) => {
          const latest = agentActivity.find((a) => a.agentId === agent.id);
          const dotColor = latest ? STATUS_DOT[latest.status] : 'bg-slate-600';
          return (
            <span
              key={agent.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-slate-200"
              title={latest?.message ?? `${agent.shortLabel} ready`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              <span>{agent.shortLabel}</span>
            </span>
          );
        })}
      </div>

      {/* Concise Status Feed */}
      <div className="space-y-1.5">
        {visibleEntries.map((entry) => (
          <div
            key={entry.id}
            className={`${itemClass} flex items-center justify-between gap-3 text-xs`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[entry.status]}`}
              />
              <span className="text-slate-200 truncate">
                <strong className="font-semibold text-white">{entry.agentName}:</strong>{' '}
                {entry.message}
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 shrink-0">
              {entry.timestamp}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
