import { Handler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const tableName = process.env.TABLE_NAME || "Products";

export const addProduct: Handler = async (event, context) => {
  try {
    const command = new PutItemCommand({
      TableName: tableName,
      Item: {
        id: { S: crypto.randomUUID() },
        title: { S: event.title },
        description: { S: event.description },
        price: { N: event.price || "50" },
        createdAt: { N: new Date().getTime().toFixed() },
      },
    });

    const result = await dynamoDB.send(command);

    console.log("PutItem succeeded:", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding item to DynamoDB table");
  }
};
