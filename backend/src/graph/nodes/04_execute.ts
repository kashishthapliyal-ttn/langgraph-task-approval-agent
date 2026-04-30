import { z } from "zod";
import { State } from "../types";
import { getChatModel } from "../../utils/model";

const NotesSchema = z.object({
  notes: z.array(z.string().min(1).max(300)).min(1).max(20),
});

type Notes = z.infer<typeof NotesSchema>;

function createHumanPromptContent(steps: string[]) {
  const list = JSON.stringify(steps, null, 0);

  return [
    `
  You generate execution notes for steps.
  Return valid JSON matching schema.
  notes.length must equal steps.length.
  Each note under 300 characters.
  Plain text only.
  `,
    `Steps = ${list}`,
  ].join("\n");
}

export async function executeNode(state: State): Promise<Partial<State>> {
  if (!state.approved) return {};

  const steps = state.steps ?? [];
  if (steps.length === 0) return {};

  const model = getChatModel();

  const structuredModel = model.withStructuredOutput(NotesSchema);

  try {
    if (steps.length > 10) {
      return {
        status: "cancelled",
        message: "Too many steps to execute.",
      };
    }

    const out: Notes = await structuredModel.invoke([
      {
        role: "system",
        content: "Return only valid JSON matching the schema",
      },
      {
        role: "human",
        content: createHumanPromptContent(steps),
      },
    ]);

    const count = Math.min(steps.length, out.notes.length);

    const sanitizedNotes = out.notes.map((n) => n.trim());
    const uniqueNotes = [...new Set(sanitizedNotes)];

    const results = Array.from({ length: count }, (_, i) => ({
      step: steps[i],
      note: uniqueNotes[i],
    }));

    return {
      results,
      status: "done",
      message: `Executed ${results.length} step(s)`,
    };
  } catch {
    return {
      status: "cancelled",
      message: "Execution failed",
    };
  }
}
