import { frameCount as countMp3Frames } from "./helpers/frameCount";
import { frameList, type FrameInfo } from "./helpers/frameList";

export type Logger = {
  info: (message: string) => void;
};

/**
 * Creates an analyzer that can count and list MPEG audio frames
 * using the supplied logger for diagnostic output.
 *
 * @param logger Object providing an `info()` method for logging.
 * @returns An analyzer with `countMp3Frames()` and `listMp3Frames()` helpers.
 */
export function createFrameAnalyzer(logger: Logger) {
  return {
    countMp3Frames(buffer: Buffer) {
      return countMp3Frames(buffer, logger);
    },

    listMp3Frames(buffer: Buffer): FrameInfo[] {
      return frameList(buffer, logger);
    }
  };
}
