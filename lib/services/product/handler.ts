import { APIGatewayEvent } from "aws-lambda";
import { products } from "./product-mock";

export interface ResponseProxyType {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export async function getAllProducts(
  event: APIGatewayEvent
): Promise<ResponseProxyType> {
  const response = {
    data: products,
    statusCode: 200,
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  };
}

export async function getProduct(
  event: APIGatewayEvent
): Promise<ResponseProxyType> {
  const productId = event.pathParameters?.productId;
  const product = products.find((p) => p.id === productId);

  if (product) {
    const response = {
      data: product,
      statusCode: 200,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  }

  const notFound = {
    data: {},
    message: "Product not found",
    statusCode: 404,
  };

  return {
    statusCode: 404,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notFound),
  };
}
