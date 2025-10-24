import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";

export const basicAuthorizer = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log("Event:", JSON.stringify(event));

  if (!event.authorizationToken) {
    console.log("No Authorization header found");
    throw new Error("Unauthorized"); // AWS converts this into a 401 automatically
  }

  try {
    const authToken = event.authorizationToken.replace("Basic ", ""); // "Basic base64encoded"
    const decoded = Buffer.from(authToken, "base64").toString("utf-8"); // "username:password"
    const [username, password] = decoded.split(":");

    console.log("Decoded credentials:", { username, password });

    const envPassword = process.env[username];
    const effect = envPassword && envPassword === password ? "Allow" : "Deny";

    return generatePolicy(username, event.methodArn, effect);
  } catch (err) {
    console.error("Authorization error:", err);
    throw new Error("Forbidden"); // AWS interprets this as 403
  }
};

const generatePolicy = (
  principalId: string,
  resource: string,
  effect: "Allow" | "Deny"
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};
