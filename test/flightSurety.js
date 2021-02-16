
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyApp.deployed();
    
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {


    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
//    console.log(web3.version);
    console.log(status);
    console.log(config.flightSuretyApp.address);
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
          console.log(e);
      }
      await config.flightSuretyData.setOperatingStatus(true);
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSuretyData.isFunded(config.owner);
      }
      catch(e) {
          console.log(e);
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    let resxd = await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    // ARRANGE
    let newAirline = accounts[2];
    let reverted = false;
    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline);
    }
    catch(e) {
        reverted = true

    }

    assert.equal(reverted, true, "Airline should not be able to register another airline if it hasn't provided funding");

  });
  
  it('Can register 4 airlines', async () => {
    console.log("authorizecaller: ");
    console.log( await config.flightSuretyData.methods['authorizeCaller(address)'](config.flightSuretyApp.address, 
        {
        nonce: await web3.eth.getTransactionCount(config.owner)
        }));



      assert( config.firstAirline, "firstairline is undefined!");
      await config.flightSuretyApp.fund(config.firstAirline, {
          value: web3.utils.toWei("10", "ether"),
          nonce: await web3.eth.getTransactionCount(config.owner)
    }
      );
      let newAirline = accounts[2];
        try{
                await config.flightSuretyApp.registerAirline(newAirline, {
                    from: config.firstAirline,
                    nonce: await web3.eth.getTransactionCount(config.firstAirline)
                });
        }
        catch(e){
            console.log(e);
            reverted = true;

        }
        assert.equal(reverted, false);



/*
    const offset = 14;
    for (let i=offset; i < offset + 4; i++){
        try {
            //use some of accounts we haven't used before            
                //await config.flightSuretyApp.registerAirline(accounts[i], {from: config.owner});
                console.log (config.flightSuretyData.registerAirline);
                await config.flightSuretyApp.registerAirline.sendTransaction(accounts[i], {from: config.owner});
                await config.flightSuretyData.fund.sendTransaction({from: accounts[i], value: web3.utils.toWei("10", "ether")});
                //console.log(config.flightSuretyData.methods);
                

              
                var res =await config.flightSuretyData.isAirline.call( accounts[i] );
                console.log("airline: "+accounts[i]+" is an airline: "+res );
        }  
        catch(e) {
            console.log(e);
        }
    }
    let result;
    //let result = await config.flightSuretyData.isAirline.call(newAirline); 
    //console.log(result);
    result = true;
    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
*/ 


  });
  // */

});
