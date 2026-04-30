import {
  Annotation,
  Command,
  END,
  INTERRUPT,
  MemorySaver,
  START,
  StateGraph,
  isInterrupted,
} from "@langchain/langgraph";
import { ValidateNode } from "./nodes/01_validate";
import { clarifyFieldsNode } from "./nodes/01b_clarifyFields";
import { clarifyAskNode } from "./nodes/01c_clarifyAsk";
import { PlanNode } from "./nodes/02_plan";
import { approveNode } from "./nodes/03_approve";
import { executeNode } from "./nodes/04_execute";
import { finalizeNode } from "./nodes/05_finalize";
import { makeInitialState, State } from "./types";

const StateAnn = Annotation.Root({
  input: Annotation<string>,
  clarifyFields: Annotation<Array<{ key: string; label: string }> | undefined>,
  userAnswers: Annotation<Record<string, string> | undefined>,
  steps: Annotation<string[] | undefined>,
  approved: Annotation<boolean | undefined>,
  results: Annotation<Array<{ step: string; note: string }> | undefined>,
  status: Annotation<"planned" | "done" | "cancelled" | undefined>,
  message: Annotation<string | undefined>,
});

const builder = new StateGraph(StateAnn)
  .addNode("validate", ValidateNode)
  .addNode("collectClarifyFields", clarifyFieldsNode)
  .addNode("askClarify", clarifyAskNode)
  .addNode("plan", PlanNode)
  .addNode("approve", approveNode)
  .addNode("execute", executeNode)
  .addNode("finalize", finalizeNode);

builder.addEdge(START, "validate");
builder.addEdge("validate", "collectClarifyFields");

builder.addConditionalEdges(
  "collectClarifyFields",
  (s: typeof StateAnn.State) => {
    const fields = s.clarifyFields ?? [];
    return fields.length === 0 ? "plan" : "askClarify";
  },
);

builder.addEdge("askClarify", "plan");
builder.addEdge("plan", "approve");

builder.addConditionalEdges("approve", (s: typeof StateAnn.State) => {
  return s.approved ? "execute" : "finalize";
});

builder.addEdge("execute", "finalize");
builder.addEdge("finalize", END);

const checkPointer = new MemorySaver();
const graph = builder.compile({
  checkpointer: checkPointer,
});

function createThreadId() {
  return `t_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export type ClarifyField = { key: string; label: string };

export type InterruptPayload =
  | {
      threadId: string;
      kind: "needs_clarify";
      fields: ClarifyField[];
      prompt: string;
    }
  | {
      threadId: string;
      kind: "needs_approval";
      steps: string[];
      prompt: string;
    };

function interruptFromInvokeResult(
  threadId: string,
  result: unknown,
): InterruptPayload | null {
  if (!isInterrupted(result)) return null;

  const list = (result as Record<string, unknown>)[INTERRUPT] as Array<{
    value?: unknown;
  }>;
  const first = list[0];
  const value = first?.value;

  if (value && typeof value === "object" && value !== null && "type" in value) {
    const v = value as {
      type: string;
      steps?: string[];
      fields?: ClarifyField[];
    };
    if (v.type === "clarify" && Array.isArray(v.fields)) {
      return {
        threadId,
        kind: "needs_clarify",
        fields: v.fields,
        prompt: "Provide the following details to continue.",
      };
    }
    if (v.type === "approval_request" && Array.isArray(v.steps)) {
      return {
        threadId,
        kind: "needs_approval",
        steps: v.steps,
        prompt: "Approve the generated plan to execute or reject to cancel.",
      };
    }
  }

  return {
    threadId,
    kind: "needs_approval",
    steps: [],
    prompt: "Action required.",
  };
}

export async function startAgentRun(
  input: string,
): Promise<{ interrupt: InterruptPayload } | { final: State }> {
  const threadId = createThreadId();

  const config = { configurable: { thread_id: threadId } };

  const result: unknown = await graph.invoke(makeInitialState(input), config);

  const interruptPayload = interruptFromInvokeResult(threadId, result);
  if (interruptPayload) {
    return { interrupt: interruptPayload };
  }

  return {
    final: result as State,
  };
}

export async function resumeAgentRun(args: {
  threadId: string;
  resume: unknown;
}): Promise<{ interrupt: InterruptPayload } | { final: State }> {
  const { threadId, resume } = args;
  const config = { configurable: { thread_id: threadId } };

  const result: unknown = await graph.invoke(new Command({ resume }), config);

  const interruptPayload = interruptFromInvokeResult(threadId, result);
  if (interruptPayload) {
    return { interrupt: interruptPayload };
  }

  return { final: result as State };
}
