pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;         
        struct Airline{
        bool isRegistered;
        bool isFunded;
    }
        struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }

    struct Customer{
        uint payment;
        address customer;
    }
    
    mapping (bytes32 => Customer[] ) insurances; 

    mapping (address => Airline) private airlines;
    uint private airlineCount;


    mapping(bytes32 => Flight) private flights;

    //currently not being used :) 
    mapping (address => bool) private allowedContracts;

    //credited accounts
    uint private funds = 0;
    mapping (address => uint) private creditedAccounts;



                           // Blocks all state changes throughout the contract if false

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event ImproperFunding(address, string);
    event Funded(address);
    event CustomerCredited(address);
    event InsurancesPaid(address airline,
                            string flight,
                            uint256 timestamp);
    event FlightRegistered(address airline,
                                    string flight,
                                    uint256 timestamp);
    
    event FlightProcessed(address airline,
                                    string flight,
                                    uint256 timestamp,
                                    uint8 statusCode);
    event Insured(address customer, uint256 value);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        allowedContracts[msg.sender] = true;
        airlines[msg.sender] = Airline({
            isRegistered: true,
            isFunded: false
        });
        airlineCount = 1;

    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }
    modifier requireAuthorizedContract(){
        require(allowedContracts[msg.sender]);
        _;
    }
    modifier requireIsAirline(){
        require(airlines[msg.sender].isRegistered == true);
        _;
    }
    modifier requireIsFunded(address airline){
        require(airlines[airline].isFunded == true);
        _;
    }
        modifier requireIsAirlineAddress(address a){
        require(airlines[a].isRegistered == true);
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational; 
    }
    function getAirlineCount()public view returns (uint){
        return airlineCount;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /**
    @dev set allowed contracts

    
    
     */
     function setAllowedContracts(address newaddress) requireContractOwner external{
         allowedContracts[msg.sender] = true;

     } 

     function airlineIsRegistered (address newAddress) requireAuthorizedContract() public view  returns (bool){
         return airlines[newAddress].isRegistered;
     }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    app logic will decide if a new airline can be added
    *
    */   
    function registerAirline
                            (   
                                address newAirline
                            )
                            requireIsAirline()
                            requireAuthorizedContract()
                            external
                        
    {
        require(airlines[newAirline].isRegistered == false, "new airline is already registered");
        airlines[newAirline] = Airline({
            isRegistered: true,
            isFunded: false
        });
       allowedContracts[newAirline] = true;
       airlineCount++;
    }

        function registerFlight
                                (
                                    address airline,
                                    string flight,
                                    uint256 timestamp
                                )
                                external
                                requireIsAirlineAddress(airline)
                                requireIsOperational
                                requireAuthorizedContract
                                requireIsFunded(airline)
    {                       
        bytes32 key = getFlightKey(airline, flight, timestamp);
        require(flights[key].isRegistered != true, "flight is already registered");
        flights[key] = Flight({
            isRegistered: true,
            statusCode: 0,
            updatedTimestamp: timestamp,
            airline: airline
        });
        emit FlightRegistered(airline, flight, timestamp);

    }
    function processFlightStatus
                                (
                                    address airline,
                                    string  flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                external
                                requireIsAirlineAddress(airline)
                                requireIsOperational
                                requireAuthorizedContract
                                requireIsFunded(airline)                        
    {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        require(flights[key].isRegistered == true, "flight is not registered");
        flights[key] = Flight({
            isRegistered: true,
            statusCode: statusCode,
            updatedTimestamp: timestamp,
            airline: airline
        });
        emit FlightProcessed(airline, flight, timestamp, statusCode);

    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (  
                                       address airline,
                            string  flight,
                            uint256 timestamp,
                            address customer    
                            )
                            external
                            payable
                            requireAuthorizedContract()
    {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        for (uint i = 0; i < insurances[key].length; i++){
            require(insurances[key][i].customer != customer, "Customer has already bought insurance for this flight");
        }
        insurances[key].push( Customer({
            customer: customer,
            payment: msg.value
        }));
        emit Insured(customer, msg.value);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address airline,
                            string flight,
                            uint256 timestamp
                                )
                                requireAuthorizedContract()
                                external
                                
    {
        //TODO find out how to get flight information and register oracles
        bytes32 key = getFlightKey(airline, flight, timestamp);
        for (uint i = 0; i < insurances[key].length; i++){
            Customer storage c = insurances[key][i];
            creditedAccounts[c.customer] += c.payment.mul(3).div(2);
            //rimportant to delete this . . .
            c.payment = 0;
            emit CustomerCredited(c.customer);
            //to be extra safe and free up space . . .
            delete insurances[key][i];
        }
        //log storage is cheaper so we're just going to store it there
        emit InsurancesPaid( airline,
                          flight,
                         timestamp);
        delete insurances[key];
        
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            payable
                            requireAuthorizedContract()
    {   
        require (creditedAccounts[msg.sender] > 0, "account has no funds to withdraw");
        require(tx.origin == msg.sender, "only externally owned accounts may withdraw funds");
        uint debted  = creditedAccounts[msg.sender];
        creditedAccounts[msg.sender] = 0;
        //solidity is not a well-designed language
        msg.sender.transfer(debted);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
     //   funds += msg.value;
        require(msg.value > 10 ether, "insufficient funds, 10 ether is the minimum");
        if (airlines[msg.sender].isRegistered && !airlines[msg.sender].isFunded){
            airlines[msg.sender].isFunded = true;
            emit Funded(msg.sender);
        } 
        else if (airlines[msg.sender].isRegistered == false)
            emit ImproperFunding(msg.sender, "Airline is not registered");
        else if (airlines[msg.sender].isFunded)
            emit ImproperFunding(msg.sender, "Airline is already funded");
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

