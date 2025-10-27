import * as rds from "aws-cdk-lib/aws-rds";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { aws_secretsmanager as secretsmanager } from "aws-cdk-lib";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { join } from "path";

export class HelloRdsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbCredentialsSecret = new secretsmanager.Secret(this, "MyDBCreds", {
      secretName: "MyDBCredsName",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: "myadminuser",
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: "password",
      },
    });

    const vpc = new ec2.Vpc(this, "MyVPC", {
      maxAzs: 2, // Default is all AZs in the region
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "PublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const dbInstance = new rds.DatabaseInstance(this, "RDSInstance", {
      // MySQL
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_11,
      }),

      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    const lambdaFunction = new lambdaNodejs.NodejsFunction(
      this,
      "LambdaFunction",
      {
        // lambda Function Config
        runtime: lambda.Runtime.NODEJS_20_X, // Choose appropriate version you prefer
        entry: join(__dirname, "../../../src/nodejs-aws-cart-api/src/main.ts"), // Path to your nestjs app's lambda file
        handler: "bootstrap",
        bundling: {
          externalModules: [
            "aws-sdk",
            "@nestjs/microservices",
            "class-transformer",
            "@nestjs/websockets/socket-module",
            "cache-manager",
            "class-validator",
          ], // Exclude non-runtime dependencies
        },
        vpc, // Associate the Lambda function with the VPC
        allowPublicSubnet: true, // Confirm that lambda is in VPC
        securityGroups: [dbInstance.connections.securityGroups[0]],
      }
    );

    // Assign permissions
    dbInstance.connections.allowDefaultPortFrom(lambdaFunction);
    dbCredentialsSecret.grantRead(lambdaFunction);
  }
}
