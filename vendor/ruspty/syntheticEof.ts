import { Transform } from 'node:stream';
import { getSyntheticEofSequence } from './index.js';

// keep in sync with lib.rs::SYNTHETIC_EOF
export const SYNTHETIC_EOF = getSyntheticEofSequence();
export const EOF_EVENT = 'synthetic-eof';

// get the longest suffix of buffer that is a prefix of SYNTHETIC_EOF
function getBufferEndPrefixLength(buffer: Buffer) {
  const maxLen = Math.min(buffer.length, SYNTHETIC_EOF.length);
  for (let len = maxLen; len > 0; len--) {
    let match = true;
    for (let i = 0; i < len; i++) {
      if (buffer[buffer.length - len + i] !== SYNTHETIC_EOF[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return len;
    }
  }

  return 0;
}

export class SyntheticEOFDetector extends Transform {
  buffer: Buffer;

  constructor(options = {}) {
    super(options);
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk: Buffer, _encoding: string, callback: () => void) {
    const searchData = Buffer.concat([this.buffer, chunk]);
    const eofIndex = searchData.indexOf(SYNTHETIC_EOF);

    if (eofIndex !== -1) {
      // found EOF - emit everything before it
      if (eofIndex > 0) {
        this.push(searchData.subarray(0, eofIndex));
      }

      this.emit(EOF_EVENT);

      // emit everything after EOF (if any) and clear buffer
      const afterEOF = searchData.subarray(eofIndex + SYNTHETIC_EOF.length);
      if (afterEOF.length > 0) {
        this.push(afterEOF);
      }

      this.buffer = Buffer.alloc(0);
    } else {
      // no EOF - buffer potential partial match at end

      // get the longest suffix of buffer that is a prefix of SYNTHETIC_EOF
      // and emit everything before it
      // this is done for the case which the eof happened to be split across multiple chunks
      const commonPrefixLen = getBufferEndPrefixLength(searchData);

      if (commonPrefixLen > 0) {
        const emitSize = searchData.length - commonPrefixLen;
        if (emitSize > 0) {
          this.push(searchData.subarray(0, emitSize));
        }
        this.buffer = searchData.subarray(emitSize);
      } else {
        this.push(searchData);
        this.buffer = Buffer.alloc(0);
      }
    }

    callback();
  }

  _flush(callback: () => void) {
    if (this.buffer.length > 0) {
      this.push(this.buffer);
    }

    callback();
  }
}
