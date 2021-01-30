import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

const DEBUG = true;

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
console.log(flightSuretyData._address);
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress).deploy({
  data: FlightSuretyApp.bytecode,
  arguments: [flightSuretyData.address]
});
console.log(flightSuretyApp);


const ORACLE_FEE = Web3.utils.toWei( '1', "ether");
const ORACLE_COUNT = 20;
const GAS = 300000;
let oracles = [];
web3.eth.getAccounts().then( (accounts) => {
  for (let i=50 - ORACLE_COUNT; i < 50; i++){
    let oracle = accounts[i];
    flightSuretyApp.methods.registerOracle().send({
      from: oracle, value: ORACLE_FEE, gas: GAS
    },  (error, response) =>
    {
      if (error)
        console.log(error);
      else{
        console.log("getting indexes for oracle " + i + ", "+ oracle);
        
        flightSuretyApp.methods.getMyIndexes().call({from: oracle, gas: GAS}
          , (error, response => {
              if(error){
                console.log(error)
              }
              else{
                oracles.push({oracle, response})
              }
          }));
      }
    })
}
});

// use the last 20 accounts


function generateStatusCode(){
  const statuses = [0, 10, 20, 30, 40, 50];
  return statuses[Math.random() % statuses.length];
}


console.log(flightSuretyApp.events);
flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    else{ 

      if (DEBUG) console.log(event);
      const index = event.returnValues[0];
      const airline = event.returnValues[1];
      const flight = event.returnValues[2];
      const timestamp = event.returnValues[3];
      let statusCode = generateStatusCode();
      oracles.forEach((oracle) => {
          if (oracle.indices.includes(index)){
            flightSuretyApp.methods.submitOracleResponse(
              index,
              airline,
              flight,
              timestamp,
              statusCode
            ).send({from: oracle.oracle, gas: GAS}, (err, resp)=>{
              console.log(err);
            });
          } 

      });
    }
    
});

console.log(FlightSuretyApp.events);
FlightSuretyApp.events.OracleReport({
  fromBlock: 0,
}, (error, response) => {
  if (error){
    console.log("Error: oracleReport");
    console.log(error);
  }
  else{
    console.log("Oracle report: ");
    console.log(response);
  }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});

export default app;


