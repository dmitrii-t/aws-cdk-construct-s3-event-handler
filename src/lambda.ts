import 'source-map-support/register';
import {S3Event, S3EventRecord, SQSEvent} from "aws-lambda";

export function withS3EventHandler(s3RecordHandler: (s3Record: S3EventRecord) => void) {
  return async (event: SQSEvent) => {
    console.log(`Handled SQS Event ${JSON.stringify(event)}`);

    // Processing messages in async manier
    await Promise.all(event.Records.map(sqsRecord => {
      try {
        console.info(`parsing sqs message ${JSON.stringify(sqsRecord)}`);
        const s3e: S3Event = JSON.parse(sqsRecord.body);

        // Processing s3 records
        s3e.Records.forEach(s3RecordHandler);

      } catch (e) {
        console.error(`Fail to process parsed msg ${sqsRecord.messageId}`, e);
      }
    }));
  };
}

export const echoS3EventHandler = withS3EventHandler((s3Record: S3EventRecord) => {
  console.log(`processing s3 record  ${JSON.stringify(s3Record)}`);
});


