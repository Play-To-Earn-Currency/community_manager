import { ethers } from "ethers";
import Configs from "./configs-loader.js";

const defaultConfigs = Configs();

export default async function (action, parameters, additionalConfigs = {}) {
    const configs = { ...defaultConfigs, ...additionalConfigs };

    const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);

    const contractAddress = configs["contract_address"];
    const abi = configs["contract_abi"];
    const wallet = new ethers.Wallet(configs["wallet_private_key"], provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);;

    try {
        let gasEstimate;
        switch (action) {
            case "mintNFT":
                gasEstimate = await contract.mintNFT.estimateGas(parameters[0]);
                break;
            case "burnNFT":
                gasEstimate = await contract.burnNFT.estimateGas(parameters[0]);
                break;
            case "increaseTokenCount":
                gasEstimate = await contract.increaseTokenCount.estimateGas(parameters[0]);
                break;
            case "increaseRarityCount":
                gasEstimate = await contract.increaseRarityCount.estimateGas(parameters[0], parameters[1]);
                break;
            default: return -1;
        }

        return gasEstimate;
    } catch (error) {
        console.error("[COMMUNITY NFT GAS] ERROR: Cannot receive gas estimation, reason: ");
        console.error(error);
        return -1
    }
}