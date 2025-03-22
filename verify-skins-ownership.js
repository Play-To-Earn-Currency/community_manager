import Configs from "./configs-loader.js";
import GetNftData from "./libs/get-nft-data.js";
import OwnerOf from "./libs/owner-of.js";
import MySQL from "mysql2";

const configs = Configs();
let requestsRunning = 0;
let quantityToIterate = 0;
let quantityFinished = -1;

const connection = MySQL.createConnection({
    host: configs["skinowner_tokens_database_ip"],
    user: configs["skinowner_tokens_database_username"],
    password: configs["skinowner_tokens_database_password"],
    database: configs["skinowner_tokens_database_name"]
});

connection.connect((err) => {
    if (err) {
        console.error('[SKIN ONWER ERROR] cannot connect to the database: ' + err.stack);
        process.exit(1);
    }
    else {
        console.log('[SKIN ONWER] Conneceted with id: ' + connection.threadId);
        let tables = configs["skinowner_tokens_database_tables"];
        tables.forEach(table => {
            connection.query(
                'SELECT COUNT(*) AS count FROM ??',
                [table],
                async (err, results) => {
                    if (err) {
                        console.error('[SKIN ONWER ERROR] Failed to get database count: ' + err.stack);
                        process.exit(1);
                    }
                    else {
                        quantityToIterate += results[0].count;
                        if (quantityFinished == -1) quantityFinished = 0;
                        iterateDatabaseWithLimit(table, results[0].count);
                    }
                }
            );
        });
    };
});

async function iterateDatabaseWithLimit(table, databaseLength) {
    console.log("[SKIN ONWER] " + databaseLength + " entries in " + table);
    for (let i = 0; i < databaseLength; i++) {
        // Wait a while to check if the request is still running
        while (requestsRunning >= parseInt(configs["maximum_requests_per_queue"]))
            await new Promise(resolve => setTimeout(resolve, 100));

        requestsRunning++;

        connection.query(
            'SELECT * FROM ?? LIMIT 1 OFFSET ?',
            [table, i],
            async (err, userData) => {
                if (err) console.error('[SKIN ONWER ERROR] Failed to get skin data: ' + err.stack);
                else if (userData.length == 0) console.warn('[SKIN ONWER ERROR] No register found for index: ' + i);
                else if (userData[0]["nftid"] == null && userData[0]["skinid"] != null) {
                    console.warn(`[SKIN OWNER ERROR] ${userData[0]["uniqueid"]} have a skin equipped but there is no nft equipped, removing...`);
                    connection.query(
                        'UPDATE ?? SET skinid = null WHERE uniqueid = ?',
                        [table, userData[0]["uniqueid"]],
                        async (err, updatedUser) => {
                            if (err || updatedUser.affectedRows === 0) {
                                console.error('[SKIN ONWER FATAL]');
                                console.error('[SKIN ONWER FATAL]');
                                console.error('[SKIN ONWER ERROR] CANNOT REMOVE SKINID: ' + err.stack);
                                console.error('[SKIN ONWER ERROR] FROM TABLE: ' + table + ", UNIQUEID:" + updatedUser[0]["uniqueid"]);
                                console.error('[SKIN ONWER FATAL]');
                                console.error('[SKIN ONWER FATAL]');
                            }
                        }
                    );
                }
                else if (userData[0]["nftid"] == null) console.warn('[SKIN ONWER] No skin for index: ' + i);
                else {
                    let data = await getSkinData(userData[0]["walletaddress"], userData[0]["nftid"]);
                    if (data != null) {
                        if (data != userData[0]["skinid"]) {
                            console.warn(`[SKIN OWNER ERROR] ${userData[0]["uniqueid"]} have a skin id different from nft equipped, updating...`);
                            connection.query(
                                'UPDATE ?? SET skinid = ? WHERE uniqueid = ?',
                                [table, data, userData[0]["uniqueid"]],
                                async (err, rows) => {
                                    if (err || rows.affectedRows === 0) {
                                        console.error('[SKIN ONWER FATAL]');
                                        console.error('[SKIN ONWER FATAL]');
                                        console.error('[SKIN ONWER ERROR] CANNOT UPDATE SKINID: ' + err.stack);
                                        console.error('[SKIN ONWER ERROR] FROM TABLE: ' + table + ", UNIQUEID:" + userData[0]["uniqueid"]);
                                        console.error('[SKIN ONWER FATAL]');
                                        console.error('[SKIN ONWER FATAL]');
                                    }

                                    requestsRunning--;
                                    quantityFinished++;
                                }
                            );
                            return;
                        } else {
                            console.log(`[SKIN OWNER] ${userData[0]["uniqueid"]} OK`)
                        }
                    }
                }
                requestsRunning--;
                quantityFinished++;
            }
        );
    }
}

async function getSkinData(userAddress, nftId) {
    try {
        const ownerAddress = await OwnerOf(nftId);
        if (ownerAddress == userAddress) {
            return await GetNftData(nftId);
        }
        return null;
    } catch (error) {
        console.error("[SKIN ONWER] ERROR: cannot get skin data, reason: ");
        console.error(error);
        return null;
    }
}

while (true) {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (quantityFinished >= quantityToIterate) break;
}
console.log("[SKIN ONWER] Finished");
process.exit(0);