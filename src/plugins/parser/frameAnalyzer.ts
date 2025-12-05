import { frameCount as countMp3Frames } from "./helpers/frameCount";
import { frameList } from "./helpers/frameList";

export type Logger = {
  info(message: string): void;
};

/**
 * Creates an analyzer that can count and list MPEG audio frames
 * using the supplied logger for diagnostic output.
 */
export function createFrameAnalyzer(logger: Logger) {
  return {
    countMp3Frames(buffer: Buffer) {
      return countMp3Frames(buffer, logger);
    },

    listMp3Frames(buffer: Buffer) {
      return frameList(buffer, logger);
    }
  };
}
