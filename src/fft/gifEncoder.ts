/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Lightweight, zero-dependency GIF89a encoder for grayscale animation frames.
 * Encodes directly into a downloadable Blob.
 */
export class SimpleGifEncoder {
  private width: number;
  private height: number;
  private delayCentiseconds: number;
  private buffer: number[] = [];
  private loopCount: number;

  constructor(width: number, height: number, fps: number, loopCount = 0) {
    this.width = width;
    this.height = height;
    // Delay in hundredths of a second
    this.delayCentiseconds = Math.max(1, Math.round(100 / fps));
    this.loopCount = loopCount; // 0 = loop forever
    this.writeHeader();
  }

  private writeHeader() {
    // GIF89a header
    this.writeString('GIF89a');

    // Logical Screen Descriptor
    this.writeWord(this.width);
    this.writeWord(this.height);
    // Packed: Global Color Table Flag (1), 8 bits/pixel (111), Sort (0), 256 colors (111) -> 0xF7
    this.buffer.push(0xf7);
    this.buffer.push(0); // Background Color Index
    this.buffer.push(0); // Pixel Aspect Ratio

    // Global Color Table: 256 Grayscale colors (0 to 255)
    for (let i = 0; i < 256; i++) {
      this.buffer.push(i, i, i);
    }

    // Netscape 2.0 Looping Application Extension
    this.buffer.push(0x21, 0xff, 0x0b);
    this.writeString('NETSCAPE2.0');
    this.buffer.push(0x03, 0x01);
    this.writeWord(this.loopCount);
    this.buffer.push(0x00);
  }

  public addFrame(grayscalePixels: Uint8Array | Uint8ClampedArray) {
    // Graphic Control Extension
    this.buffer.push(0x21, 0xf9, 0x04);
    this.buffer.push(0x00); // Packed: disposal method 0, no transparent color
    this.writeWord(this.delayCentiseconds);
    this.buffer.push(0x00); // Transparent Color Index
    this.buffer.push(0x00); // Block Terminator

    // Image Descriptor
    this.buffer.push(0x2c);
    this.writeWord(0); // Left
    this.writeWord(0); // Top
    this.writeWord(this.width);
    this.writeWord(this.height);
    this.buffer.push(0x00); // Packed: No local color table

    // LZW Compression
    this.encodeLZW(grayscalePixels);
  }

  public finish(): Blob {
    // GIF Trailer
    this.buffer.push(0x3b);
    const uint8 = new Uint8Array(this.buffer);
    return new Blob([uint8], { type: 'image/gif' });
  }

  private writeWord(n: number) {
    this.buffer.push(n & 0xff);
    this.buffer.push((n >> 8) & 0xff);
  }

  private writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      this.buffer.push(s.charCodeAt(i));
    }
  }

  private encodeLZW(pixels: Uint8Array | Uint8ClampedArray) {
    const initCodeSize = 8;
    this.buffer.push(initCodeSize);

    const clearCode = 1 << initCodeSize; // 256
    const eoiCode = clearCode + 1; // 257

    let codeSize = initCodeSize + 1; // 9
    let nextCode = eoiCode + 1; // 258

    let curAccum = 0;
    let curBits = 0;
    const packet: number[] = [];

    const emitPacket = () => {
      if (packet.length > 0) {
        this.buffer.push(packet.length);
        for (let i = 0; i < packet.length; i++) {
          this.buffer.push(packet[i]);
        }
        packet.length = 0;
      }
    };

    const writeBits = (code: number, size: number) => {
      curAccum |= code << curBits;
      curBits += size;
      while (curBits >= 8) {
        packet.push(curAccum & 0xff);
        if (packet.length === 254) {
          emitPacket();
        }
        curAccum >>= 8;
        curBits -= 8;
      }
    };

    // Dictionary using Map
    const dict = new Map<number, number>();
    const resetDict = () => {
      dict.clear();
      codeSize = initCodeSize + 1;
      nextCode = eoiCode + 1;
    };

    writeBits(clearCode, codeSize);

    let prefix = pixels[0];
    const len = pixels.length;

    for (let i = 1; i < len; i++) {
      const c = pixels[i];
      const key = (prefix << 8) | c;

      if (dict.has(key)) {
        prefix = dict.get(key)!;
      } else {
        writeBits(prefix, codeSize);

        if (nextCode < 4096) {
          dict.set(key, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeBits(clearCode, codeSize);
          resetDict();
        }
        prefix = c;
      }
    }

    writeBits(prefix, codeSize);
    writeBits(eoiCode, codeSize);

    // Flush remaining bits
    if (curBits > 0) {
      packet.push(curAccum & 0xff);
    }
    emitPacket();

    // Block terminator
    this.buffer.push(0x00);
  }
}
