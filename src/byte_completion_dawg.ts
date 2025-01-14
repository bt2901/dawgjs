import { Dictionary } from './dictionary';
import { Guide } from './guide';
import { ByteDawg } from './byte_dawg';



export class ByteCompletionDawg extends ByteDawg {
  constructor(
      public dictionary: Dictionary,
      public guide: Guide) {
    super(dictionary);
  }

  hasBytesWithPrefix(prefix: Iterable<number>) {
    return !this.completionsBytes(prefix).next().done;
  }

  *completionsBytes(prefix: Iterable<number>) {
    let index = this.dictionary.followBytes(prefix);
    if (index === null) {
      return;
    }

    yield* completer(this.dictionary, this.guide, index);
  }
  completionsBytesArray(prefix: Iterable<number>): number[][] {
  
    let index = this.dictionary.followBytes(prefix);
    if (index === null) {
      return [];
    }
    return completerArray(this.dictionary, this.guide, index);
  }
}


//------------------------------------------------------------------------------
export function* completer(dic: Dictionary, guide: Guide, index: number) {
  let completion = new Array<number>();
  let indexStack = [index];
  while (indexStack.length) {

    // find terminal
    while (!dic.hasValue(index)) {
      let label = guide.child(index);
      index = dic.followByte(label, index);
      if (index === null) {
        return;
      }
      completion.push(label);
      indexStack.push(index);
    }

    yield completion;

    let childLabel = guide.child(index);
    if (childLabel) {
      if ((index = dic.followByte(childLabel, index)) === null) {
        return;
      }
      completion.push(childLabel);
      indexStack.push(index);
    }
    else {
      while (true) {
        // move up to previous
        indexStack.pop();
        if (!indexStack.length) {
          return;
        }
        completion.pop();

        let siblingLabel = guide.sibling(index);
        index = indexStack[indexStack.length - 1];
        if (siblingLabel) {  // todo: that's the '\0' place??
          if ((index = dic.followByte(siblingLabel, index)) === null) {
            return;
          }
          completion.push(siblingLabel);
          indexStack.push(index);
          break;
        }
      }
    }
  }
}


//------------------------------------------------------------------------------
export function completerArray(dic: Dictionary, guide: Guide, index: number) {
  let ret = new Array();
  let completion = new Array();
  let indexStack = [index];
  while (indexStack.length) {
    // find terminal
    while (!dic.hasValue(index)) {
      let label = guide.child(index);
      index = dic.followByte(label, index);
      if (index === null) {
          return ret;
      }
      completion.push(label);
      indexStack.push(index);
    }
    ret.push([...completion]);
    let childLabel = guide.child(index);
    if (childLabel) {
      if ((index = dic.followByte(childLabel, index)) === null) {
        return ret;
      }
      completion.push(childLabel);
      indexStack.push(index);
    }
    else {
      while (true) {
        // move up to previous
        indexStack.pop();
        if (!indexStack.length) {
            return ret;
        }
        completion.pop();
        let siblingLabel = guide.sibling(index);
        index = indexStack[indexStack.length - 1];
        if (siblingLabel) {
            if ((index = dic.followByte(siblingLabel, index)) === null) {
                return ret;
            }
            completion.push(siblingLabel);
            indexStack.push(index);
            break;
        }
      }
    }
  }
  return ret;
}
