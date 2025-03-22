import { readFileSync, writeFileSync } from "fs";

function parseConfig(configString) {
    return configString
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"))
        .reduce((acc, line) => {
            const [key, value] = line.split("=");
            acc[key.trim()] = value ? value.trim() : "";
            return acc;
        }, {});
}

export default function (communityConfigs, managerConfigs) {
    try {
        const communityData = readFileSync(communityConfigs, "utf-8");
        const managerData = readFileSync(managerConfigs, "utf-8");

        const communityConfigObj = parseConfig(communityData);
        const managerConfigObj = parseConfig(managerData);

        Object.keys(communityConfigObj).forEach((key) => {
            if (managerConfigObj.hasOwnProperty(key)) {
                managerConfigObj[key] = communityConfigObj[key];
            }
        });

        const mergedConfig = Object.entries(managerConfigObj)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n");

        writeFileSync(managerConfigs, mergedConfig, "utf-8");

        console.log("Configurations updated successfully!");
    } catch (error) {
        console.error("Error updating configurations:", error);
    }
}