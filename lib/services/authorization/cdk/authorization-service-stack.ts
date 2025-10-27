import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { Construct } from "constructs";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizer: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.basicAuthorizer = new lambda.Function(this, "BasicAuthorizerLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "basicAuthorizer.basicAuthorizer",
      code: lambda.Code.fromAsset(path.join(__dirname, "../src/lambda")),
      environment: {
        // jodavaga: process.env.jodavaga ?? "TEST_PASSWORD",
      },
    });

    new cdk.CfnOutput(this, "BasicAuthorizerLambdaArn", {
      value: this.basicAuthorizer.functionArn,
      exportName: "BasicAuthorizerLambdaArn",
    });
  }
}
