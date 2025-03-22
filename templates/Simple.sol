// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.26;
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/refs/heads/master/contracts/token/ERC721/ERC721.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/refs/heads/master/contracts/access/Ownable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/refs/heads/master/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./Play_To_Earn_Coin.sol";

contract PlayToEarnSIMPLE is ERC721URIStorage, Ownable {
    PlayToEarnCoin private _playToEarn =
        PlayToEarnCoin(address(0x95A8Aec985030C741BB6281B9dFa6E3F818cee37)); // Official Coin Address

    uint256[] public availableTokens = [1]; // Available tokens to user earn in mint
    uint256[] public rarityCostIndex = [20000000000000000000]; // The cost for rarity
    uint16[] public rarityChanceIndex = [100]; // The chance to receive a better rarity
    uint256 public maxRarityIndex = 0; // The max rarity value to user receive

    uint256 public nextTokenId; // NFT Token ID

    event NFTBurned(address indexed account, uint256 tokenId); // Burn event
    event NFTMinted(address indexed account, uint256 tokenId, uint256 rarity); // NFT Minted

    constructor()
        ERC721("Play To Earn Simple", "PTESIMPLE")
        Ownable(address(0x518Ab58fD7ddcFE5f8Ee02a59472Df3220a1d86F))
    {}

    function getAllowance() external view returns (uint256) {
        return _playToEarn.allowance(msg.sender, address(this));
    }

    function mintNFT(uint256 rarity) external payable returns (uint256) {
        // Check rarity
        require(rarity <= maxRarityIndex, "Invalid rarity number");

        // Getting the nft cost
        uint256 cost = rarityCostIndex[rarity];

        // Allowance check
        uint256 userAllowance = _playToEarn.allowance(
            msg.sender,
            address(this)
        );
        require(
            userAllowance >= cost,
            string(
                abi.encodePacked(
                    "Insufficient allowance, you must approve: ",
                    Strings.toString(cost),
                    ", to ",
                    Strings.toHexString(uint160(address(this)), 20)
                )
            )
        );

        // Check user balance
        uint256 userBalance = _playToEarn.balanceOf(address(msg.sender));
        require(userBalance >= cost, "Not enough Play To Earn");

        // Transfer to the contract
        _playToEarn.transferFrom(msg.sender, address(this), cost);

        // Burning the received coins
        _playToEarn.burnCoin(cost);

        // Generating token
        generateNFT(msg.sender, rarityChanceIndex[rarity]);
        nextTokenId++;
        return nextTokenId - 1;
    }

    function generateNFT(address receiverAddress, uint16 rollChance) internal {
        // Generate rarity
        uint256 rarity = 0;
        for (uint256 i = 0; i < 10; i++) {
            uint256 chance = getRandomNumber(1000);
            if (chance <= rollChance) {
                rarity++;
            }
        }
        // Generate the skin id
        uint256 skinId = getRandomNumber(availableTokens[rarity]);

        // Generate token data
        string memory metadataURI = string(
            abi.encodePacked(
                Strings.toString(rarity),
                "-",
                Strings.toString(skinId)
            )
        );

        // Generating token
        _safeMint(receiverAddress, nextTokenId);
        _setTokenURI(nextTokenId, metadataURI);

        emit NFTMinted(receiverAddress, nextTokenId, rarity);
    }

    function getRandomNumber(uint256 max) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        msg.sender,
                        block.prevrandao
                    )
                )
            ) % max;
    }

    function increaseTokenCount(uint8 rarity) external onlyOwner {
        require(rarity <= maxRarityIndex, "Invalid rarity number");
        availableTokens[rarity]++;
    }

    function increaseRarityCount(uint256 rarityCost, uint16 rarityChance)
        external
        onlyOwner
    {
        availableTokens.push(1);
        rarityCostIndex.push(rarityCost);
        rarityChanceIndex.push(rarityChance);
        maxRarityIndex++;
    }

    function burnNFT(uint256 tokenId) public {
        // Check if the current wallet owns the nft
        require(
            ownerOf(tokenId) == msg.sender,
            "You can only burn your own NFTs"
        );

        // Burning
        _burn(tokenId);

        emit NFTBurned(msg.sender, tokenId);
    }
}