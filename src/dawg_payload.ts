import { readStringMapDawg, readByteCompletionDawg } from './factories';

import { ByteDawg } from './byte_dawg';
import { ByteMapDawg } from './byte_map_dawg';
import { MapDawg } from './map_dawg';
import { ByteCompletionDawg } from './byte_completion_dawg';
import { encodeUtf8, b64decodeFromArray } from './codec';

export class DawgPayload {
    private format;
    private dawgjs_map;
    private dawgjs_byte;

    constructor(buffer: ArrayBuffer, format: string) {
        this.format = format;

        if (format === 'words') {
            this.dawgjs_map = readStringMapDawg(buffer, this.deserializerWord, 1, true);
        }
        if (format === 'probs') {
            this.dawgjs_map = readStringMapDawg(buffer, this.deserializerProbs, 1, true);
        }
        if (format === 'int') {
            this.dawgjs_byte = readByteCompletionDawg(buffer);
        }
    }
    public findAll(str: string, replaces?: { [key: string]: string }): any[] {
        const results: any[] = [];
        const prefixes: [string, number[], number, number][] = [['', [], 0, 0]]; // [prefix, utf8, len, index]
        let prefix: string, encodedPrefix: number[], index: number, len: number, code: number[], cur: number;

        let myDict = undefined;
        if (this.format === 'int') {
            myDict = this.dawgjs_byte!.dictionary;
        }
        if (this.format === 'probs' || this.format === 'words') {
            myDict = this.dawgjs_map!.dawg.dawg.dictionary;
        }
        if (typeof myDict === "undefined") {
                throw new Error('DAWG is corrupted!');
        }
        while (prefixes.length) {
            console.log(["prefixes", prefixes]);
            const currentPrefix = prefixes.pop();
            console.log(currentPrefix);
            if (!currentPrefix) continue;
        
            [prefix, encodedPrefix, len, index] = currentPrefix;
            console.log([len, str.length, prefix, encodedPrefix, index]);

            // Done: at the end of the input string
            if (len === str.length) {
                if (this.format === 'int') {
                    if (myDict.hasValue(index)) {
                        results.push([prefix, myDict.value(index)]);
                    }
                    continue;
                }
                if (this.format === 'words' || this.format === 'probs') {
                    // read the payload separated by \x01
                    console.log(["end of", prefix, encodedPrefix, index]);
                    const newIndex = myDict.followByte(1, index);
                    if (newIndex === undefined || newIndex === -1) {
                        continue;
                    }
                    index = newIndex;
                }
                let deserializer = (this.format === 'words')? this.deserializerWord : this.deserializerProbs;
                // console.log(["try", this.dawgjs_map!.dawg!.dawg!.completionsBytesArray(encodedPrefix.concat([1]))]);
                // results.push([prefix, [...completer(myDict, myGuide, index)] ]);
                const data = this.dawgjs_map!.dawg!.dawg!.completionsBytesArray(encodedPrefix.concat([1]));
                const decodedArr: any[] = [];
                console.log(data.length);
                data.forEach(d => {
                    let decoded = b64decodeFromArray(d.slice(0, -1));
                    decodedArr.push(deserializer(decoded));
                });
                results.push([prefix, decodedArr]);
                continue;
            }

            // Follow replacement path
            const currentChar = str[len]!;
            if (replaces && currentChar in replaces) {
                code = encodeUtf8(replaces[currentChar]!);
                cur = myDict.followBytes(code, index);
                console.log(JSON.stringify([currentChar, "->", replaces[currentChar], code, cur]))
                if (cur !== undefined || cur !== -1) {
                    prefixes.push([prefix + replaces[currentChar], encodedPrefix.concat(code), len + 1, cur]);
                }
            }

            // Follow base path
            code = encodeUtf8(currentChar);
            cur = myDict.followBytes(code, index);
            console.log(JSON.stringify([currentChar, code, cur]))
            if (cur !== undefined || cur !== -1) {
                prefixes.push([prefix + currentChar, encodedPrefix.concat(code), len + 1, cur]);
            }
        }
        console.log(["PREFIXES:", JSON.stringify(prefixes)]);
        console.log(["RESULTS:", JSON.stringify(results)]);
        return results;
    }

    public getInt(str: string): number | undefined {
        // yes, Az.probabilities.format == "int"
        // while Az.predictionSuffixes[i].format == "probs"
        // go figure
        if (this.format === 'probs' || this.format === 'words' || typeof this.dawgjs_byte === 'undefined') {
            throw new Error('You are trying to access wrong DAWG type.');
        }
        const index = this.dawgjs_byte.dictionary!.followBytes(encodeUtf8(str));
        const hasValue = this.dawgjs_byte.dictionary!.hasValue(index);
        const value = this.dawgjs_byte.dictionary!.value(index) ^ (1 << 31);

        if (hasValue && typeof value !== 'undefined') {
            return value;
        }
        return undefined;
    }

    private getStr(str: string): any[] | undefined {
        if (this.format === 'int' || typeof this.dawgjs_map === 'undefined') {
            throw new Error('You are trying to access wrong DAWG type.');
        }
        const indexes = this.dawgjs_map.getArray(str);

        if (indexes.length) {
            return [
                str,
                indexes,
            ];
        }

        return;
    }
    private getAllReplaces(str: string, replaces?: string[][]): string[] {
        const allReplaces: string[] = [];

        if (!replaces || !replaces.length) {
            return allReplaces;
        }

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            replaces.forEach(([from, to]) => {
                if (char === from) {
                    allReplaces.push(`${str.slice(0, i)}${to}${str.slice(i + 1)}`);
                }
            });
        }

        return allReplaces;
    }
    private deserializerWord(bytes: Uint8Array): [number, number] {
        let view = new DataView(bytes.buffer);

        const paradigmId = view.getUint16(0);
        const indexInParadigm = view.getUint16(2);

        return [paradigmId, indexInParadigm];
    }
    private deserializerProbs(bytes: Uint8Array): [number, number, number] {
        let view = new DataView(bytes.buffer);

        const paradigmId = view.getUint16(0);
        const indexInParadigm = view.getUint16(2);
        const indexInParadigm2 = view.getUint16(4);

        return [paradigmId, indexInParadigm, indexInParadigm2];
    }
}
