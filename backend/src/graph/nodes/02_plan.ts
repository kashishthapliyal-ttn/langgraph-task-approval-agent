import { z } from 'zod';
import { env } from '../../utils/env';
import { State } from '../types';
import { getChatModel } from '../../utils/model';

const PlanSchema = z.object({
  steps: z
    .array(
      z
        .string()
        .min(5, 'Step too short')
        .refine((val) => !/research|try your best/i.test(val), {
          message: 'Step too vague',
        }),
    )
    .min(1)
    .max(5),
});

const SYSTEM = [
  'You are a helpful planner.',
  'Return only JSON that matches the schema.',
  'Keep steps concrete, actionable and begineer friendly.',
].join('\n');

function userPrompt(input: string) {
  return [
    `User goal "${input}"`,
    'Draft a small plan with 3-5 steps',
    '- Each step is a short sentence',
  ].join('\n');
}

export async function PlanNode(state: State): Promise<Partial<State>> {
  if (state.status === 'cancelled') {
    return {};
  }

  try {
    const model = getChatModel({
      maxTokens: 600,
      temperature: 0.1,
    });

    const structuredModel = model.withStructuredOutput(PlanSchema);

    const plan = await structuredModel.invoke([
      { role: 'system', content: SYSTEM },
      { role: 'human', content: userPrompt(state.input) },
    ]);

    const unique = [...new Set(plan.steps)];

    return {
      steps: unique,
      status: 'planned',
    };
  } catch (err) {
    console.error(err);
    return {
      status: 'cancelled',
      message: 'Could not generate plan.',
    };
  }
}
