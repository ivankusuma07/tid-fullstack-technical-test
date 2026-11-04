import type { WorkOrderDetail } from '../../api/types';
import { workflowSteps, type StepState } from './workflow';

const dot: Record<StepState, string> = {
  done: 'bg-emerald-500 border-emerald-500 text-white',
  current: 'bg-white border-emerald-500 text-emerald-600 ring-4 ring-emerald-100',
  upcoming: 'bg-white border-slate-300 text-slate-400',
  skipped: 'bg-slate-100 border-slate-300 text-slate-400',
};

export function WorkflowStepper({ workOrder }: { workOrder: WorkOrderDetail }) {
  const steps = workflowSteps(workOrder);
  return (
    <ol className="flex items-start overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <li key={s.label} className="flex min-w-20 flex-1 flex-col items-center text-center">
          <div className="flex w-full items-center">
            <div className={`h-0.5 flex-1 ${i === 0 ? 'invisible' : s.state === 'upcoming' ? 'bg-slate-200' : 'bg-emerald-400'}`} />
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${dot[s.state]}`}>
              {s.state === 'done' ? '✓' : s.state === 'skipped' ? '–' : i + 1}
            </div>
            <div
              className={`h-0.5 flex-1 ${i === steps.length - 1 ? 'invisible' : steps[i + 1].state === 'upcoming' ? 'bg-slate-200' : 'bg-emerald-400'}`}
            />
          </div>
          <span className={`mt-1.5 text-xs ${s.state === 'current' ? 'font-semibold text-emerald-700' : 'text-slate-500'}`}>
            {s.label}
            {s.state === 'skipped' && <span className="block text-[10px]">not needed</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
