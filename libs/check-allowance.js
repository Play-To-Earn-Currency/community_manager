import { ethers } from "ethers";
import Configs from "./configs-loader.js";
const defaultConfigs = Configs();

export default async function (walletAddress, additionalConfigs = {}) {
    const configs = { ...defaultConfigs, ...additionalConfigs };
    
    try {
        const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);
        const contractAddress = configs["contract_address"];
        const abi = configs["contract_abi"];
        const wallet = new ethers.Wallet(configs["wallet_private_key"], provider);
        const contract = new ethers.Contract(contractAddress, abi, wallet);

        const allowance = await contract.getAllowance.call(walletAddress);

        return allowance;
    } catch (error) {
        console.error("[PTE] ERROR: cannot check the allowance, reason: ");
        console.error(error);
        return null;
    }
}