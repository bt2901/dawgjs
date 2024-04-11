import { ValueDeserializer, MapDawg } from './map_dawg';
import { ByteCompletionDawg } from './byte_completion_dawg';
import { CompletionDawg } from './completion_dawg';
import { readByteCompletionDawg, readStringCompletionDawg, readStringMapDawg } from './factories';

import { readFileSync } from 'fs';




////////////////////////////////////////////////////////////////////////////////
export function readByteCompletionDawgSync(filename: string): ByteCompletionDawg {
    return readByteCompletionDawg(readFileSync(filename).buffer);
}
////////////////////////////////////////////////////////////////////////////////
export function readStringCompletionDawgSync(filename: string): CompletionDawg<string> {
    return readStringCompletionDawg(readFileSync(filename).buffer);
}
////////////////////////////////////////////////////////////////////////////////
export function readStringMapDawgSync<T>(filename: string, deserializer: ValueDeserializer<T>): MapDawg<string, T> {
    return readStringMapDawg(readFileSync(filename).buffer, deserializer, 1, true);
}
