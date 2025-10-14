import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import crypto from "crypto";
import { productsTableName, stockTableName } from "../products-table-handler";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function createProduct(body: {
  title: string;
  description: string;
  price: number;
  count?: number;
}) {
  const productId = crypto.randomUUID();

  const product = {
    id: { S: productId },
    title: { S: body.title },
    description: { S: body.description },
    price: { N: String(body.price || 0) },
  };

  const addProductCommand = new PutItemCommand({
    TableName: productsTableName,
    Item: product,
  });

  const stockCommand = new PutItemCommand({
    TableName: stockTableName,
    Item: {
      product_id: { S: productId },
      count: { N: String(body.count || 1) },
    },
  });

  await dynamoDBClient.send(addProductCommand);
  await dynamoDBClient.send(stockCommand);

  return unmarshall(product);
}
