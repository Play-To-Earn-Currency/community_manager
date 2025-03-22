import { ethers } from "ethers";
import EstimateGasPTENFT from "./estimate-gas-communitynft.js"
import Configs from "./configs-loader.js";
const configs = Configs();

export default async function (rarity) {
    try {
        console.log("[COMMUNITY NFT] Generating gas...");
        let estimatedGas = await EstimateGasPTENFT("increaseTokenCount", [rarity]);
        if (estimatedGas == -1) return false;

        console.log("[COMMUNITY NFT] Estimated gas: " + estimatedGas + ", running increaseTokenCount action...");

        const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);
        const contractAddress = configs["contract_address"];
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

        const tx = await contract.increaseTokenCount.populateTransaction(rarity);
        tx.gasLimit = estimatedGas;
        tx.maxFeePerGas = maxFeePerGas;
        tx.maxPriorityFeePerGas = maxPriorityFeePerGas;

        const signer = new ethers.Wallet(privateKey, provider);
        const txResponse = await signer.sendTransaction(tx);
        const receipt = await txResponse.wait();
        console.log("[COMMUNITY NFT] Transaction Success: " + receipt.hash);
        return true;
    } catch (error) {
        console.error("[COMMUNITY NFT] ERROR: cannot make the transaction, reason: ");
        console.error(error);
        return false;
    }
}