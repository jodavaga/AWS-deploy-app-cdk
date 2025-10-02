import { Handler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import Product from "../../../lib/models/product";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export const productsMock: Product[] = [
  {
    description: "Short Product Description1",
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    price: 24,
    title: "ProductOne",
    count: 5,
  },
  {
    description: "Short Product Description7",
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a1",
    price: 15,
    title: "ProductTitle",
    count: 5,
  },
  {
    description: "Short Product Description2",
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80a3",
    price: 23,
    title: "Product",
    count: 5,
  },
  {
    description: "Short Product Description4",
    id: "7567ec4b-b10c-48c5-9345-fc73348a80a1",
    price: 15,
    title: "ProductTest",
    count: 5,
  },
  {
    description: "Short Product Descriptio1",
    id: "7567ec4b-b10c-48c5-9445-fc73c48a80a2",
    price: 23,
    title: "Product2",
    count: 5,
  },
  {
    description: "Short Product Description7",
    id: "7567ec4b-b10c-45c5-9345-fc73c48a80a1",
    price: 15,
    title: "ProductName",
    count: 5,
  },
];

export const productsTableName = process.env.PRODUCTS_TABLE_NAME || "products";
export const stockTableName = process.env.STOCK_TABLE_NAME || "stock";

export const populateTables: Handler = async (event, context) => {
  try {
    const results = [];
    for (let product of productsMock) {
      const productId = crypto.randomUUID();

      const addProductCommand = new PutItemCommand({
        TableName: productsTableName,
        Item: {
          id: { S: productId },
          title: { S: product.title },
          description: { S: product.description },
          price: { N: String(product.price || 0) },
        },
      });

      const addProductResult = await dynamoDBClient.send(addProductCommand);
      console.log(
        "PutItem succeeded:",
        JSON.stringify(addProductResult, null, 2)
      );
      results.push(addProductResult);

      const stockCommand = new PutItemCommand({
        TableName: stockTableName,
        Item: {
          product_id: { S: productId },
          count: { N: product.count.toFixed() },
        },
      });

      const stockResult = await dynamoDBClient.send(stockCommand);
      console.log("PutStock succeeded:", JSON.stringify(stockResult, null, 2));
      results.push(stockResult);
    }

    return results;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding item to DynamoDB table");
  }
};
