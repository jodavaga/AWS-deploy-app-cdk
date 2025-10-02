import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";
import { DynamoDbBaseTable } from "../../../src/dynamodb/dynamodb-base-class";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";

export const PRODUCTS_TABLE_NAME = "products";
export const STOCK_TABLE_NAME = "stock";

export class ProductStack extends cdk.Stack {
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

    //Dynamo DB Tables
    const productsTable = new DynamoDbBaseTable(this, "Products", {
      tableName: PRODUCTS_TABLE_NAME,
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });

    const stockTable = new DynamoDbBaseTable(this, "Stock", {
      tableName: STOCK_TABLE_NAME,
      partitionKey: {
        name: "product_id",
        type: AttributeType.STRING,
      },
    });

    // Lambdas for Dynamo tables
    const addProductLambda = new lambda.Function(
      this,
      "PopulateProducts-lambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handler.populateTables",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../../src/lambda/populate")
        ),
        environment: {
          PRODUCTS_TABLE: PRODUCTS_TABLE_NAME,
          STOCK_TABLE: STOCK_TABLE_NAME,
        },
      }
    );
    // const addProductLambda = new lambda.Function(this, "Products-lambda", {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   memorySize: 1024,
    //   timeout: cdk.Duration.seconds(5),
    //   handler: "handler.addProduct",
    //   code: lambda.Code.fromAsset(
    //     path.join(__dirname, "../../../src/lambda/products")
    //   ),
    //   environment: {
    //     TABLE_NAME: PRODUCTS_TABLE_NAME,
    //   },
    // });

    // const stockLambda = new lambda.Function(this, "Stock-lambda", {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   memorySize: 1024,
    //   timeout: cdk.Duration.seconds(5),
    //   handler: "stock-handler.addStock",
    //   code: lambda.Code.fromAsset(
    //     path.join(__dirname, "../../../src/lambda/stock")
    //   ),
    //   environment: {
    //     TABLE_NAME: STOCK_TABLE_NAME,
    //   },
    // });

    productsTable.grantWriteData(addProductLambda);
    stockTable.grantWriteData(addProductLambda);
  }
}
