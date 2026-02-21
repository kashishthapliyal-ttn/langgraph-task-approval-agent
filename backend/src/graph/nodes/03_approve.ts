import { State } from '../types';
import { withTimeout } from '../../utils/withTimeout';

export async function approveNode(
  state: State,
  context: any,
): Promise<Partial<State>> {
  if (state.status === 'cancelled') return {};

  const steps = state.steps ?? [];

  if (steps.length === 0) {
    return {
      approved: true,
      message: 'No steps to approve; procedding->',
    };
  }

  const interrupt = context?.interrupt as (
    payload: unknown,
  ) => Promise<unknown>;

  try {
    const decision = await withTimeout(
      interrupt({ type: 'approval_request', steps }),
      60_000,
    );

    let approved: boolean;

    if (
      decision &&
      typeof decision === 'object' &&
      'approve' in (decision as any)
    ) {
      approved = !!(decision as any).approve;
    } else {
      approved = !!decision;
    }

    return {
      approved,
    };
  } catch (err) {
    return {
      approved: false,
      status: 'cancelled',
      message: 'Approval process failed.',
    };
  }
}
