import * as path from "node:path";
import { Stack, type StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecrassets from "aws-cdk-lib/aws-ecr-assets";
import * as apprunner from "@aws-cdk/aws-apprunner-alpha";

export class Mp3FileAnalysisStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Build the application image from the repository root.
    const imageAsset = new ecrassets.DockerImageAsset(this, "ServiceImage", {
      directory: path.resolve(__dirname, "..", "..")
    });

    const service = new apprunner.Service(this, "AppRunnerService", {
      source: apprunner.Source.fromAsset({
        asset: imageAsset,
        imageConfiguration: {
          port: 3000,
          environmentVariables: {
            PORT: "3000",
            NODE_ENV: "production"
          }
        }
      }),
      autoDeploymentsEnabled: true
    });

    service.addEnvironmentVariable("MAX_FILE_SIZE_MB", "20");

    new CfnOutput(this, "ServiceUrl", {
      value: service.serviceUrl,
      description: "Public URL of the App Runner service"
    });
  }
}
