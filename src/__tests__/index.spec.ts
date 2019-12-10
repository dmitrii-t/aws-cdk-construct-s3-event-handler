// Integration test

import {App, CfnOutput, Stack} from '@aws-cdk/core';
import {OutputLogEvent, OutputLogEvents} from 'aws-sdk/clients/cloudwatchlogs';
import {expect} from 'chai';
import {S3EventHandlerConstruct} from '../index';
import {deployStack, withStack} from 'cdk-util';
import * as path from 'path';
import * as AWS from 'aws-sdk';
import {Code, Runtime} from "@aws-cdk/aws-lambda";
import {EventType} from "@aws-cdk/aws-s3";
import {getLogEventInGroup} from "./aws-util";

/**
 * CDK output directory
 */
const CdkOut = path.resolve('cdk.out');

const s3EventHandler = {
  handler: 'lambda.echoS3EventHandler',
  runtime: Runtime.NODEJS_10_X,
  code: Code.fromAsset('./dist'),
};

describe('given cdk stack which creates s3 bucket, queue with handler and subscription for the queue to that bucket', () => {

  const nonAuditablePath = 'path/nonAuditable';

  const auditablePath = 'path/auditable';

  /**
   * Stack to deploy the construct for tests
   */
  class S3EventHandlerConstructTest extends Stack {
    constructor(scope: App, id: string) {
      super(scope, id);

      const construct = new S3EventHandlerConstruct(this, {id: 'S3EventHandlerConstructTest', s3EventHandler});

      // Creates subscription for auditable path
      construct.subscribe(EventType.OBJECT_CREATED_PUT, {prefix: auditablePath});

      // Outputs
      new CfnOutput(this, 'S3EventHandlerName', {value: construct.s3EventHandlerName});
      new CfnOutput(this, 'BucketName', {value: construct.bucketName});
    }
  }

  const id = 'S3EventHandlerConstructTest';
  const app = new App({outdir: CdkOut});
  const stack = new S3EventHandlerConstructTest(app, id);

  // Setup task
  before(async () => {
    await deployStack({name: id, app, exclusively: true});
  });

  // Cleanup task
  // after(async () => {
  //   await destroyStack({name: id, app, exclusively: true});
  // });

  it('should process s3 event when PutObject action triggered', withStack({name: id, app, exclusively: true}, async ({environment, stack}) => {
    console.info(`Stack Outputs:\n${JSON.stringify(stack.Outputs)}`);

    // Given
    const s3EventHandlerName = stack.Outputs!!.find(it => it.OutputKey === 'S3EventHandlerName')!!.OutputValue;
    const bucketName = stack.Outputs!!.find(it => it.OutputKey === 'BucketName')!!.OutputValue;

    AWS.config.update({region: 'us-west-2'});
    const s3Client = new AWS.S3();
    const cwLogsClient = new AWS.CloudWatchLogs();

    const nonAuditableRecordKey = `${nonAuditablePath}/record.log`;
    const auditableRecordKey = `${auditablePath}/record.log`;

    // Put objects
    await s3Client.putObject({Bucket: bucketName, Key: nonAuditableRecordKey, Body: "nonAuditablerecord"}).promise();
    await s3Client.putObject({Bucket: bucketName, Key: auditableRecordKey, Body: "auditableRecord"}).promise()
    // Wait for log record to appear
    await wait(20);

    // Then
    const s3HandlerLogEvents: OutputLogEvents = await getLogEventInGroup({
      logGroupPrefix: `/aws/lambda/${s3EventHandlerName}`,
      cwLogsClient
    });

    console.log(`Log Events: \n${JSON.stringify(s3HandlerLogEvents)}`);

    expect(s3HandlerLogEvents.find(it => it.message!!.indexOf(nonAuditableRecordKey) > 0)).to.not.exist;
    expect(s3HandlerLogEvents.find(it => it.message!!.indexOf(auditableRecordKey) > 0)).to.exist;
  }));
});

async function wait(sec: number) {
  const startTime = new Date().getTime();
  await new Promise((resolve, reject) => {
    setTimeout(resolve, sec * 1000);
  });
  console.info(`Waited for ${(new Date().getTime() - startTime) / 1000.0}sec`);
}
