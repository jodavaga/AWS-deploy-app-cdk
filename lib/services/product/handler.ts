import { APIGatewayEvent, Context } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

const productsTableName = process.env.PRODUCTS_TABLE_NAME;
const stockTableName = process.env.STOCK_TABLE_NAME;
export interface ResponseProxyType {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function getAllProducts(
  event: APIGatewayEvent,
  context: Context
): Promise<ResponseProxyType> {
  try {
    const getAllProductsCommand = new ScanCommand({
      TableName: productsTableName,
    });
    const getStockCommand = new ScanCommand({
      TableName: stockTableName,
    });

    const getProductsResult = await dynamoDBClient.send(getAllProductsCommand);
    const stockResult = await dynamoDBClient.send(getStockCommand);

    if (!getProductsResult) {
      return {
        statusCode: 404,
        body: `All Products not found`,
      } as ResponseProxyType;
    }
    if (!stockResult) {
      return {
        statusCode: 404,
        body: `Stock not found`,
      } as ResponseProxyType;
    }

    const productsList = getProductsResult.Items?.map((product) =>
      unmarshall(product)
    );
    const stockList = stockResult.Items?.map((stockItem) =>
      unmarshall(stockItem)
    );

    const productsStockJoined = productsList?.map((product) => ({
      ...product,
      count: stockList?.find((stockItem) => stockItem.product_id === product.id)
        ?.count,
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(productsStockJoined),
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

    const getProductCommand = new GetItemCommand({
      TableName: productsTableName,
      Key: {
        id: { S: productId || "mockId" },
      },
    });

    const productResult = await dynamoDBClient.send(getProductCommand);
    if (!productResult) {
      return {
        statusCode: 404,
        body: `Product Id: ${productId} not found`,
      } as ResponseProxyType;
    }

    const productData = unmarshall(productResult.Item ?? {});

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(productData),
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
