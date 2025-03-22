import { existsSync, read } from "fs";
import { exec } from "child_process";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import CopyConfigs from './copy-configs.js';

export default async function (readline) {
    return new Promise(async (finish, reject) => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const fullPath = resolve(__dirname, "../libs/pte_manager");
        const managerConfigs = resolve(__dirname, "../libs/pte_manager/configs.txt");
        const communityConfigs = resolve(__dirname, "../configs.txt");

        if (existsSync(fullPath)) {
            finish();
            return;
        }

        function downloadManager() {
            console.log("Downloading...");
            exec(`git clone https://github.com/Play-To-Earn-Currency/manager ${fullPath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error("Cannot clone the repository", error.message);
                    reject(error);
                }
                console.log("Manager downloaded succesfully!");
                console.log("Downloading npm dependencies for manager...");

                exec(`cd ${fullPath} && npm install`, (installError, installStdout, installStderr) => {
                    if (installError) {
                        console.error("Failed to install dependencies", installError.message);
                        return;
                    }
                    console.log("Dependencies installed successfully!");

                    CopyConfigs(communityConfigs, managerConfigs);
                    finish();
                });
                CopyConfigs(communityConfigs, managerConfigs);
                finish();
            });
        }

        if (readline != undefined) {
            readline.question("PTE Manager does not exist do you want to download? (yes/no): ", async (answer) => {
                if (answer.toLowerCase() == "yes") {
                    downloadManager();
                } else {
                    finish();
                }
            });
        } else {
            downloadManager();
        }
    });
}