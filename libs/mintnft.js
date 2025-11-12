import { ethers } from "ethers";
import EstimateGasPTENFT from "./estimate-gas-communitynft.js"
import Configs from "./configs-loader.js";
import RarityCost from "./rarity-cost.js"
import ApprovePTE from "./pte_manager/libs/pte-approve.js"
const defaultConfigs = Configs();

async function mintNFT(cost, rarity, ignoreApprove = false, additionalConfigs = {}) {
    const configs = { ...defaultConfigs, ...additionalConfigs };

    try {
        const contractAddress = configs["contract_address"];

        if (!ignoreApprove) {
            console.log("[COMMUNITY NFT] Requesting approval from PTE...");
            if (!await ApprovePTE(contractAddress, cost)) return false;
        }

        console.log("[COMMUNITY NFT] Generating gas...");
        let estimatedGas = await EstimateGasPTENFT("mintNFT", rarity, additionalConfigs);
        if (estimatedGas == -1) return false;

        console.log("[COMMUNITY NFT] Estimated gas: " + estimatedGas + ", running mintNFT action...");

        const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);
        const abi = configs["contract_abi"];
        const wallet = new ethers.Wallet(configs["wallet_private_key"], provider);
        const contract = new ethers.Contract(contractAddress, abi, wallet);;

        const privateKey = configs["wallet_private_key"];
        const gasLimit = parseInt(configs["max_gas_per_transaction"]);
        const baseFee = Number((await provider.getBlock("pending")).baseFeePerGas);
        let maxPriorityFeePerGas;
        if (Number(configs["division_fee_gas_per_transaction"]) > 0) {
            const feeDivision = Number(configs["division_fee_gas_per_transaction"]);
            const maxGas = Number((await provider.getFeeData()).maxPriorityFeePerGas);

            maxPriorityFeePerGas = maxGas / feeDivision;
        }
        else maxPriorityFeePerGas = Number((await provider.getFeeData()).maxPriorityFeePerGas);
        let maxFeePerGas = maxPriorityFeePerGas + baseFee - 1;

        maxPriorityFeePerGas += parseInt(configs["additional_fee_gas_per_transaction"]);
        maxFeePerGas += parseInt(configs["additional_fee_gas_per_transaction"]);

        console.log("[COMMUNITY NFT] Base Fee: " + baseFee / 1e18);
        console.log("[COMMUNITY NFT] Minimum: " + maxPriorityFeePerGas / 1e18);
        console.log("[COMMUNITY NFT] Max Gas: " + maxFeePerGas / 1e18);

        if (maxFeePerGas > gasLimit) {
            console.error("[COMMUNITY NFT] Canceling transaction, the gas limit has reached");
            console.error("[COMMUNITY NFT] Limit: " + gasLimit + ", Total Estimated: " + maxFeePerGas);
            return false;
        }

        const tx = await contract.mintNFT.populateTransaction(rarity);
        tx.gasLimit = estimatedGas;
        tx.maxFeePerGas = maxFeePerGas;
        tx.maxPriorityFeePerGas = maxPriorityFeePerGas;

        const signer = new ethers.Wallet(privateKey, provider);
        const txResponse = await signer.sendTransaction(tx);
        const receipt = await txResponse.wait();
        console.log("[COMMUNITY NFT] Transaction Success: " + receipt.hash);

        const nftId = ethers.AbiCoder.defaultAbiCoder().decode(
            ["uint256"],
            ethers.dataSlice(txResponse.data, 4)
        )[0].toString();

        console.log("[COMMUNITY NFT] NFT ID: " + nftId);
        return true;
    } catch (error) {
        console.error("[COMMUNITY NFT] ERROR: cannot make the transaction, reason: ");
        console.error(error);
        return false;
    }
}

export default async function (rarity, readline, ignoreApprove = false, additionalConfigs = {}) {
    const configs = { ...defaultConfigs, ...additionalConfigs };

    return new Promise(async (resolve, _) => {
        try {
            const cost = await RarityCost(rarity, additionalConfigs);
            console.log(`The cost to mint is: ${ethers.formatEther(cost)} PTE.`);

            if (readline != undefined) {
                readline.question("Are you sure? (yes/no/noapprove): ", async (answer) => {
                    if (answer.toLowerCase() == "yes") await mintNFT(cost, rarity, additionalConfigs);
                    else if (answer.toLowerCase() == "noapprove") await mintNFT(cost, rarity, true, additionalConfigs);
                    else console.log("Operation cancelled");
                    resolve();
                });
            }
            else await mintNFT(cost, rarity, ignoreApprove, additionalConfigs);
        } catch (error) {
            console.log("[COMMUNITY NFT] ERROR: cannot make the transaction, reason: ");
            console.log(error);
            resolve();
        }
    });
}