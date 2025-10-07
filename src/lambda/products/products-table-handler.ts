import { Handler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { ResponseProxyType } from "../../../lib/services/product/handler";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
export const productsTableName = process.env.PRODUCTS_TABLE_NAME || "products";
const stockTableName = process.env.STOCK_TABLE_NAME;

export const addProduct: Handler = async (event, context) => {
  try {
    const productId = crypto.randomUUID();
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    const addProductCommand = new PutItemCommand({
      TableName: productsTableName,
      Item: {
        id: { S: productId },
        title: { S: body.title },
        description: { S: body.description },
        price: { N: String(body.price || 50) },
      },
    });

    // Update Stock count command
    const stockCommand = new PutItemCommand({
      TableName: stockTableName,
      Item: {
        product_id: { S: productId },
        count: { N: body.count.toFixed() },
      },
    });

    const stockResult = await dynamoDBClient.send(stockCommand);
    console.log("UpdateStock count:", JSON.stringify(stockResult, null, 2));

    const result = await dynamoDBClient.send(addProductCommand);
    if (!result) {
      console.log("failed creating product");
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: `Product was not created`,
      } as ResponseProxyType;
    }

    console.log("Add item succeeded:", JSON.stringify(result, null, 2));

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Product created successfully",
        productId,
      }),
    };
  } catch (error) {
    console.error(
      "Error adding item to DynamoDB:",
      JSON.stringify(error, null, 2)
    );
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Error adding item", error }),
    };
  }
};
