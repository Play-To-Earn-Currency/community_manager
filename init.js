import Allowance from './libs/check-allowance.js'
import RarityAnalyze from './libs/rarity-analyze.js';
import RarityChance from './libs/rarity-chance.js';
import RarityCost from './libs/rarity-cost.js';
import RarityMaxindex from './libs/rarity-maxindex.js';
import VerifyPTEManager from './libs/verify-pte-manager.js';
import GetNFTData from './libs/get-nft-data.js';
import OwnerOf from './libs/owner-of.js';
import availableTokens from './libs/avalable-rarity.js';
import IncreaseTokenCount from './libs/increase-token-count.js';
import IncreaseRarityCount from './libs/increase-rarity-count.js';
import readline from 'readline';

const helpText = `
### Commands
- allowance: show the allowance from provided addreess with the contract
- mintnft: generate a nft from the community contract, receives the nft rarity as parameter
- raritycost: check the cost for minting the nft in that rarity index
- raritychance: check the chances for getting higher rarity nft in that rarity index
- raritymaxindex: check the max rarity you can earn
- rarityanalyze: makes any analyze for the provided rarity index
`;

// Interface creation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// PTE Manager dependecy check
await VerifyPTEManager(rl);

// PTE Manager dependencies imports
const { default: MintNFT } = await import('./libs/mintnft.js');

// Terminal welcome
console.log("--PTE Community Manager 1.0--");

// Command proccess
async function processInput(input) {
    const command = input.toLowerCase();

    // Complex Commands
    if (command.startsWith("allowance ")) {
        const [, address] = command.split(" ");
        const allowance = await Allowance(address);
        console.log(`Address allowance: ${allowance}`);
        askForInput();
        return;
    } else if (command.startsWith("mintnft ")) {
        const [, rarity] = command.split(" ");
        await MintNFT(rarity, rl);
        askForInput();
        return;
    } else if (command.startsWith("burnnft ")) {
        const [, nftId] = command.split(" ");
        await BurnNFT(nftId, rl);
        askForInput();
        return;
    } else if (command.startsWith("raritycost ")) {
        const [, rarity] = command.split(" ");
        const cost = await RarityCost(rarity);
        console.log(`Rarity ${rarity} cost: ${cost}`);
        askForInput();
        return;
    } else if (command.startsWith("raritychance ")) {
        const [, rarity] = command.split(" ");
        const cost = await RarityChance(rarity);
        console.log(`Rarity ${rarity} chance: ${cost}`);
        askForInput();
        return;
    } else if (command.startsWith("availableTokens ")) {
        const [, rarity] = command.split(" ");
        const maxIndexs = await availableTokens(rarity);
        console.log(`Max indexes available: ${maxIndexs} for rarity: ${rarity}`);
        askForInput();
        return;
    } else if (command.startsWith("rarityanalyze ")) {
        const [, rarity] = command.split(" ");
        await RarityAnalyze(rarity);
        askForInput();
        return;
    } else if (command.startsWith("nftdata ")) {
        const [, nftId] = command.split(" ");
        const data = await GetNFTData(nftId);
        console.log("NFT Data: " + data);
        askForInput();
        return;
    } else if (command.startsWith("increasetokencount ")) {
        const [, rarity] = command.split(" ");
        await IncreaseTokenCount(rarity);
        askForInput();
        return;
    } else if (command.startsWith("increaseraritycount ")) {
        const [, cost, chance] = command.split(" ");
        await IncreaseRarityCount(cost, chance);
        askForInput();
        return;
    } else if (command.startsWith("ownerof ")) {
        const [, nftId] = command.split(" ");
        const address = await OwnerOf(nftId);
        console.log(`Address owner for ${nftId}: ${address}`);
        askForInput();
        return;
    }

    // Simple Commands
    switch (command) {
        case 'raritymaxindex':
            console.log(`[PTE] Max rarity index: ${await RarityMaxindex()}`);
            break;
        case 'help':
            console.log(helpText);
            break;
        case 'exit':
            rl.close();
            return;
        default:
            console.log(`Unkown command: ${command}, type help to view the command list`);
    }

    askForInput();
}

function askForInput() { rl.question("", processInput); }
askForInput();

rl.on("close", () => {
    console.log("Goodbye.");
    process.exit(0);
});