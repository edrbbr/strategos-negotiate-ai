import type { BusinessCase } from "@/hooks/useBusinessCases";
import { RefinementChat } from "./RefinementChat";

export function ViewChat({ caseRow, onApply }: { caseRow: BusinessCase; onApply: (opt: any) => void }) {
  return (
    <div className="w-full h-[calc(100dvh-220px)] flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2">
        <RefinementChat caseRow={caseRow} style="chatgpt" onApplyOption={onApply} />
      </div>
    </div>
  );
}