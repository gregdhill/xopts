import { ethers } from "@nomiclabs/buidler";
import { ChainId, Token, TokenAmount, Pair } from "@uniswap/sdk";
import { CollateralFactory } from "../typechain/CollateralFactory";
import {
	MockCollateral, MockRelay, MockTxValidator,
	MockRegistryAndResolver, OptionPool, call, attachOption,
} from "./contracts";

let btcAddress = "0x66c7060feb882664ae62ffad0051fe843e318e85";

async function main() {
	let signers = await ethers.signers();

	let alice = signers[0];
	let bob = signers[1];
	let aliceAddress = await alice.getAddress();
	let bobAddress = await bob.getAddress();

	let charlie = signers[3];
	let david = signers[4];
    let eve = signers[5]
	let charlieAddress = await charlie.getAddress();
	let davidAddress = await david.getAddress();
    let eveAddress = await eve.getAddress();

	const collateral = await MockCollateral(alice);
	const relay = await MockRelay(alice);
	const validator = await MockTxValidator(alice);
	const registry = await MockRegistryAndResolver(alice);

	let pool = await OptionPool(alice, collateral.address, relay.address, validator.address, registry.address);

	await pool.createOption(1000, 1, 1);
	await pool.createOption(500, 2, 3);

	let options = await pool.getOptions();
	let optionAddress = options[0];

	await call(collateral, CollateralFactory, alice).mint(aliceAddress, 10000);
	await call(collateral, CollateralFactory, alice).mint(bobAddress, 10000);

	await call(collateral, CollateralFactory, bob).approve(optionAddress, 100);
	await attachOption(bob, optionAddress).underwrite(100, btcAddress);

    // Uniswap
    // get the tokens
    const collateral_token = new Token(31337, collateral.address, 18, 'DAI', 'Dai');
    const option_token = new Token(31337, optionAddress, 18, 'putBTC', 'BTC_put_option');

    // get tokens for Charlie and David
	await call(collateral, CollateralFactory, alice).mint(charlieAddress, 10000);
	await call(collateral, CollateralFactory, alice).mint(davidAddress, 10000);

    // David underwrites for Charlie
	await call(collateral, CollateralFactory, david).approve(optionAddress, 100);
	await attachOption(david, optionAddress).underwrite(100, btcAddress);

    // Charlie buys the options
    // await
    // const DAI_putBTC = new Pair(
    //     new TokenAmount(collateral_token, '
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});