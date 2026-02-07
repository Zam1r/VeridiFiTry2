// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GreenReward
 * @notice Contract for distributing gasless USDT rewards via Plasma Paymaster
 * @dev Uses Plasma's Protocol-Level Paymaster for zero-fee transactions
 */
contract GreenReward is Ownable {
    /// @notice USDT token address on Plasma testnet
    IERC20 public immutable usdtToken;
    
    /// @notice Mapping to track reward distributions
    mapping(address => uint256) public rewardsDistributed;
    
    /// @notice Total rewards distributed
    uint256 public totalRewardsDistributed;
    
    /// @notice Events
    event GreenRewardSent(
        address indexed recipient,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    
    event RewardsWithdrawn(address indexed owner, uint256 amount);
    
    /**
     * @notice Constructor
     * @param _usdtTokenAddress Address of USDT token on Plasma testnet
     */
    constructor(address _usdtTokenAddress) Ownable(msg.sender) {
        require(_usdtTokenAddress != address(0), "Invalid USDT address");
        usdtToken = IERC20(_usdtTokenAddress);
    }
    
    /**
     * @notice Send green reward to recipient (gasless via Plasma Paymaster)
     * @param recipient Address to receive the reward
     * @param amount Amount of USDT to send (in token decimals, typically 6 for USDT)
     * @param reason Reason for the reward (e.g., "EXECUTE_BUY - Green Energy Verified")
     * @dev This function is called by the Settlement Agent when EXECUTE_BUY signal is received
     *      Gas fees are covered by Plasma's Protocol-Level Paymaster
     */
    function sendGreenReward(
        address recipient,
        uint256 amount,
        string memory reason
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(
            usdtToken.balanceOf(address(this)) >= amount,
            "Insufficient USDT balance"
        );
        
        // Transfer USDT to recipient
        // Gas fees are covered by Plasma Paymaster, so recipient pays $0
        bool success = usdtToken.transfer(recipient, amount);
        require(success, "USDT transfer failed");
        
        // Update tracking
        rewardsDistributed[recipient] += amount;
        totalRewardsDistributed += amount;
        
        emit GreenRewardSent(recipient, amount, reason, block.timestamp);
    }
    
    /**
     * @notice Batch send rewards to multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts (must match recipients length)
     * @param reason Reason for the rewards
     */
    function sendBatchRewards(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string memory reason
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Amount must be greater than 0");
            
            bool success = usdtToken.transfer(recipients[i], amounts[i]);
            require(success, "USDT transfer failed");
            
            rewardsDistributed[recipients[i]] += amounts[i];
            totalRewardsDistributed += amounts[i];
            
            emit GreenRewardSent(recipients[i], amounts[i], reason, block.timestamp);
        }
    }
    
    /**
     * @notice Withdraw USDT from contract (owner only)
     * @param amount Amount to withdraw
     */
    function withdrawRewards(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(
            usdtToken.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        
        bool success = usdtToken.transfer(owner(), amount);
        require(success, "Withdrawal failed");
        
        emit RewardsWithdrawn(owner(), amount);
    }
    
    /**
     * @notice Get contract USDT balance
     * @return Current USDT balance of the contract
     */
    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get total rewards sent to a specific address
     * @param recipient Address to check
     * @return Total rewards sent to this address
     */
    function getRewardsForAddress(address recipient) external view returns (uint256) {
        return rewardsDistributed[recipient];
    }
}

