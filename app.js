//jshint esversion: 8
const request = require("request");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const csvToJson = require("convert-csv-to-json");
const jsonToCSV = require("json2csv").parse;
const SmartyStreetsSDK = require("smartystreets-javascript-sdk");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const SmartyStreetsCore = SmartyStreetsSDK.core;
const Lookup = SmartyStreetsSDK.usStreet.Lookup;
let authId = "***";
let authToken = "***";
const credentials = new SmartyStreetsCore.StaticCredentials(authId, authToken);

let client = SmartyStreetsCore.buildClient.usStreet(credentials);

const csvFilePath = "./SampleAddressList.csv";

var json = csvToJson
  .fieldDelimiter(",")
  .getJsonFromCsv("SampleAddressList.csv");

let batch = new SmartyStreetsCore.Batch();

for (let i = 0; i < json.length; i++) {
  var lookup = new Lookup(i);
  lookup.street = json[i]["street"];
  lookup.city = json[i]["city"];
  lookup.state = json[i]["state"];
  lookup.zipCode = json[i]["zipCode"];

  batch.add(lookup);
  // console.log(lookup);
}

client.send(batch).then(handleSuccess).catch(handleError);

async function handleSuccess(response) {
  console.log(" ");
  console.log(
    "***********Validated Address List below****************************************************** "
  );
  response.lookups.map((lookup) => console.log(lookup.result));

  // console.log(response);

  //write to csv file
  const csvWriter = createCsvWriter({
    path: "ReportOne.csv",
    header: [
      { id: "primaryNumber", title: "NUMBER" },
      { id: "street", title: "STREET" },
      { id: "city", title: "CITY" },
      { id: "state", title: "STATE" },
      { id: "zipCode", title: "ZIP" },
      { id: "plus4Code", title: "CARRIER ROUTE" },
    ],
  });

  var routeList = [];

  for (let i = 0; i < response.lookups.length; i++) {
    var lookup = response.lookups[i];
    // console.log('logging result for ', i);
    var reportOne = [
      {
        primaryNumber: lookup.result[0]["components"]["primaryNumber"],
        street: lookup.result[0]["components"]["streetName"],
        city: lookup.result[0]["components"]["cityName"],
        state: lookup.result[0]["components"]["state"],
        zipCode: lookup.result[0]["components"]["zipCode"],
        plus4Code: lookup.result[0]["components"]["plus4Code"],
      },
    ];

    routeList.push(lookup.result[0]["components"]["plus4Code"]);
    // console.log(routeList);
    // console.log(routeList.length);

    await csvWriter
      .writeRecords(reportOne)
      .then(() =>
        console.log("The ReportOne CSV file was written successfully")
      );

    // End of ReportOne
  }

  //Beginning of ReportTwo

  var countDuplicate = {};

  // The expression counts[x] || 0 returns the value of counts[x] if it is set, otherwise 0.
  // Then just add one and set it again in the object and the count is done.
  routeList.forEach(function (x) {
    countDuplicate[x] = (countDuplicate[x] || 0) + 1;
  });
  console.log(
    "******************************** Route List********************************"
  );
  console.log(countDuplicate);

  var csv = jsonToCSV(routeList, { fields: ["Route", "Number of Routes"] });
  fs.writeFileSync("ReportTwo.csv", csv);

  console.log("The ReportTwo CSV file was written successfully");

  // end of ReportTwo
}

function handleError(response) {
  console.log(response);
}
