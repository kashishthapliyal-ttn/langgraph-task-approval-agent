import { z } from "zod";
import { State } from "../types";
import { getChatModel } from "../../utils/model";

const ClarifySchema = z.object({
  fields: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        label: z.string().min(1).max(200),
      }),
    )
    .max(10),
});

const SYSTEM = [
  "You analyze the user's stated goal.",
  "If fulfilling it requires personal facts that are not already stated in the goal text",
  "(e.g. age, height, weight, fitness level), return a minimal list of fields.",
  "Use stable snake_case keys (e.g. age, height_cm) and short user-facing labels.",
  "If the goal is self-contained or the user already gave the needed facts, return fields: [].",
  "Return only JSON matching the schema.",
].join("\n");

function userContent(input: string) {
  return `User goal:\n"""${input}"""`;
}

export async function clarifyFieldsNode(state: State): Promise<Partial<State>> {
  if (state.status === "cancelled") return {};

  try {
    const model = getChatModel({
      maxTokens: 400,
      temperature: 0.1,
    });

    const structuredModel = model.withStructuredOutput(ClarifySchema);

    const out = await structuredModel.invoke([
      { role: "system", content: SYSTEM },
      { role: "human", content: userContent(state.input) },
    ]);

    const fields = [...out.fields];

    return {
      clarifyFields: fields,
    };
  } catch (err) {
    console.error(err);
    return {
      clarifyFields: [],
    };
  }
}
