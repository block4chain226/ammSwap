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
    event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp);
    event RemoveLiquidity(address indexed user, uint256 lpTokensAmount, uint256 timestamp);
    constructor(address _token0, address _token1, address _lpToken, uint256 _amount0, uint256 _amount1, address _creator) {
        token0 = ERC20(_token0);
        token1 = ERC20(_token1);
        lpToken = LpToken(_lpToken);
        uint256 initialLpTokens = Math._sqrt(_amount0 * _amount1);
        ERC20(_token0).transferFrom(_creator, address(this), _amount0);
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

    function removeLiquidity(uint256 _lpTokens) external {
        require(_lpTokens > 0, "zero lp tokens");
        require(lpToken.balanceOf(msg.sender) >= _lpTokens, "user has not enough lp tokens");
        uint256 token0Amount = (_lpTokens * reserve0) / lpToken.totalSupply();
        uint256 token1Amount = (_lpTokens * reserve1) / lpToken.totalSupply();
        require(token0Amount > 0 && token1Amount > 0, "token amounts 0");
        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));
        require(bal0 >= token0Amount && bal1 >= token1Amount, "not enough reserve balances");
        _updateReserves(bal0 - token0Amount, bal1 - token1Amount);
        lpToken.burn(msg.sender, _lpTokens);
        token0.transfer(msg.sender, token0Amount);
        token1.transfer(msg.sender, token1Amount);
        emit RemoveLiquidity(msg.sender, _lpTokens, block.timestamp);
    }

    function swap(ERC20 _tokenIn, uint256 _amountIn) external {
        require(_amountIn > 0, "amountIn cann't be 0");
        require(_tokenIn == token0 || _tokenIn == token1, "tokenIn is not right");
        bool isToken0 = _tokenIn == token0;
        (ERC20 tokenIn, ERC20 tokenOut, uint256 reserveIn, uint256 reserveOut) = isToken0 ?
            (token0, token1, reserve0, reserve1) :
            (token1, token0, reserve1, reserve0);
        tokenIn.transferFrom(msg.sender, address(this), _amountIn);
        uint256 amountInWithFee = (_amountIn * 997) / 10000;
        uint256 amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
        require(amountOut <= ERC20(tokenOut).balanceOf(address(this)), "not enough tokenOut balance");
        tokenOut.transfer(msg.sender, amountOut);
        _updateReserves(token0.balanceOf(address(this)), token1.balanceOf(address(this)));
        emit Swap(msg.sender, address(tokenIn), address(tokenOut), _amountIn, amountOut, block.timestamp);
    }

    function _updateReserves(uint256 _reserve0, uint256 _reserve1) internal {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
    }

    function getReservesBalances() external view returns (uint256 reserve0, uint256 reserve1) {
        reserve0 = token0.balanceOf(address(this));
        reserve1 = token1.balanceOf(address(this));
    }

}
