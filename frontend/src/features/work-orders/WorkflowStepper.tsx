import { Check, CircleCheckBig, FilePen, FilePenLine, Minus, Package, Send, UserPlus, Wrench, type LucideIcon } from 'lucide-react';
import type { WorkOrderDetail } from '../../api/types';
import { workflowSteps, type StepState } from './workflow';

/** Icon shown on the current step, so it reads as "this is happening now", not as just another number. */
const STEP_ICON: Record<string, LucideIcon> = {
  Draft: FilePen,
  Submitted: Send,
  Assigned: UserPlus,
  Updated: FilePenLine,
  Sparepart: Package,
  Working: Wrench,
  Completed: CircleCheckBig,
};

const dot: Record<StepState, string> = {
  done: 'h-7 w-7 border-emerald-500 bg-emerald-500 text-white',
  current: 'h-9 w-9 border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-200',
  upcoming: 'h-7 w-7 border-slate-300 bg-white text-slate-400',
  skipped: 'h-7 w-7 border-dashed border-slate-300 bg-slate-50 text-slate-400',
};

const caption: Partial<Record<StepState, string>> = { current: 'Current', skipped: 'Not needed' };

export function WorkflowStepper({ workOrder }: { workOrder: WorkOrderDetail }) {
  const steps = workflowSteps(workOrder);
  // A connector is green once the step it leads into has been reached (done, current or skipped past).
  const reached = (state: StepState) => state !== 'upcoming';

  return (
    // overflow-x-auto also clips vertically, so leave room (py-5) for the current step's pulse, which grows to 2x;
    // the negative margin keeps the card the same height.
    <ol className="-my-4 flex items-start overflow-x-auto py-5">
      {steps.map((s, i) => {
        const StepIcon = STEP_ICON[s.label] ?? Check;
        return (
          <li
            key={s.label}
            className="flex min-w-20 flex-1 flex-col items-center text-center"
            aria-current={s.state === 'current' ? 'step' : undefined}
          >
            <div className="flex h-9 w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'invisible' : reached(s.state) ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              <div className="relative flex shrink-0 items-center justify-center">
                {s.state === 'current' && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-30" aria-hidden />
                )}
                <div className={`relative flex items-center justify-center rounded-full border-2 text-xs font-semibold ${dot[s.state]}`}>
                  {s.state === 'done' && <Check className="h-4 w-4" strokeWidth={3} />}
                  {s.state === 'current' && <StepIcon className="h-4.5 w-4.5" />}
                  {s.state === 'skipped' && <Minus className="h-3.5 w-3.5" />}
                  {s.state === 'upcoming' && i + 1}
                </div>
              </div>
              <div
                className={`h-0.5 flex-1 ${i === steps.length - 1 ? 'invisible' : reached(steps[i + 1].state) ? 'bg-emerald-400' : 'bg-slate-200'}`}
              />
            </div>
            <span
              className={`mt-1.5 text-xs ${
                s.state === 'current' ? 'font-semibold text-emerald-700' : s.state === 'upcoming' ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {s.label}
            </span>
            {caption[s.state] && (
              <span
                className={`mt-0.5 rounded-full px-1.5 text-[10px] font-medium ${
                  s.state === 'current' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'
                }`}
              >
                {caption[s.state]}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
