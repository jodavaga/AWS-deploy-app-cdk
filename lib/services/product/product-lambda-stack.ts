import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";

export class ProductLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getAllProductsLambda = new lambda.Function(this, "getProductsList", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.getAllProducts",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

    const getProductLambda = new lambda.Function(this, "getProduct", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.getProduct",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

    const api = new apigateway.RestApi(this, "store-api", {
      restApiName: "Products Store API Gateway",
      description:
        "This API serves the Lambda functions for store of products.",
    });

    const getAllProductsLambdaIntegration = new apigateway.LambdaIntegration(
      getAllProductsLambda,
      {}
    );
    const getProductLambdaIntegration = new apigateway.LambdaIntegration(
      getProductLambda,
      {
        proxy: true,
      }
    );

    const productsResource = api.root.addResource("products");
    const productByIdResource = productsResource.addResource("{productId}");

    // Resources
    productsResource.addMethod("GET", getAllProductsLambdaIntegration);
    productByIdResource.addMethod("GET", getProductLambdaIntegration);
  }
}
