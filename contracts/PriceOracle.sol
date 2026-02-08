// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { TestFtsoV2Interface } from "@flarenetwork/flare-periphery-contracts/coston2/TestFtsoV2Interface.sol";
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";

/**
 * @title PriceOracle
 * @notice Contract that provides BTC and XRP prices from FTSO
 * @dev Used by the Market Analyst agent to get latest prices
 */
contract PriceOracle {
    // Feed IDs for BTC/USD and XRP/USD
    bytes21 public constant BTC_USD_ID = 0x014254432f55534400000000000000000000000000; // "BTC/USD"
    bytes21 public constant XRP_USD_ID = 0x015852502f55534400000000000000000000000000; // "XRP/USD"

    /**
     * @notice Gets the latest BTC and XRP prices from FTSO
     * @return btcPrice The BTC/USD price (in wei, 18 decimals)
     * @return xrpPrice The XRP/USD price (in wei, 18 decimals)
     * @return btcTimestamp The timestamp of the BTC price
     * @return xrpTimestamp The timestamp of the XRP price
     */
    function getLatestPrices()
        external
        view
        returns (uint256 btcPrice, uint256 xrpPrice, uint64 btcTimestamp, uint64 xrpTimestamp)
    {
        /* THIS IS A TEST METHOD, in production use: ftsoV2 = ContractRegistry.getFtsoV2(); */
        TestFtsoV2Interface ftsoV2 = ContractRegistry.getTestFtsoV2();

        // Get BTC price in wei (18 decimals)
        (btcPrice, btcTimestamp) = ftsoV2.getFeedByIdInWei(BTC_USD_ID);

        // Get XRP price in wei (18 decimals)
        (xrpPrice, xrpTimestamp) = ftsoV2.getFeedByIdInWei(XRP_USD_ID);
    }

    /**
     * @notice Gets the latest BTC price from FTSO
     * @return price The BTC/USD price (in wei, 18 decimals)
     * @return timestamp The timestamp of the price
     */
    function getBTCPrice() external view returns (uint256 price, uint64 timestamp) {
        TestFtsoV2Interface ftsoV2 = ContractRegistry.getTestFtsoV2();
        (price, timestamp) = ftsoV2.getFeedByIdInWei(BTC_USD_ID);
    }

    /**
     * @notice Gets the latest XRP price from FTSO
     * @return price The XRP/USD price (in wei, 18 decimals)
     * @return timestamp The timestamp of the price
     */
    function getXRPPrice() external view returns (uint256 price, uint64 timestamp) {
        TestFtsoV2Interface ftsoV2 = ContractRegistry.getTestFtsoV2();
        (price, timestamp) = ftsoV2.getFeedByIdInWei(XRP_USD_ID);
    }
}

