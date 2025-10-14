import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { Handler, SQSEvent } from "aws-lambda";
import { randomUUID } from "crypto";

const dynamoDB = new DynamoDBClient({});
const snsClient = new SNSClient({});

export const catalogBatchProcess: Handler = async (event: SQSEvent) => {
  console.log("Received batch with", event.Records.length, "messages");

  const createdProducts = [];

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
            count: { N: String(product.count || 1) },
          },
        })
      );

      createdProducts.push(product);
    } catch (err) {
      console.error("Error processing record:", err);
    }
  }

  // Publish all created products to SNS
  if (createdProducts.length > 0) {
    const message = `New products created:\n\n${JSON.stringify(
      createdProducts,
      null,
      2
    )}`;

    // Send email notification
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.CREATE_PRODUCT_TOPIC_ARN,
        Subject: "New Products Added to Catalog",
        Message: message,
      })
    );

    console.log("Published message to SNS");
  }

  return {
    statusCode: 200,
    body: JSON.stringify("Batch processed successfully"),
  };
};
