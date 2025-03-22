import { ethers } from "ethers";
import EstimateGasPTENFT from "./estimate-gas-communitynft.js"
import Configs from "./configs-loader.js";
import GetNftData from "./get-nft-data.js";
import OwnerOf from "./owner-of.js";
const configs = Configs();

async function burnNFT(nftId) {
    try {
        console.log("[COMMUNITY NFT] Generating gas...");
        let estimatedGas = await EstimateGasPTENFT("burnNFT", nftId);
        if (estimatedGas == -1) return false;

        console.log("[COMMUNITY NFT] Estimated gas: " + estimatedGas + ", running burnNFT action...");

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

        const tx = await contract.burnNFT.populateTransaction(nftId);
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

export default async function (nftId, readline) {
    return new Promise(async (resolve, _) => {
        try {
            const ownerAddress = await OwnerOf(nftId);
            if (ownerAddress != new ethers.Wallet(configs["wallet_private_key"]).address) {
                console.log("You are not the owner of this NFT...");
                resolve();
            }

            if (readline != undefined) {
                const nftData = await GetNftData(nftId);
                console.log(`You are about to burn the nft: ${nftData}`);
                readline.question("Are you sure? (yes/no/noapprove): ", async (answer) => {
                    if (answer.toLowerCase() == "yes") await burnNFT(nftId);
                    else console.log("Operation cancelled");
                    resolve();
                });
            }
            else await burnNFT(nftId);
        } catch (error) {
            console.log("[COMMUNITY NFT] ERROR: cannot burn the nft, reason: ");
            console.log(error);
            resolve();
        }
    });
}