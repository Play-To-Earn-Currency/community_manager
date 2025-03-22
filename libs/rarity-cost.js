import { ethers } from "ethers";
import Configs from "./configs-loader.js";
const configs = Configs();

export default async function (index) {
    try {
        const provider = new ethers.JsonRpcProvider(configs["rpc_address"]);
        const contractAddress = configs["contract_address"];
        const abi = configs["contract_abi"];
        const wallet = new ethers.Wallet(configs["wallet_private_key"], provider);
        const contract = new ethers.Contract(contractAddress, abi, wallet);

        const cost = await contract.rarityCostIndex(index);

        return cost;
    } catch (error) {
        console.error("[PTE] ERROR: cannot check the cost, reason: ");
        console.error(error);
        return null;
    }
}