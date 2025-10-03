import { APIGatewayEvent, Context } from "aws-lambda";
import {} from "@aws-sdk/util-dynamodb";
import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

export interface ResponseProxyType {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const productsTable = process.env.PRODUCTS_TABLE_NAME;

export async function getAllProducts(
  event: APIGatewayEvent,
  context: Context
): Promise<ResponseProxyType> {
  try {
    const getAllProductsCommand = new ScanCommand({
      TableName: productsTable,
    });

    const getProductsResult = await dynamoDBClient.send(getAllProductsCommand);
    console.log(
      "🚀 ~ getAllProducts ~ getProductsResult:",
      unmarshall(getProductsResult)
    );

    if (!getProductsResult) {
      return {
        statusCode: 404,
        body: `All Products not found`,
      } as ResponseProxyType;
    }

    const response = {
      data: getProductsResult,
      statusCode: 200,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(err),
    };
  }
}

export async function getProduct(
  event: APIGatewayEvent
): Promise<ResponseProxyType> {
  try {
    const productId = event.pathParameters?.productId;
    // const product = products.find((p) => p.id === productId);

    const getProductCommand = new GetItemCommand({
      TableName: productsTable,
      Key: {
        id: { S: productId || "" },
      },
    });

    const productResult = await dynamoDBClient.send(getProductCommand);
    console.log("🚀 ~ getProduct ~ productResult:", productResult);

    if (!productResult) {
      return {
        statusCode: 404,
        body: `Product Id: ${productId} not found`,
      } as ResponseProxyType;
    }
    const response = {
      data: productResult,
      statusCode: 200,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(err),
    };
  }
}
