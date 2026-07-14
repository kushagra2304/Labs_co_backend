"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureSettingsService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
class FeatureSettingsService {
    static defaultSettings = {
        useDepartments: true,
        useDesignations: false, // Default designations off as per instructions
    };
    static mapKeyToDb(key) {
        if (key === 'useDepartments')
            return 'use_departments';
        if (key === 'useDesignations')
            return 'use_designations';
        return key;
    }
    static mapKeyToCode(key) {
        if (key === 'use_departments')
            return 'useDepartments';
        if (key === 'use_designations')
            return 'useDesignations';
        return key;
    }
    async getAllSettings() {
        const dbSettings = await client_1.default.teamFeatureSetting.findMany();
        const settings = { ...FeatureSettingsService.defaultSettings };
        for (const dbSetting of dbSettings) {
            const codeKey = FeatureSettingsService.mapKeyToCode(dbSetting.featureKey);
            if (codeKey in settings) {
                settings[codeKey] = dbSetting.enabled;
            }
        }
        return settings;
    }
    async isEnabled(key) {
        const dbKey = FeatureSettingsService.mapKeyToDb(key);
        const dbSetting = await client_1.default.teamFeatureSetting.findUnique({
            where: { featureKey: dbKey },
        });
        if (!dbSetting) {
            return FeatureSettingsService.defaultSettings[key];
        }
        return dbSetting.enabled;
    }
    async updateSetting(key, enabled, actorId) {
        const dbKey = FeatureSettingsService.mapKeyToDb(key);
        await client_1.default.teamFeatureSetting.upsert({
            where: { featureKey: dbKey },
            update: {
                enabled,
                updatedBy: actorId,
            },
            create: {
                featureKey: dbKey,
                enabled,
                updatedBy: actorId,
            },
        });
        return true;
    }
}
exports.FeatureSettingsService = FeatureSettingsService;
