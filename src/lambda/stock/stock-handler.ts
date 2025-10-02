import { Handler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const tableName = process.env.STOCK_TABLE_NAME || "stock";

export const addStock: Handler = async (event, context) => {
  try {
    // const getCommand = new GetCommand({
    //   TableName: "products",
    //   Key: {
    //     id: { S: "922261aa-47a6-4c91-9fe3-5c27e21cec8c" },
    //   },
    // });
    // console.log("🚀 ~ addStock ~ getCommand:", getCommand);
    // if (!getCommand) return [];

    // const getResult = await docClient.send(getCommand);
    // console.log("🚀 ~ addStock ~ GetCommand:", getResult.Item);

    const addStockCommand = new PutItemCommand({
      TableName: tableName,
      Item: {
        product_id: { S: event.id },
        count: { N: event.count },
      },
    });

    const result = await dynamoDBClient.send(addStockCommand);

    console.log("PutItem succeeded:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding/Getting stock to DynamoDB table");
  }
};
