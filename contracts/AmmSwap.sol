// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AmmSwap {
    ERC20 public token0;
    ERC20 public token1;
    uint256 reserve0;
    uint256 reserve1;

    constructor(ERC20 _token0, ERC20 _token1, uint256 _amount0, uint256 _amount1, address _creator) {
        token0 = _token0;
        token1 = _token1;
        _token0.transferFrom(_creator, address(this), _amount0);
        _token1.transferFrom(_creator, address(this), _amount1);
    }
    function getReservesBalances() external view returns (uint256 snx, uint256 akro) {
        snx = token0.balanceOf(address(this));
        akro = token1.balanceOf(address(this));
    }

}
