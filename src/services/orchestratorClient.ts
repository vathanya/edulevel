import type {
  AgentActivityEntry,
  OrchestratedLearnerState,
  OrchestratorWorkflowAction,
} from '../types/edu';

export interface OrchestratorStateResponse {
  state: OrchestratedLearnerState;
  mode: 'gemini' | 'deterministic';
}

export interface OrchestratorWorkflowResponse {
  state: OrchestratedLearnerState;
  agentLogs: AgentActivityEntry[];
  actionResult: Record<string, unknown>;
  mode: 'gemini' | 'deterministic';
}

export async function fetchOrchestratorState(
  studentId?: string,
): Promise<OrchestratorStateResponse> {
  const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  const res = await fetch(`/api/orchestrator/state${qs}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch orchestrator state (${res.status})`);
  }
  return res.json() as Promise<OrchestratorStateResponse>;
}

export async function dispatchOrchestratorWorkflow(
  action: OrchestratorWorkflowAction,
  studentId?: string,
): Promise<OrchestratorWorkflowResponse> {
  const res = await fetch('/api/orchestrator/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, action }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.error === 'string' && data.error
        ? data.error
        : `Orchestrator workflow failed (${res.status})`;
    throw new Error(msg);
  }
  return data as unknown as OrchestratorWorkflowResponse;
}

export async function resetOrchestratorState(
  studentId?: string,
): Promise<OrchestratorStateResponse> {
  const res = await fetch('/api/orchestrator/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to reset orchestrator state (${res.status})`);
  }
  return res.json() as Promise<OrchestratorStateResponse>;
}
