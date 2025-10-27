import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { join } from "path";

export class CartServiceCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create VPC for Lambda + RDS
    const vpc = new ec2.Vpc(this, "CartVpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: "private-subnet",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // ✅ secure!
        },
        {
          name: "public-subnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    //  Store database credentials
    const dbCredentials = new secretsmanager.Secret(this, "CartDBSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: "cartadmin",
          dbname: "cartdb",
        }),
        generateStringKey: "password",
        excludePunctuation: true,
      },
    });

    // Create PostgreSQL RDS Database
    const db = new rds.DatabaseInstance(this, "CartRDS", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      databaseName: "cartdb",
      credentials: rds.Credentials.fromSecret(dbCredentials),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      publiclyAccessible: false,
      multiAz: false,
      allocatedStorage: 20,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      backupRetention: cdk.Duration.days(7),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    const lambdaFunction = new lambdaNodejs.NodejsFunction(
      this,
      "CartServiceLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: join(
          __dirname,
          "../../../src/nodejs-aws-cart-api/src/main.lambda.ts"
        ),
        handler: "handler",
        memorySize: 512,
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        bundling: {
          minify: true,
          externalModules: [
            "aws-sdk",
            "@nestjs/microservices",
            "class-transformer",
            "@nestjs/websockets/socket-module",
            "cache-manager",
            "class-validator",
          ],
        },
        environment: {
          DB_SECRET_ARN: dbCredentials.secretArn,
          DB_HOST: db.dbInstanceEndpointAddress, // DB host for Nest app
          DB_PORT: "5432",
          DB_NAME: "cartdb",
          DB_USERNAME: "cartadmin",
        },
      }
    );

    // Allow Lambda to reach DB
    db.connections.allowDefaultPortFrom(lambdaFunction);
    // Allow Lambda to read DB credentials
    dbCredentials.grantRead(lambdaFunction);

    const api = new apigateway.LambdaRestApi(this, "CartServiceApi", {
      handler: lambdaFunction,
      proxy: true,
      restApiName: "Cart Service",
      description: "Cart Microservice deployed via CDK + NestJS",
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });
  }
}
