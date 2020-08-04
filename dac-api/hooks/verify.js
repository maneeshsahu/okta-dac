"use strict";
const lib = require("../lib/index.js");

exports.handler = async function (event, context) {
  const response = {
    isBase64Encoded: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Link, link",
    },
    statusCode: 200,
    body: {},
  };
  console.log(event.body);
  let verificationHeader = event.headers["X-Okta-Verification-Challenge"];
  console.log("verificationHeader", verificationHeader);

  let requestBody = JSON.parse(event.body);

  console.log(JSON.stringify(response));

  response.body = JSON.stringify({
    verification: verificationHeader,
  });
  return response;
};
