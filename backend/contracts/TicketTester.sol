// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "./Ticket.sol";

contract TicketTester is Ticket {
    function exposedIncreaseBalance(address account, uint128 amount) public {
        _increaseBalance(account, amount);
    }
}