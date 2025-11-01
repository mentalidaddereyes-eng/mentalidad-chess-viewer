declare module 'gtts' {
  import { Readable } from 'stream';

  class gtts {
    constructor(text: string, lang: string);
    stream(): Readable;
  }

  export = gtts;
}
