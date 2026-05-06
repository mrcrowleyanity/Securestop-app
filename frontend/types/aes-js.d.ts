declare module 'aes-js' {
  export class ModeOfOperation {
    static ctr: new (key: Uint8Array, counter: Counter) => {
      encrypt(data: Uint8Array): Uint8Array;
      decrypt(data: Uint8Array): Uint8Array;
    };
    static cbc: new (key: Uint8Array, iv: Uint8Array) => {
      encrypt(data: Uint8Array): Uint8Array;
      decrypt(data: Uint8Array): Uint8Array;
    };
    static ecb: new (key: Uint8Array) => {
      encrypt(data: Uint8Array): Uint8Array;
      decrypt(data: Uint8Array): Uint8Array;
    };
  }

  export class Counter {
    constructor(initialValue: number | Uint8Array);
    setValue(value: number): void;
    setBytes(bytes: Uint8Array): void;
  }

  export const utils: {
    utf8: {
      toBytes(text: string): Uint8Array;
      fromBytes(bytes: Uint8Array): string;
    };
    hex: {
      toBytes(text: string): Uint8Array;
      fromBytes(bytes: Uint8Array): string;
    };
  };

  export function pkcs7pad(data: Uint8Array): Uint8Array;
  export function pkcs7strip(data: Uint8Array): Uint8Array;
}
