pragma solidity ^0.5.15;

interface IValid {
    function validateTx(
        bytes32 txid,
        bytes calldata rawtx,
        bytes20 output,
        uint256 amount
    ) external view returns(bool);
}