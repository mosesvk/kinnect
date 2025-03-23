// test-aws-connection.js
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a test file
const testFilePath = path.join(__dirname, 'test-file.txt');
fs.writeFileSync(testFilePath, 'This is a test file for AWS S3 connection testing.');

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Test file parameters
const testFile = {
  Bucket: process.env.AWS_S3_BUCKET,
  Key: `test-uploads/test-file-${Date.now()}.txt`,
  Body: fs.readFileSync(testFilePath),
  ContentType: 'text/plain',
};

// Main testing function
async function testAwsConnection() {
  console.log('Starting AWS S3 connection test...');
  console.log(`Using bucket: ${process.env.AWS_S3_BUCKET}`);
  
  try {
    // Step 1: Upload test file
    console.log(`\nStep 1: Uploading test file to ${testFile.Key}...`);
    const uploadCommand = new PutObjectCommand(testFile);
    const uploadResult = await s3Client.send(uploadCommand);
    console.log('✅ Upload successful!', uploadResult);
    
    // Step 2: Retrieve file metadata
    console.log('\nStep 2: Retrieving file metadata...');
    const getCommand = new GetObjectCommand({
      Bucket: testFile.Bucket,
      Key: testFile.Key,
    });
    const getResult = await s3Client.send(getCommand);
    console.log('✅ File retrieval successful!');
    console.log('Content Type:', getResult.ContentType);
    console.log('Content Length:', getResult.ContentLength);
    console.log('Last Modified:', getResult.LastModified);
    
    // Step 3: Retrieve and verify file content
    console.log('\nStep 3: Verifying file content...');
    const fileStream = getResult.Body;
    const chunks = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    const fileContent = Buffer.concat(chunks).toString('utf-8');
    console.log('File content:', fileContent);
    console.log('✅ Content verification successful!');
    
    // Step 4: Delete test file
    console.log('\nStep 4: Cleaning up - deleting test file...');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: testFile.Bucket,
      Key: testFile.Key,
    });
    await s3Client.send(deleteCommand);
    console.log('✅ File deletion successful!');
    
    // Clean up local test file
    fs.unlinkSync(testFilePath);
    
    console.log('\n🎉 AWS S3 connection test completed successfully!');
    console.log('Your AWS configuration is working properly.');
    
  } catch (error) {
    console.error('\n❌ AWS S3 connection test failed:');
    console.error(error);
    
    // Provide troubleshooting guidance based on error
    if (error.name === 'CredentialsProviderError') {
      console.error('\nTroubleshooting: This appears to be an authentication issue.');
      console.error('- Verify your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct');
      console.error('- Check if your IAM user has the required S3 permissions');
    } else if (error.name === 'NoSuchBucket') {
      console.error('\nTroubleshooting: The specified bucket does not exist.');
      console.error('- Verify the AWS_S3_BUCKET name is correct');
      console.error('- Confirm the bucket exists in the specified AWS_REGION');
    } else if (error.name === 'AccessDenied') {
      console.error('\nTroubleshooting: Access denied to the bucket or object.');
      console.error('- Verify your IAM user has the required permissions for this bucket');
      console.error('- Check bucket policies that might be restricting access');
    }
    
    // Clean up local test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

// Run the test
testAwsConnection();