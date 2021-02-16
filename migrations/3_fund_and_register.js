const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const web3 = require("web3");

module.exports = async function (deployer, network, accounts) {
  // Add funding for airline and flights for the client dapp to function
  if (network === "development") {
    const app = await FlightSuretyApp.deployed();
    const data = await FlightSuretyData.deployed();
    await data.authorizeCaller(FlightSuretyApp.address);
    console.log("Funding first airline...");
    await app.fund(accounts[1], {
      from: accounts[1],
      value: web3.utils.toWei("10", "ether"),
    });
    console.log(accounts[1]);

    await app.registerFlight("FS9999", "SJO -> AMS", 1587423058821, {
      from: accounts[1],
    });
    console.log("Registering flight #1...");

    await app.registerFlight("FS8888", "SJO -> NYE", 1587423397111, {
      from: accounts[1],
    });
    console.log("Registering flight #2...");

    await app.registerFlight("FS7777", "LHR -> LAX", 1587343397111, {
      from: accounts[1],
    });
    console.log("Registering flight #3 ...");
    await app.registerFlight("FS6666", "PTY -> SJO", 1587343397111, {
      from: accounts[1],
    });
    console.log("Registering flight #4...");
  }
};
