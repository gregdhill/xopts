import optionPoolArtifact from "../artifacts/OptionPool.json"
import erc20Artifact from "../artifacts/IERC20.json"
import optionSellableArtifact from "../artifacts/IERC20Sellable.json"
import optionBuyableArtifact from "../artifacts/IERC20Buyable.json"
import { ethers } from 'ethers';

const DEFAULT_CONFIRMATIONS = 1;

export class Contracts {

    constructor(signer) {
        this.signer = signer;

        let optionPoolAddress = "0x3E99d12ACe8f4323DCf0f61713788D2d3649b599";
        let erc20Address = "0x151eA753f0aF1634B90e1658054C247eFF1C2464";

        // let network = await provider.getNetwork();
        // if (network.name === "ropsten") {
        //   optionPoolAddress = "0x2900a6b10d83C4Be83CBd80784a34D8ba4A1D99D";
        //   erc20Address = "0x117054F477B40128A290a0d48Eb8aF6e12F333ce";
        // }

        this.optionPoolContract = new ethers.Contract(optionPoolAddress, optionPoolArtifact.abi, signer);
        this.erc20Contract = new ethers.Contract(erc20Address, erc20Artifact.abi, signer);
    }

    getOptions() {
        return this.optionPoolContract.getOptions();
    }

    getUserPurchasedOptions(address) {
        return this.optionPoolContract.getUserPurchasedOptions(address);
    }

    getUserSoldOptions(address) {
        return this.optionPoolContract.getUserSoldOptions(address);
    }

    async checkAllowance() {
        let address = await this.signer.getAddress();
        let allowance = await this.erc20Contract.allowance(address, this.optionPoolContract.address);

        // let tx = await erc20Contract.approve(optionPoolContract.address, ethers.constants.MaxUint256);
        // await tx.wait(1);
    }

    attachOption(address) {
        return new Option(this.signer, address);
    }

    async insureOption(address, seller, amount) {
        let tx = await this.optionPoolContract.insureOption(address, seller, amount);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async underwriteOption(address, amount, btcAddress) {
        btcAddress = ethers.utils.toUtf8Bytes(btcAddress);
        let tx = await this.optionPoolContract.underwriteOption(address, amount.toString(), btcAddress);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async exerciseOption(address, seller, height, index, txid, proof, rawtx) {
        let tx = await this.optionPoolContract.exerciseOption(address, seller, height, index, txid, proof, rawtx);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

    async refundOption(address) {
        let tx = await this.optionPoolContract.refundOption(address);
        await tx.wait(DEFAULT_CONFIRMATIONS);
    }

}

export class Option {
    constructor(signer, address) {  
        this.address = address;
        this.signer = signer;
        this.sellable = new ethers.Contract(address, optionSellableArtifact.abi, signer);
    }

    getDetails() {
        return this.sellable.getDetails();
    }

    getOptionSellers() {
        return this.sellable.getOptionSellers();
    }

    async getOptionOwnersFor(address) {
        let buyableAddress = await this.sellable.getBuyable();
        let buyable = new ethers.Contract(buyableAddress, optionBuyableArtifact.abi, this.signer);
        return buyable.getOptionOwnersFor(address);
    }
}