import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SyntheticEOFDetector,
  SYNTHETIC_EOF,
  EOF_EVENT,
} from '../syntheticEof';

describe('sequence', () => {
  it('should have correct EOF sequence', () => {
    expect(SYNTHETIC_EOF).toEqual(
      Buffer.from([0x1b, 0x5d, 0x37, 0x38, 0x37, 0x38, 0x1b, 0x5c]),
    );
    expect(SYNTHETIC_EOF.length).toBe(8);
  });
});

describe('SyntheticEOFDetector', () => {
  let detector: SyntheticEOFDetector;
  let onData: (data: Buffer) => void;
  let onEOF: () => void;
  let output: Buffer;

  beforeEach(() => {
    detector = new SyntheticEOFDetector();
    output = Buffer.alloc(0);
    onData = vi.fn((data: Buffer) => (output = Buffer.concat([output, data])));
    onEOF = vi.fn();

    detector.on('data', onData);
    detector.on(EOF_EVENT, onEOF);
  });

  it('should handle EOF at the end of stream', async () => {
    detector.write('Before EOF');
    detector.write(SYNTHETIC_EOF);
    detector.end();

    expect(output.toString()).toBe('Before EOF');
    expect(onEOF).toHaveBeenCalledTimes(1);
  });

  it('should handle EOF split across chunks', async () => {
    detector.write('Data1');
    detector.write('\x1B]78'); // Partial EOF
    detector.write('78\x1B\\'); // Complete EOF
    detector.write('Data2');
    detector.end();

    expect(output.toString()).toBe('Data1Data2');
    expect(onEOF).toHaveBeenCalledTimes(1);
  });

  it('should pass through data when no EOF is present', async () => {
    detector.write('Just normal data');
    detector.write(' with no EOF');
    detector.end();

    expect(output.toString()).toBe('Just normal data with no EOF');
    expect(onEOF).not.toHaveBeenCalled();
  });

  it('should not trigger on partial EOF at end', async () => {
    detector.write('Data');
    detector.write('\x1B]78'); // Incomplete EOF
    detector.end();

    expect(output.toString()).toBe('Data\x1B]78');
    expect(onEOF).not.toHaveBeenCalled();
  });

  it('should handle EOF split after escape', async () => {
    detector.write('\x1B');
    detector.write(']7878\x1B\\');
    detector.write('data1');
    detector.end();

    expect(output.toString()).toBe('data1');
    expect(onEOF).toHaveBeenCalledTimes(1);
  });

  it('should handle EOF split in the middle', async () => {
    detector.write('\x1B]78');
    detector.write('78\x1B\\');
    detector.write('data2');
    detector.end();

    expect(output.toString()).toBe('data2');
    expect(onEOF).toHaveBeenCalledTimes(1);
  });

  it('should not hold up data that isnt a prefix of EOF', async () => {
    detector.write('Data that is definitely not an EOF prefix');

    expect(output.toString()).toBe('Data that is definitely not an EOF prefix');
    expect(onEOF).not.toHaveBeenCalled();

    detector.end();
    expect(onEOF).not.toHaveBeenCalled();
  });

  it('should emit events in correct order', async () => {
    const detector = new SyntheticEOFDetector();
    const events: Array<
      | {
          type: 'eof';
        }
      | {
          type: 'data';
          data: string;
        }
    > = [];

    detector.on('data', (chunk) => {
      events.push({ type: 'data', data: chunk.toString() });
    });
    detector.on(EOF_EVENT, () => {
      events.push({ type: 'eof' });
    });

    const finished = new Promise((resolve) => {
      detector.on('end', resolve);
    });

    detector.write('before');
    detector.write(SYNTHETIC_EOF);
    detector.write('after');
    detector.end();

    await finished;

    expect(events).toEqual([
      { type: 'data', data: 'before' },
      { type: 'eof' },
      { type: 'data', data: 'after' },
    ]);
  });
});
