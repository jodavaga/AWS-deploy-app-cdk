import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler, SQSEvent } from "aws-lambda";
import { randomUUID } from "crypto";

const dynamoDB = new DynamoDBClient({});

export const catalogBatchProcess: Handler = async (event: SQSEvent) => {
  console.log("Received batch with", event.Records.length, "messages");

  for (const record of event.Records) {
    try {
      const product = JSON.parse(record.body);
      console.log("Processing product:", product);

      const id = product.id || randomUUID();

      await dynamoDB.send(
        new PutItemCommand({
          TableName: process.env.PRODUCTS_TABLE_NAME,
          Item: {
            id: { S: id },
            title: { S: String(product.title || "Untitled") },
            description: { S: String(product.description || "") },
            price: { N: String(product.price || 0) },
          },
        })
      );
    } catch (err) {
      console.error("Error processing record:", err);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify("Batch processed successfully"),
  };
};
