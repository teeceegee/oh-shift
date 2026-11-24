import boardEncoded from './board-uk-en-v1.fc.txt?raw';
import targetEncoded from './targets-uk-en-v1.fc.txt?raw';
import { CompactDictionary, DICTIONARY_VERSION } from '../engine/dictionary';

let cached: CompactDictionary | null = null;

export function getBundledDictionary(): CompactDictionary {
  if (!cached) {
    cached = CompactDictionary.fromFrontCoded(boardEncoded, targetEncoded, DICTIONARY_VERSION);
  }
  return cached;
}
