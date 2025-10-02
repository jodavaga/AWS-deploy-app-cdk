import { Handler } from "aws-lambda";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const tableName = process.env.STOCK_TABLE_NAME || "stock";

export const addStock: Handler = async (event, context) => {
  try {
    const getCommand = new GetItemCommand({
      TableName: "products",
      Key: {
        id: { S: event.id },
      },
    });

    const getResult = await dynamoDBClient.send(getCommand);

    if (!getResult.Item) {
      return { statusCode: 404, body: `Item/Product ${event.id} not found` };
    }

    const addStockCommand = new PutItemCommand({
      TableName: tableName,
      Item: {
        product_id: { S: event.id },
        count: { N: event.count },
      },
    });

    const result = await dynamoDBClient.send(addStockCommand);

    console.log("PutStock succeeded:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding/Getting stock to DynamoDB table");
  }
};
