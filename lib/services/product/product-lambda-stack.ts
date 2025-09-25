import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";

export class ProductLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambda.Function(this, "getProductsList", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

    const api = new apigateway.RestApi(this, "store-api", {
      restApiName: "Products Store API Gateway",
      description:
        "This API serves the Lambda functions for store of products.",
    });

    const productLambdaIntegration = new apigateway.LambdaIntegration(
      lambdaFunction,
      {
        requestTemplates: {
          "application/json": `{ "data": "$input" }`, // Map the query param message
        },
        integrationResponses: [
          {
            statusCode: "200",
          },
        ],
        proxy: false,
      }
    );

    const productsResource = api.root.addResource("products");
    // On this resource attach a GET method which pass reuest to our Lambda function
    productsResource.addMethod("GET", productLambdaIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });
    productsResource.addCorsPreflight({
      allowOrigins: ["https://d1m24vp5syugwb.cloudfront.net"],
      allowMethods: ["GET"],
    });
  }
}
