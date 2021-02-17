import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);

let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

const ORACLE_FEE = Web3.utils.toWei("1", "ether");
const TEST_ORACLES_COUNT = 20;
const GAS = 3000000;
let oracles = [];

web3.eth.getAccounts().then((accounts) => {
  // register 20 oracles
  for (let i = 0; i < TEST_ORACLES_COUNT; i++) {
    let oracle = accounts[29+ i];
    flightSuretyApp.methods
      .registerOracle()
      .send(
        { from: oracle, value: ORACLE_FEE, gas: GAS },
        (error, response) => {
          if (error) {
            console.log(error);
          } else {
            console.log("oracle " + (i + 1), " added: ", oracle);
            oracles.push({ oracle });

            // fetch indices

            flightSuretyApp.methods
              .getMyIndexes()
              .call({ from: oracle, gas: GAS }, (error, response) => {
                oracles[i].indices = response;
              });
          }
        }
      );
  }
});

flightSuretyApp.events.NotCreditedDev(
  {fromBlock: 0},
  function(error, event){
    console.log ("NOT CREDITED!\n==================\n");
    console.log(event);
  }
);

flightSuretyApp.events.CreditInsureesDev(
  {fromBlock: 0},
  function(error, event){
    console.log ("CREDITED!\n==================\n");
    console.log(event);
  }
);

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) console.log(error);
    else {
      const oracleIndex = event.returnValues[0];
      const airline = event.returnValues[1];
      const flightCode = event.returnValues[2];
      const timestamp = event.returnValues[3];

      // generate a status code
      let statuscodes = [0, 10, 20, 30, 40, 50];
      let statusCode = statuscodes[ Math.floor(Math.random() * statuscodes.length)];
      //console.log("STATUSCODE:======================\n\n\n\n\n\n\ "+ statusCode);
      let count = 0;
      oracles.forEach((oracle, i) => {
        if (oracle.indices.includes(oracleIndex)) {
          flightSuretyApp.methods
            .submitOracleResponse(
              oracleIndex,
              airline,
              flightCode,
              timestamp,
              statusCode
            )
            .send({ from: oracle.oracle, gas: GAS }, (error, response) => {
              if (error) {
                console.log(error.message);
              }
            });
          count += 1;
          if (count === 2) return;
        }
      });
    }
  }
);

flightSuretyApp.events.OracleReport(
  {
    fromBlock: 0,
  },
  function (error, event) {
    if (error) {
      console.log("Error - OracleReport");
      console.log(error);
    } else {
      console.log("OracleReport");
      console.log(event);
    }
  }
);

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

export default app;
