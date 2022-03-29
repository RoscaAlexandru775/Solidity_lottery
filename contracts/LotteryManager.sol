// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./Lottery.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LotteryManager is Ownable {
    address[] public arrayLotteries;

    constructor() {}

    function createLottery(
        string memory _nameLottery,
        uint256 _endDate,
        uint256 _priceOfEntrance,
        uint256 _maxNumberOfEntries
    ) public onlyOwner {
        require(
            bytes(_nameLottery).length != 0,
            "The lottery must have a name!"
        );
        require(
            _endDate > block.timestamp,
            "End date should be in the future!"
        );
        require(_priceOfEntrance > 0, "The price of entrance should be not 0!");
        require(
            _maxNumberOfEntries > 0,
            "The user should be entrance at least once!"
        );

        address lottery = address(
            new Lottery(
                msg.sender,
                _nameLottery,
                _endDate,
                _priceOfEntrance,
                _maxNumberOfEntries
            )
        );
        arrayLotteries.push(lottery);
    }

    function getLotteries() public view returns (address[] memory) {
        return arrayLotteries;
    }

}
