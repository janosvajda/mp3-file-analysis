import { describe, expect, test } from "vitest";
import * as cdk from "aws-cdk-lib";
import * as assertions from "aws-cdk-lib/assertions";
import { Mp3FileAnalysisStack } from "../lib/mp3-file-analysis-stack";

describe("Mp3FileAnalysisStack", () => {
  test("matches synthesized snapshot", () => {
    const app = new cdk.App();
    const stack = new Mp3FileAnalysisStack(app, "TestStack");

    const template = assertions.Template.fromStack(stack).toJSON() as Record<string, unknown>;

    // Normalize volatile image hashes to keep snapshot stable.
    const resources = (template.Resources ?? {}) as Record<string, Record<string, unknown>>;
    for (const resource of Object.values(resources)) {
      const imageRepo = resource?.Properties?.SourceConfiguration?.ImageRepository ?? null;
      if (imageRepo?.ImageIdentifier) {
        imageRepo.ImageIdentifier = "<IMAGE_HASH>";
      }
    }

    expect(template).toMatchSnapshot();
  });
});
