// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {LpToken} from "./Lp.sol";
import "./Math.sol";

contract AmmSwap {
    using Math for uint256;
    ERC20 public token0;
    ERC20 public token1;
    LpToken public lpToken;
    uint256 reserve0;
    uint256 reserve1;

    mapping(address => uint256) public lpTokens;

    event MintLpTokens(address indexed user, uint256 amount, uint256 timestamp);

    constructor(address _token0, address _token1, address _lpToken, uint256 _amount0, uint256 _amount1, address _creator) {
        token0 = ERC20(_token0);
        token1 = ERC20(_token1);
        //1/337.95
        console.log(_amount0);
        console.log(_amount1);
        lpToken = LpToken(_lpToken);
        uint256 initialLpTokens = Math._sqrt(_amount0 * _amount1);

        ERC20(_token0).transferFrom(_creator, address(this), _amount0);
        console.log("it", initialLpTokens);
        token1.transferFrom(_creator, address(this), _amount1);
        lpToken.mint(_creator, initialLpTokens);
        _updateReserves(token0.balanceOf(address(this)), token1.balanceOf(address(this)));
        emit MintLpTokens(_creator, initialLpTokens, block.timestamp);
    }

    function addLiquidity(ERC20 _token0, ERC20 _token1, uint256 _amount0, uint256 _amount1) external {
        _addLiquidity(_token0, _token1, _amount0, _amount1);
    }

    function _addLiquidity(ERC20 _token0, ERC20 _token1, uint256 _amount0, uint256 _amount1) internal {
        require(_token0 == token0 && _token1 == token1, "not correct tokens");
        require(_amount0 > 0 && _amount1 > 0, "zero amounts");
        _token0.transferFrom(msg.sender, address(this), _amount0);
        _token1.transferFrom(msg.sender, address(this), _amount1);
        if (reserve0 > 0 || reserve1 > 0) {
            require(_amount0 * reserve1 == _amount1 * reserve0, "not correct amounts ratio");
        }
        uint256 lpTokens;
        if (lpToken.totalSupply() > 0) {
            lpTokens = Math._sqrt(_amount0 * _amount1);
        } else {
            lpTokens = Math._min(
                (_amount0 * lpToken.totalSupply()) / reserve0,
                (_amount1 * lpToken.totalSupply()) / reserve1
            );
        }
        require(lpTokens > 0, "zero lpToekns to mint");
        lpToken.mint(msg.sender, lpTokens);
        _updateReserves(token0.balanceOf(address(this)), token1.balanceOf(address(this)));
        emit MintLpTokens(msg.sender, lpTokens, block.timestamp);
    }

    function _updateReserves(uint256 _reserve0, uint256 _reserve1) internal {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
    }

    function getReservesBalances() external view returns (uint256 snx, uint256 akro) {
        snx = token0.balanceOf(address(this));
        akro = token1.balanceOf(address(this));
    }

}
