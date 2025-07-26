import http from 'http';
import MySQL from 'mysql2';
import Configs from "./libs/configs-loader.js";
import ownerNfts from "./libs/owner-nfts.js";
import ownerOf from "./libs/owner-of.js";
import getNftData from "./libs/get-nft-data.js";

const configs = Configs();

let connection;
function handleDisconnect() {
    connection = MySQL.createConnection({
        host: configs["skinowner_tokens_database_ip"],
        user: configs["skinowner_tokens_database_username"],
        password: configs["skinowner_tokens_database_password"],
        database: configs["skinowner_tokens_database_name"]
    });

    connection.connect(err => {
        if (err) {
            console.error('[SIMPLESKINS] Cannot connect to database:', err);
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log('[SIMPLESKINS] Database connected');
        }
    });

    connection.on('error', err => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.warn('[SIMPLESKINS] Database connection lost. Reconnecting...');
            handleDisconnect();
        } else {
            console.error(err);
            console.error('[SIMPLESKINS] Database unkown error. Reconnecting...');
            handleDisconnect();
        }
    });
}
handleDisconnect();

// #REGION Database Functions
async function getEquippedSkin(tableName, uniqueid) {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT skinid, nftId, walletaddress FROM \`${tableName}\` WHERE uniqueid = ? LIMIT 1`,
            [uniqueid],
            async (err, results) => {
                if (err) {
                    console.error("[SIMPLESKIN] Database error: ", err);
                    reject("Error: Database error");
                    return;
                }
                resolve(results);
                return;
            }
        );
    });
}

async function deleteRegistry(tableName, uniqueid) {
    return new Promise((resolve, reject) => {
        connection.query(
            `DELETE FROM \`${tableName}\` WHERE uniqueid = ? LIMIT 1`,
            [uniqueid],
            (deleteErr) => {
                if (deleteErr) {
                    console.error('[SIMPLESKIN] Error: Cannot delete ' + uniqueid + ', ', deleteErr);
                    console.log("------------");
                } else {
                    console.warn('[SIMPLESKIN] Entry deleted for uniqueid: ' + uniqueid);
                    console.log("------------");
                }
                resolve();
                return;
            }
        );
    });
}

async function getWalletAddres(tableName, uniqueid) {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT walletaddress FROM \`${tableName}\` WHERE uniqueid = ? LIMIT 1`,
            [uniqueid],
            (err, results) => {
                if (err) {
                    console.error("[SIMPLESKIN] Database error: ", err);
                    reject("Error: Database error");
                    return;
                }
                resolve(results);
            }
        );
    });
}

async function getSkinId(tableName, uniqueid) {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT skinid FROM \`${tableName}\` WHERE uniqueid = ? LIMIT 1`,
            [uniqueid],
            (err, results) => {
                if (err) {
                    console.error("[SIMPLESKIN] Database error: ", err);
                    reject("Error: Database error");
                    return;
                }
                resolve(results);
            }
        );
    });
}

async function equipSkin(tableName, uniqueid, nftid, skinid, walletaddress) {
    return new Promise((resolve, reject) => {
        connection.query(
            `INSERT INTO \`${tableName}\` (uniqueid, nftid, skinid, walletaddress)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nftid = VALUES(nftid), skinid = VALUES(skinid)`,
            [uniqueid, nftid, skinid, walletaddress],
            (upsertErr) => {
                if (upsertErr) {
                    console.error("[SIMPLESKIN] Database upsert error: ", upsertErr);
                    resolve(false);
                    return;
                }
                resolve(true);
                return;
            }
        );
    });
}
// #ENDREGION Database Functions

const ID_REQUESTS = [];
const MAX_REQUESTS = configs["maximum_requests_per_queue"];
function removeIDRequest(uniqueid) {
    const index = ID_REQUESTS.indexOf(uniqueid);
    if (index !== -1) {
        ID_REQUESTS.splice(index, 1);
    }
}

const PORT = 8002;
const server = http.createServer(async (req, res) => {
    if (ID_REQUESTS.length >= MAX_REQUESTS) {
        res.writeHead(429);
        res.end("Error: Too many requests, please try again later");
        return;
    }

    if (req.url.startsWith('/equippedskin') && req.method === 'GET') {
        try {
            const fromHeader = req.headers['from'];

            if (!fromHeader) {
                res.writeHead(400);
                res.end("Error: Missing required fields");
                return;
            }

            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const uniqueid = urlObj.searchParams.get('uniqueid');

            if (!uniqueid) {
                res.writeHead(400);
                res.end("Error: Missing required fields");
                return;
            }

            if (ID_REQUESTS.includes(uniqueid)) {
                res.writeHead(409);
                res.end("Error: Unique ID already requesting payment");
                return;
            }

            ID_REQUESTS.push(uniqueid);

            try {
                console.log("------------");
                console.log("[SIMPLESKIN] Equipped skin request received from uniqueid: " + uniqueid);

                const tableName = `${fromHeader}_skins`;
                const results = await getEquippedSkin(tableName, uniqueid);
                const skinid = results.length > 0 ? results[0].skinid : null;
                const nftId = results.length > 0 ? results[0].nftId : null;
                const walletaddress = results.length > 0 ? results[0].walletaddress : null;
                if (!skinid || !nftId || !walletaddress) {
                    res.writeHead(404);
                    res.end("No skin equipped");

                    console.warn("[SIMPLESKIN] No skin equipped");
                    console.warn("------------");

                    removeIDRequest(uniqueid);
                    return;
                }

                const ownerWalletAddress = await ownerOf(nftId);

                if (walletaddress != ownerWalletAddress) {
                    res.writeHead(403);
                    res.end("Error: You are not the owner of this NFT");

                    console.warn('[SIMPLESKIN] You are not the owner of this NFT');

                    await deleteRegistry(tableName, uniqueid);

                    removeIDRequest(uniqueid);
                    return;
                }

                console.log('[SIMPLESKIN] Skin equipped: ' + skinid);
                console.log("------------");

                res.writeHead(200);
                res.end(skinid);

                removeIDRequest(uniqueid);
            } catch (unkownError) {
                removeIDRequest(uniqueid);

                res.writeHead(500);
                res.end("Error: Server Exception");
                console.error("[SIMPLESKIN] Server Exception: ", unkownError);
                console.log("------------");
            }
        } catch (err) {
            res.writeHead(500);
            res.end("Error: Server Exception");
            console.error("[SIMPLESKIN] Server Exception: ", err);
        }
    } else if (req.url.startsWith('/equipskin') && req.method === 'POST') {
        try {
            const fromHeader = req.headers['from'];

            if (!fromHeader) {
                res.writeHead(400);
                res.end("Error: Missing required fields");
                return;
            }

            let body = '';
            req.on('data', chunk => {
                body += chunk;
            });

            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const skinid = data.skinid;
                    const uniqueid = data.uniqueid;

                    if (!skinid || !uniqueid) {
                        res.writeHead(400);
                        res.end("Error: Missing required fields");
                        return;
                    }

                    if (ID_REQUESTS.includes(uniqueid)) {
                        res.writeHead(409);
                        res.end("Error: Unique ID already requesting payment");
                        return;
                    }

                    ID_REQUESTS.push(uniqueid);
                    try {
                        console.log("------------");
                        console.log("[SIMPLESKIN] Equip skin request received from uniqueid: " + uniqueid);

                        const tableName = `${fromHeader}_skins`;

                        const results = await getWalletAddres(fromHeader, uniqueid);
                        const walletaddress = results.length > 0 ? results[0].walletaddress : null;

                        if (!walletaddress) {
                            res.writeHead(501);
                            res.end("Error: Missing wallet on user registration");

                            console.warn("[SIMPLESKIN] Invalid wallet for uniqueid: " + uniqueid);
                            console.log("------------");

                            removeIDRequest(uniqueid);
                            return;
                        }

                        const results2 = await getSkinId(tableName, uniqueid);
                        const equippedSkinId = results2.length > 0 ? results2[0].skinid : null;
                        if (skinid == equippedSkinId) {
                            res.writeHead(200);
                            res.end(skinid);

                            console.log('[SIMPLESKIN] New Skin equip: ' + skinid);
                            console.log("------------");

                            removeIDRequest(uniqueid);
                            return;
                        }

                        const nftsIds = await ownerNfts(walletaddress);
                        for (let i = 0; i < nftsIds.length; i++) {
                            const nftid = nftsIds[i];
                            const iterationSkinId = await getNftData(nftid);
                            if (iterationSkinId == skinid) {
                                if (await equipSkin(tableName, uniqueid, nftid, skinid, walletaddress)) {
                                    res.writeHead(200);
                                    res.end(skinid);
                                    console.log('[SIMPLESKIN] New Skin equip: ' + skinid);
                                    console.log("------------");

                                    removeIDRequest(uniqueid);
                                    return;
                                } else {
                                    res.writeHead(500);
                                    res.end("Error: Database error");
                                    console.log("------------");

                                    removeIDRequest(uniqueid);
                                    return;
                                }
                            }
                        }

                        res.writeHead(401);
                        res.end("Error: You don't have this NFT");

                        console.warn('[SIMPLESKIN] ' + uniqueid + " request a equip skin but he don't have that nft");
                        console.log("------------");

                        removeIDRequest(uniqueid);
                    } catch (unkownError) {
                        removeIDRequest(uniqueid);

                        res.writeHead(500);
                        res.end("Error: Server Exception");
                        console.error("[SIMPLESKIN] Server Exception: ", unkownError);
                        console.log("------------");
                    }
                } catch (parseErr) {
                    res.writeHead(402);
                    res.end("Error: Invalid JSON");

                    console.error("[SIMPLESKIN] Json parse error: " + parseErr);
                }
            });
        } catch (err) {
            res.writeHead(500);
            res.end("Error: Server Exception");
            console.error("[SIMPLESKIN] Server Exception: ", err);
        }
    } else if (req.url.startsWith('/availableskins') && req.method === 'GET') {
        try {
            const fromHeader = req.headers['from'];

            if (!fromHeader) {
                res.writeHead(400);
                res.end("Error: Missing required fields");
                return;
            }

            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const uniqueid = urlObj.searchParams.get('uniqueid');

            if (!uniqueid) {
                res.writeHead(400);
                res.end("Error: Missing required fields");
                return;
            }

            if (ID_REQUESTS.includes(uniqueid)) {
                res.writeHead(409);
                res.end("Error: Unique ID already requesting payment");
                return;
            }

            ID_REQUESTS.push(uniqueid);
            try {
                console.log("------------");
                console.log("[SIMPLESKIN] Available skins request received from uniqueid: " + uniqueid);

                const results = await getWalletAddres(fromHeader, uniqueid);
                const walletaddress = results.length > 0 ? results[0].walletaddress : null;
                if (!walletaddress) {
                    res.writeHead(501);
                    res.end("Error: Missing wallet on available skins");

                    console.warn("[SIMPLESKIN] Invalid wallet for uniqueid: " + uniqueid);
                    console.log("------------");

                    removeIDRequest(uniqueid);
                    return;
                }

                const nftsIds = await ownerNfts(walletaddress);
                const availableSkins = [];
                for (let i = 0; i < nftsIds.length; i++) {
                    const nftid = nftsIds[i];
                    const iterationSkinId = await getNftData(nftid);
                    if (availableSkins.includes(iterationSkinId)) continue;
                    else availableSkins.push(iterationSkinId);
                }

                res.writeHead(200);
                res.end(JSON.stringify(availableSkins));

                console.log('[SIMPLESKIN] Available skins: ' + JSON.stringify(availableSkins));
                console.log("------------");

                removeIDRequest(uniqueid);
            } catch (unkownError) {
                removeIDRequest(uniqueid);

                res.writeHead(500);
                res.end("Error: Server Exception");
                console.error("[SIMPLESKIN] Server Exception: ", unkownError);
                console.log("------------");
            }
        } catch (err) {
            res.writeHead(500);
            res.end("Error: Server Exception");
            console.error("[SIMPLESKIN] Server Exception: ", err);
        }
    } else {
        res.writeHead(404);
        res.end("404 - Not Found");
    }
});

server.listen(PORT, () => {
    console.log(`[SIMPLESKINS] Listening to ${PORT}`);
});