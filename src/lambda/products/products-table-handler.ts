import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Handler, SQSEvent } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { ResponseProxyType } from "../../../lib/services/product/handler";
import { createProduct } from "./helpers/createProduct";

export const productsTableName = process.env.PRODUCTS_TABLE_NAME || "products";
export const stockTableName = process.env.STOCK_TABLE_NAME || "stocks";

export const addProduct: Handler = async (event, context) => {
  try {
    const productId = crypto.randomUUID();
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    const result = await createProduct(body);

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

    console.log(
      "Add item succeeded:",
      JSON.stringify(unmarshall(result), null, 2)
    );

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

const snsClient = new SNSClient({});

export const catalogBatchProcess: Handler = async (event: SQSEvent) => {
  console.log("Received batch with", event.Records.length, "messages");

  const createdProducts = [];

  for (const record of event.Records) {
    try {
      const product = JSON.parse(record.body);
      console.log("Processing product:", product);

      const createdProduct = await createProduct(product);

      createdProducts.push(createdProduct);
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
