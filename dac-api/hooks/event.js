"use strict";
const lib = require("../lib/index.js");
const _db = require("../lib/_dynamodb.js");

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
  let requestBody = JSON.parse(event.body);

  let { id, alternateId } = requestBody.data.events[0].target[0];

  console.log("Looking up", alternateId);
  let tenant = await _db.lookupTenant(alternateId.split("@")[1]);
  console.log("Found tenant", tenant);

  const url = lib.orgUrl + "/api/v1/groups?q=PENDING_" + tenant;
  try {
    const res = await lib.axios.get(url, lib.headers);
    if (res.status == 200 && res.data.length > 0) {
      console.log(res.data);
      console.log(`Adding user ${id} to group ${res.data[0].id}`);
      const res1 = await lib.axios.put(
        lib.orgUrl + "/api/v1/groups/" + res.data[0].id + "/users/" + id,
        null,
        lib.headers
      );

      console.log(res1.data);

      return response;
    }
  } catch (e) {
    throw e;
  }

  console.log(JSON.stringify(response));
  return response;
};
