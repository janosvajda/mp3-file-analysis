#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Mp3FileAnalysisStack } from "../lib/mp3-file-analysis-stack";

const app = new cdk.App();

new Mp3FileAnalysisStack(app, "Mp3FileAnalysisStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
