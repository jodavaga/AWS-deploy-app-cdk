import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { join } from "path";

export class CartServiceCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambdaNodejs.NodejsFunction(
      this,
      "CartServiceLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: join(
          __dirname,
          "../../../src/nodejs-aws-cart-api/src/main.lambda.ts"
        ),
        handler: "handler",
        memorySize: 512,
        bundling: {
          minify: true,
          externalModules: [
            "aws-sdk",
            "@nestjs/microservices",
            "class-transformer",
            "@nestjs/websockets/socket-module",
            "cache-manager",
            "class-validator",
          ],
        },
      }
    );

    const api = new apigateway.LambdaRestApi(this, "CartServiceApi", {
      handler: lambdaFunction,
      proxy: true,
      restApiName: "Cart Service",
      description: "Cart Microservice deployed via CDK + NestJS",
    });
  }
}
