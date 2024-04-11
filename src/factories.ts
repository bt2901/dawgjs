import { Dictionary } from './dictionary';
import { Guide } from './guide';
import { ByteMapDawg } from './byte_map_dawg';
import { ByteCompletionDawg } from './byte_completion_dawg';
import { CompletionDawg } from './completion_dawg';
import { MapDawg, ValueDeserializer } from './map_dawg';
import { encodeUtf8 } from './codec';

////////////////////////////////////////////////////////////////////////////////
export function readByteCompletionDawg(buffer: ArrayBuffer): ByteCompletionDawg {
  let view = new DataView(buffer);
  let dictSize = view.getUint32(0, true);
  // console.error(buffer.byteLength)
  let dictData = new Uint32Array(buffer, 4, dictSize);
  let offset = 4 + dictSize * 4;
  let guideSize = view.getUint32(offset, true) * 2;
  let guideData = new Uint8Array(buffer, offset + 4, guideSize);

  return new ByteCompletionDawg(new Dictionary(dictData), new Guide(guideData));
}
////////////////////////////////////////////////////////////////////////////////
export function readStringCompletionDawg(buffer: ArrayBuffer): CompletionDawg<string> {
  return new completion_dawg_1.CompletionDawg(readByteCompletionDawg(buffer), codec_1.encodeUtf8, codec_1.decodeUtf8);
};
////////////////////////////////////////////////////////////////////////////////
export function readStringMapDawg<T>(buffer: ArrayBuffer, deserializer: ValueDeserializer<T>, payloadSeparator = 1, binasciiWorkaround = false): MapDawg<string, T> {
  let byteMapDawg = new byte_map_dawg_1.ByteMapDawg(readByteCompletionDawg(buffer), payloadSeparator, binasciiWorkaround);
  return new map_dawg_1.MapDawg(byteMapDawg, codec_1.encodeUtf8, deserializer);
};
