"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureSettingsController = void 0;
const feature_settings_service_1 = require("./feature_settings.service");
class FeatureSettingsController {
    service = new feature_settings_service_1.FeatureSettingsService();
    get = async (_req, res, next) => {
        try {
            const settings = await this.service.getAllSettings();
            res.status(200).json({
                success: true,
                data: settings,
            });
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            const actorId = req.user?.id || 'admin';
            const { featureKey, enabled } = req.body;
            if (!featureKey || enabled === undefined) {
                throw new Error('featureKey and enabled fields are required');
            }
            await this.service.updateSetting(featureKey, enabled, actorId);
            const settings = await this.service.getAllSettings();
            res.status(200).json({
                success: true,
                message: 'Feature setting updated successfully',
                data: settings,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.FeatureSettingsController = FeatureSettingsController;
