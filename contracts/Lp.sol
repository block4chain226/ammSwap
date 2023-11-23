// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LpToken is ERC20("LpToken", "LP"), Ownable {
    constructor(address _owner) Ownable(_owner) {
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }

    function burn(address _to, uint256 _amount) external {
        _burn(_to, _amount);
    }
}