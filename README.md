# PTE Community Manager
A utility tool for managing play to earn community NFT's

To use this utility you need to install nodejs in your machine, after that clone this repository and open the terminal inside the repository.
Type ``npm install`` to install the necessary dependencies.

Now add the community nft in ``configs.txt`` and use ``node init.js`` to start the utility.

The values inside the configs.txt are measured in wei so: ``1000000000000000000`` equals ``1`` PTE, or POL depending on the context

### Commands
- allowance: show the allowance from provided addreess with the contract
- mintnft: generate a nft from the community contract, receives the nft rarity as parameter
- availableTokens: shows the available tokens for that specific rarity
- increasetokencount: increase the token quantity for that specific rarity (Administrator only)
- increaseraritycount: increase the rarity quantity (Administrator only)
- raritycost: check the cost for minting the nft in that rarity index
- raritychance: check the chances for getting higher rarity nft in that rarity index
- raritymaxindex: check the max rarity you can earn
- rarityanalyze: makes any analyze for the provided rarity index

### Configurations
- contract_addres: address contract from the community nft
- contract_abi: abi from the community nft
- pte_contract_address: pte address contract
- pte_contract_abi: abi from pte
- rpc_address: the rpc connection that will handle your requests to the block chain
- wallet_private_key: your PRIVATE KEY from your wallet, used for transactions, very secret be careful and do not share
- max_gas_per_transaction: the max gas limit for transactions
- additional_fee_gas_per_transaction: additional gas per transaction for speed up the transactions
- maximum_requests_per_queue: amount of requests simultaneously
- skinowner_tokens_database_ip: ip address for database
- skinowner_tokens_database_name: the database name (default pte_wallets)
- skinowner_tokens_database_username: username for database (default pte_admin)
- skinowner_tokens_database_password: user password for database (no default, please change it)
- skinowner_tokens_database_tables: created tables for verify skins