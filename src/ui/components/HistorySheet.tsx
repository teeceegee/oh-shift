import type { WordProbeRecord } from '../../engine';
import { BottomSheet } from './BottomSheet';
import { ProbeHistory } from './ProbeHistory';

interface HistorySheetProps {
  phase: number;
  probes: readonly WordProbeRecord[];
  onClose: () => void;
}

export function HistorySheet({ phase, probes, onClose }: HistorySheetProps) {
  return (
    <BottomSheet title={`Phase ${phase} Words (${probes.length})`} onClose={onClose}>
      <ProbeHistory probes={probes} maxVisible={200} />
    </BottomSheet>
  );
}
