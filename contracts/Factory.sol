// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AmmSwap.sol";

contract Factory is Ownable {

    address[] public contracts;
    uint256 fee = 1000 wei;

    constructor(address _initial) Ownable(_initial){}

    modifier requireFee() {
        require(msg.value == fee, "you have not enough funds to pay fee");
        _;
    }

    function createPair(ERC20 _token0, ERC20 _token1, uint256 _amount0, uint256 _amount1) external {
        require(address(_token0) != address(0) && address(_token1) != address(0), "address(0)");
        AmmSwap ammSwap = new AmmSwap(_token0, _token1, _amount0, _amount1,  msg.sender);
        contracts.push(address(ammSwap));
    }
}