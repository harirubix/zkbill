/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from "config";
import utils from "zkp-utils";
import GN from "general-number";
import fs from "fs";

import {
	getContractInstance,
	getContractAddress,
	registerKey,
} from "./common/contract.mjs";
import {
	storeCommitment,
	getCurrentWholeCommitment,
	getCommitmentsById,
	getAllCommitments,
	getInputCommitments,
	joinCommitments,
	markNullified,
} from "./common/commitment-storage.mjs";
import { generateProof } from "./common/zokrates.mjs";
import { getMembershipWitness, getRoot } from "./common/timber.mjs";
import Web3 from "./common/web3.mjs";
import {
	decompressStarlightKey,
	poseidonHash,
} from "./common/number-theory.mjs";

const { generalise } = GN;
const db = "/app/orchestration/common/db/preimage.json";
const web3 = Web3.connection();
const keyDb = "/app/orchestration/common/db/key.json";

export default async function add(
	_myrct,
	_amount,
	_balances_msgSender_newOwnerPublicKey = 0,
	_unpaid_msgSender_newOwnerPublicKey = 0
) {
	// Initialisation of variables:

	const instance = await getContractInstance("ReceiptShield");

	const contractAddr = await getContractAddress("ReceiptShield");

	const msgValue = 0;
	const myrct = generalise(_myrct);
	const amount = generalise(_amount);
	let balances_msgSender_newOwnerPublicKey = generalise(
		_balances_msgSender_newOwnerPublicKey
	);
	let unpaid_msgSender_newOwnerPublicKey = generalise(
		_unpaid_msgSender_newOwnerPublicKey
	);

	// Read dbs for keys and previous commitment values:

	if (!fs.existsSync(keyDb))
		await registerKey(utils.randomHex(31), "ReceiptShield", false);
	const keys = JSON.parse(
		fs.readFileSync(keyDb, "utf-8", (err) => {
			console.log(err);
		})
	);
	const secretKey = generalise(keys.secretKey);
	const publicKey = generalise(keys.publicKey);

	// Initialise commitment preimage of whole state:

	let balances_msgSender_stateVarId = 5;

	const balances_msgSender_stateVarId_key = generalise(
		config.web3.options.defaultAccount
	); // emulates msg.sender

	balances_msgSender_stateVarId = generalise(
		utils.mimcHash(
			[
				generalise(balances_msgSender_stateVarId).bigInt,
				balances_msgSender_stateVarId_key.bigInt,
			],
			"ALT_BN_254"
		)
	).hex(32);

	let balances_msgSender_commitmentExists = true;
	let balances_msgSender_witnessRequired = true;

	const balances_msgSender_commitment = await getCurrentWholeCommitment(
		balances_msgSender_stateVarId
	);

	let balances_msgSender_preimage = {
		value: 0,
		salt: 0,
		commitment: 0,
	};
	if (!balances_msgSender_commitment) {
		balances_msgSender_commitmentExists = false;
		balances_msgSender_witnessRequired = false;
	} else {
		balances_msgSender_preimage = balances_msgSender_commitment.preimage;
	}

	// Initialise commitment preimage of whole state:

	let unpaid_msgSender_stateVarId = 10;

	const unpaid_msgSender_stateVarId_key = generalise(
		config.web3.options.defaultAccount
	); // emulates msg.sender

	unpaid_msgSender_stateVarId = generalise(
		utils.mimcHash(
			[
				generalise(unpaid_msgSender_stateVarId).bigInt,
				unpaid_msgSender_stateVarId_key.bigInt,
			],
			"ALT_BN_254"
		)
	).hex(32);

	let unpaid_msgSender_commitmentExists = true;
	let unpaid_msgSender_witnessRequired = true;

	const unpaid_msgSender_commitment = await getCurrentWholeCommitment(
		unpaid_msgSender_stateVarId
	);

	let unpaid_msgSender_preimage = {
		value: { amount: 0, tax: 0, amountPaid: 0 },
		salt: 0,
		commitment: 0,
	};
	if (!unpaid_msgSender_commitment) {
		unpaid_msgSender_commitmentExists = false;
		unpaid_msgSender_witnessRequired = false;
	} else {
		unpaid_msgSender_preimage = unpaid_msgSender_commitment.preimage;
	}

	// read preimage for whole state
	balances_msgSender_newOwnerPublicKey =
		_balances_msgSender_newOwnerPublicKey === 0
			? publicKey
			: balances_msgSender_newOwnerPublicKey;

	const balances_msgSender_currentCommitment = balances_msgSender_commitmentExists
		? generalise(balances_msgSender_commitment._id)
		: generalise(0);
	const balances_msgSender_prev = generalise(balances_msgSender_preimage.value);
	const balances_msgSender_prevSalt = generalise(
		balances_msgSender_preimage.salt
	);

	// read preimage for whole state
	unpaid_msgSender_newOwnerPublicKey =
		_unpaid_msgSender_newOwnerPublicKey === 0
			? publicKey
			: unpaid_msgSender_newOwnerPublicKey;

	const unpaid_msgSender_currentCommitment = unpaid_msgSender_commitmentExists
		? generalise(unpaid_msgSender_commitment._id)
		: generalise(0);
	const unpaid_msgSender_prev = generalise(unpaid_msgSender_preimage.value);
	const unpaid_msgSender_prevSalt = generalise(unpaid_msgSender_preimage.salt);

	// Extract set membership witness:

	// generate witness for whole state
	const balances_msgSender_emptyPath = new Array(32).fill(0);
	const balances_msgSender_witness = balances_msgSender_witnessRequired
		? await getMembershipWitness(
				"ReceiptShield",
				balances_msgSender_currentCommitment.integer
		  )
		: {
				index: 0,
				path: balances_msgSender_emptyPath,
				root: (await getRoot("ReceiptShield")) || 0,
		  };
	const balances_msgSender_index = generalise(balances_msgSender_witness.index);
	const balances_msgSender_root = generalise(balances_msgSender_witness.root);
	const balances_msgSender_path = generalise(balances_msgSender_witness.path)
		.all;

	// generate witness for whole state
	const unpaid_msgSender_emptyPath = new Array(32).fill(0);
	const unpaid_msgSender_witness = unpaid_msgSender_witnessRequired
		? await getMembershipWitness(
				"ReceiptShield",
				unpaid_msgSender_currentCommitment.integer
		  )
		: {
				index: 0,
				path: unpaid_msgSender_emptyPath,
				root: (await getRoot("ReceiptShield")) || 0,
		  };
	const unpaid_msgSender_index = generalise(unpaid_msgSender_witness.index);
	const unpaid_msgSender_root = generalise(unpaid_msgSender_witness.root);
	const unpaid_msgSender_path = generalise(unpaid_msgSender_witness.path).all;

	let unpaid_msgSender = generalise(unpaid_msgSender_preimage.value);

	let balances_msgSender = generalise(balances_msgSender_preimage.value);

	let total = generalise(
		parseInt(myrct.amount.integer, 10) + parseInt(myrct.tax.integer, 10)
	);

	if (parseInt(amount.integer, 10) >= parseInt(total.integer, 10)) {
		balances_msgSender =
			parseInt(balances_msgSender.integer, 10) +
			parseInt(amount.integer, 10) -
			parseInt(total.integer, 10);
	} else {
		unpaid_msgSender.amount = parseInt(myrct.amount.integer, 10);

		unpaid_msgSender.tax = parseInt(myrct.tax.integer, 10);

		unpaid_msgSender.amountPaid = parseInt(amount.integer, 10);
	}

	balances_msgSender = generalise(balances_msgSender);

	unpaid_msgSender = generalise(unpaid_msgSender);

	unpaid_msgSender = generalise(unpaid_msgSender);

	unpaid_msgSender = generalise(unpaid_msgSender);

	// Calculate nullifier(s):

	let balances_msgSender_nullifier = balances_msgSender_commitmentExists
		? poseidonHash([
				BigInt(balances_msgSender_stateVarId),
				BigInt(secretKey.hex(32)),
				BigInt(balances_msgSender_prevSalt.hex(32)),
		  ])
		: poseidonHash([
				BigInt(balances_msgSender_stateVarId),
				BigInt(generalise(0).hex(32)),
				BigInt(balances_msgSender_prevSalt.hex(32)),
		  ]);

	balances_msgSender_nullifier = generalise(
		balances_msgSender_nullifier.hex(32)
	); // truncate
	let unpaid_msgSender_nullifier = unpaid_msgSender_commitmentExists
		? poseidonHash([
				BigInt(unpaid_msgSender_stateVarId),
				BigInt(secretKey.hex(32)),
				BigInt(unpaid_msgSender_prevSalt.hex(32)),
		  ])
		: poseidonHash([
				BigInt(unpaid_msgSender_stateVarId),
				BigInt(generalise(0).hex(32)),
				BigInt(unpaid_msgSender_prevSalt.hex(32)),
		  ]);

	unpaid_msgSender_nullifier = generalise(unpaid_msgSender_nullifier.hex(32)); // truncate

	// Calculate commitment(s):

	const balances_msgSender_newSalt = generalise(utils.randomHex(31));

	let balances_msgSender_newCommitment = poseidonHash([
		BigInt(balances_msgSender_stateVarId),
		BigInt(balances_msgSender.hex(32)),
		BigInt(balances_msgSender_newOwnerPublicKey.hex(32)),
		BigInt(balances_msgSender_newSalt.hex(32)),
	]);

	balances_msgSender_newCommitment = generalise(
		balances_msgSender_newCommitment.hex(32)
	); // truncate

	unpaid_msgSender.amount = unpaid_msgSender.amount
		? unpaid_msgSender.amount
		: unpaid_msgSender_prev.amount;
	unpaid_msgSender.tax = unpaid_msgSender.tax
		? unpaid_msgSender.tax
		: unpaid_msgSender_prev.tax;
	unpaid_msgSender.amountPaid = unpaid_msgSender.amountPaid
		? unpaid_msgSender.amountPaid
		: unpaid_msgSender_prev.amountPaid;

	const unpaid_msgSender_newSalt = generalise(utils.randomHex(31));

	let unpaid_msgSender_newCommitment = poseidonHash([
		BigInt(unpaid_msgSender_stateVarId),
		BigInt(unpaid_msgSender.amount.hex(32)),
		BigInt(unpaid_msgSender.tax.hex(32)),
		BigInt(unpaid_msgSender.amountPaid.hex(32)),
		BigInt(unpaid_msgSender_newOwnerPublicKey.hex(32)),
		BigInt(unpaid_msgSender_newSalt.hex(32)),
	]);

	unpaid_msgSender_newCommitment = generalise(
		unpaid_msgSender_newCommitment.hex(32)
	); // truncate

	// Call Zokrates to generate the proof:

	const allInputs = [
		myrct.amount.integer,
		myrct.tax.integer,
		myrct.amountPaid.integer,
		amount.integer,
		balances_msgSender_stateVarId_key.integer,
		balances_msgSender_commitmentExists
			? secretKey.integer
			: generalise(0).integer,
		balances_msgSender_nullifier.integer,
		balances_msgSender_prev.integer,
		balances_msgSender_prevSalt.integer,
		balances_msgSender_commitmentExists ? 0 : 1,
		balances_msgSender_root.integer,
		balances_msgSender_index.integer,
		balances_msgSender_path.integer,
		balances_msgSender_newOwnerPublicKey.integer,
		balances_msgSender_newSalt.integer,
		balances_msgSender_newCommitment.integer,
		unpaid_msgSender_stateVarId_key.integer,
		unpaid_msgSender_commitmentExists
			? secretKey.integer
			: generalise(0).integer,
		unpaid_msgSender_nullifier.integer,
		unpaid_msgSender_prev.amount.integer,
		unpaid_msgSender_prev.tax.integer,
		unpaid_msgSender_prev.amountPaid.integer,
		unpaid_msgSender_prevSalt.integer,
		unpaid_msgSender_commitmentExists ? 0 : 1,

		unpaid_msgSender_index.integer,
		unpaid_msgSender_path.integer,
		unpaid_msgSender_newOwnerPublicKey.integer,
		unpaid_msgSender_newSalt.integer,
		unpaid_msgSender_newCommitment.integer,
	].flat(Infinity);
	const res = await generateProof("add", allInputs);
	const proof = generalise(Object.values(res.proof).flat(Infinity))
		.map((coeff) => coeff.integer)
		.flat(Infinity);

	// Send transaction to the blockchain:

	const txData = await instance.methods
		.add(
			amount.integer,
			[
				balances_msgSender_nullifier.integer,
				unpaid_msgSender_nullifier.integer,
			],
			balances_msgSender_root.integer,
			[
				balances_msgSender_newCommitment.integer,
				unpaid_msgSender_newCommitment.integer,
			],
			proof
		)
		.encodeABI();

	let txParams = {
		from: config.web3.options.defaultAccount,
		to: contractAddr,
		gas: config.web3.options.defaultGas,
		gasPrice: config.web3.options.defaultGasPrice,
		data: txData,
		chainId: await web3.eth.net.getId(),
	};

	const key = config.web3.key;

	const signed = await web3.eth.accounts.signTransaction(txParams, key);

	const sendTxn = await web3.eth.sendSignedTransaction(signed.rawTransaction);

	let tx = await instance.getPastEvents("NewLeaves");

	tx = tx[0];

	let encEvent = "";

	try {
		encEvent = await instance.getPastEvents("EncryptedData");
	} catch (err) {
		console.log("No encrypted event");
	}

	// Write new commitment preimage to db:

	if (balances_msgSender_commitmentExists)
		await markNullified(
			balances_msgSender_currentCommitment,
			secretKey.hex(32)
		);

	await storeCommitment({
		hash: balances_msgSender_newCommitment,
		name: "balances",
		mappingKey: balances_msgSender_stateVarId_key.integer,
		preimage: {
			stateVarId: generalise(balances_msgSender_stateVarId),
			value: balances_msgSender,
			salt: balances_msgSender_newSalt,
			publicKey: balances_msgSender_newOwnerPublicKey,
		},
		secretKey:
			balances_msgSender_newOwnerPublicKey.integer === publicKey.integer
				? secretKey
				: null,
		isNullified: false,
	});

	if (unpaid_msgSender_commitmentExists)
		await markNullified(unpaid_msgSender_currentCommitment, secretKey.hex(32));

	await storeCommitment({
		hash: unpaid_msgSender_newCommitment,
		name: "unpaid",
		mappingKey: unpaid_msgSender_stateVarId_key.integer,
		preimage: {
			stateVarId: generalise(unpaid_msgSender_stateVarId),
			value: {
				amount: unpaid_msgSender.amount,
				tax: unpaid_msgSender.tax,
				amountPaid: unpaid_msgSender.amountPaid,
			},
			salt: unpaid_msgSender_newSalt,
			publicKey: unpaid_msgSender_newOwnerPublicKey,
		},
		secretKey:
			unpaid_msgSender_newOwnerPublicKey.integer === publicKey.integer
				? secretKey
				: null,
		isNullified: false,
	});

	return { tx, encEvent };
}
