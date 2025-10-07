import { Handler } from "aws-lambda";

const tableName = process.env.STOCK_TABLE_NAME || "stock";

export const importProducts: Handler = async (event, context) => {
  try {
    return {};
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding/Getting stock to DynamoDB table");
  }
};
