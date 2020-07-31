"use strict";

const AWS = require("aws-sdk");
let options = {};

// connect to local DB if running offline
// if (process.env.IS_OFFLINE) {
//   options = {
//     region: "localhost",
//     endpoint: "http://localhost:8000",
//   };
//   console.log("Options", options);
// }

const dynamodb = new AWS.DynamoDB.DocumentClient(options);

async function createDomainRecord(tenant, domain) {
  console.log("dynamodb", dynamodb);
  let uid = ""; // TBD add  uid
  const params = {
    TableName: process.env.DOMAINS_TABLE,
    Item: {
      domain,
      tenant,
      created: new Date().getTime(),
      createdBy: uid,
    },
    ConditionExpression: "attribute_not_exists(#domain)",
    ExpressionAttributeNames: { "#domain": "domain" },
  };

  let retVal = undefined;
  try {
    // write the domain entry to the database
    console.log("Writing to dynamo DB", JSON.stringify(params));

    let result = await dynamodb.put(params).promise();
    retVal = params.Item;
    return retVal;
  } catch (error) {
    console.log("error", error);
    console.log(
      `Could not add the domain for the Tenant. Reason: ${error.code}`
    );
  }
}

async function lookupTenant(domain) {
  const params = {
    TableName: process.env.DOMAINS_TABLE,
    IndexName: "domains-" + process.env.DOMAINS_TABLE,
    KeyConditionExpression: "#domain = :value",
    ExpressionAttributeNames: {
      "#domain": "domain", // name is a reserved word, should have just used domain :P
    },
    ExpressionAttributeValues: {
      ":value": domain,
    },
    ProjectionExpression: "tenant",
  };

  let tenant = undefined;
  try {
    let result = await dynamodb.query(params).promise();
    console.log("Got result", JSON.stringify(result));
    if (result.Items.length != 1) {
      console.log(`No tenant associated with domain: '${domain}'`);
    } else {
      // create a response
      tenant = result.Items[0].tenant;
    }
  } catch (error) {
    console.log("error", error);
    console.log(`Could not fetch the tenant for the domain: '${domain}' `);
  }
  return tenant;
}

async function deleteDomainRecord(tenant, domain) {
  const params = {
    TableName: process.env.DOMAINS_TABLE,
    Key: {
      domain,
      tenant,
    },
    ReturnValues: "ALL_OLD",
  };

  console.log("Delete Domain Item", JSON.stringify(params));

  // delete the domain from the database
  try {
    dynamodb.delete(params).promise();
  } catch (error) {
    console.log("error", error);
    console.log(`Could not delete the domain entry: '${domain}', '${tenant}' `);
  }
}

module.exports = {
  client: dynamodb,
  createDomainRecord,
  deleteDomainRecord,
  lookupTenant,
};
