require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
require("hardhat-gas-reporter");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.23",
    networks: {
        forking: {
            enable: true,
            url: "https://mainnet.infura.io/v3/3f0fc918d3e34b1790f3c710abb5f3f3"
        }
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    gasReporter: {
        enabled: true,
        coinmarketcap: process.env.MARKETCAP,
        noColors: true,
        currency: "USD",
        outputFile: "gas.txt"
    }
};
