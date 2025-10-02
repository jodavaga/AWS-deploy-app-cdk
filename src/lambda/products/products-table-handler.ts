import { Handler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
export const productsTableName = process.env.PRODUCTS_TABLE_NAME || "products";

export const addProduct: Handler = async (event, context) => {
  try {
    const command = new PutItemCommand({
      TableName: productsTableName,
      Item: {
        id: { S: crypto.randomUUID() },
        title: { S: event.title },
        description: { S: event.description },
        price: { N: String(event.price || 50) },
      },
    });

    const result = await dynamoDBClient.send(command);

    console.log("PutItem succeeded:", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding item to DynamoDB table");
  }
};
