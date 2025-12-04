import { frameCount as countMp3Frames } from "./helpers/frameCount";
import { frameList, type FrameInfo } from "./helpers/frameList";

export type Logger = {
  info: (message: string) => void;
};

export function createFrameAnalyzer(logger: Logger) {
  return {
    countMp3Frames: (buffer: Buffer) => countMp3Frames(buffer, logger),
    listMp3Frames: (buffer: Buffer): FrameInfo[] => frameList(buffer, logger)
  };
}
