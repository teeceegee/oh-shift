import type { SavedWordRecord } from '../../engine';
import { BottomSheet } from './BottomSheet';
import { SavedWordsList } from './SavedWordsList';

interface HistorySheetProps {
  words: readonly SavedWordRecord[];
  onClose: () => void;
}

export function HistorySheet({ words, onClose }: HistorySheetProps) {
  return (
    <BottomSheet title={`Saved Words (${words.length})`} onClose={onClose}>
      <SavedWordsList words={words} maxVisible={250} />
    </BottomSheet>
  );
}
