import { ethers } from "ethers";
import RarityCost from "./rarity-cost.js";
import RarityChance from "./rarity-chance.js";
import RarityMaxIndex from "./rarity-maxindex.js";

export default async function (index) {
    try {
        console.log("--This function maybe not precise for some community ntf's--");
        const cost = ethers.formatEther(await RarityCost(index));
        const maxIndex = await RarityMaxIndex();

        console.log(`--RARITY ${index} ANALYZE--`);
        console.log(`PTE Cost: ${cost}`);
        const chance = Number(await RarityChance(index));
        const indexChances = [];
        for (let i = 0; i <= maxIndex; i++) {
            const probability = chance / 1000;
            const rarityChance = (Math.pow(probability, i) * 100);

            console.log(`Rarity: ${i} chance: ${Number(rarityChance.toPrecision(10))}%`);
            indexChances.push(rarityChance);
        }

        return {
            "cost": cost,
            "rarities": indexChances,
        }
    } catch (error) {
        console.error("[PTE] ERROR: cannot analyze the rarity index, reason: ");
        console.error(error);
        return null;
    }
}