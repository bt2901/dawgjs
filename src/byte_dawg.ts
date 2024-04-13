import { Dictionary } from './dictionary';



export class ByteDawg {
  constructor(public dictionary: Dictionary) {
  }

  hasBytes(value: Iterable<number>) {
    return this.dictionary.has(value);
  }
}
