"use client";
import AgentForm from "@/components/task-agent/AgentForm";
import RunLogs from "@/components/task-agent/RunLogs";
import { type AgentOkData, resumeAgent, startAgent } from "@/lib/api";
import { FinalView, InterruptView } from "@/lib/types";
import { useState } from "react";

export default function AgentPage() {
  const [loading, setLoading] = useState(false);
  const [interrupt, setInterrupt] = useState<InterruptView | null>(null);
  const [final, setFinal] = useState<FinalView | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  function applyOkData(data: AgentOkData) {
    if (data.kind === "final") {
      setInterrupt(null);
      setFinal(data.final as FinalView);
    } else if (data.kind === "needs_clarify") {
      setThreadId(data.interrupt.threadId);
      setInterrupt({
        kind: "needs_clarify",
        threadId: data.interrupt.threadId,
        fields: data.interrupt.fields,
        prompt: data.interrupt.prompt,
      });
      setFinal(null);
    } else {
      setThreadId(data.interrupt.threadId);
      setInterrupt({
        kind: "needs_approval",
        threadId: data.interrupt.threadId,
        steps: data.interrupt.steps,
        prompt: data.interrupt.prompt,
      });
      setFinal(null);
    }
  }

  async function handleAgentStart(input: string) {
    setLoading(true);
    setFinal(null);
    setInterrupt(null);
    setThreadId(null);
    try {
      const res = await startAgent(input);
      if (res.status === "error") throw new Error(res.error);

      if (!res.data) throw new Error("Some error occured");

      applyOkData(res.data);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to start agent run";
      setFinal({
        status: "cancelled",
        message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResume(
    payload: { approve: boolean } | { answers: Record<string, string> },
  ) {
    if (!threadId) return;
    setLoading(true);

    try {
      const res = await resumeAgent(threadId, payload);
      if (res.status === "error") throw new Error(res.error);

      if (!res.data) throw new Error("Some error occured");

      applyOkData(res.data);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to resume the flow";
      setFinal({
        status: "cancelled",
        message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleOnApprove() {
    await handleResume({ approve: true });
  }

  async function handleOnReject() {
    await handleResume({ approve: false });
  }

  async function handleSubmitClarify(answers: Record<string, string>) {
    await handleResume({ answers });
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6 py-8">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-4xl font-bold text-cyan-700">
            LangGraph Task Agent
          </h1>
          <p className="text-muted-foreground text-lg">
            AL-Powered task planning and execution with human-in-the-loop
          </p>
        </div>
        <AgentForm disabled={loading} onStart={handleAgentStart} />
        <RunLogs
          key={threadId ?? "idle"}
          interrupt={interrupt}
          final={final}
          loading={loading}
          onApprove={handleOnApprove}
          onReject={handleOnReject}
          onSubmitClarify={handleSubmitClarify}
        />
      </div>
    </main>
  );
}
