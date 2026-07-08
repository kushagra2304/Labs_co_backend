import { Request, Response, NextFunction } from 'express';
import { FeatureSettingsService, IFeatureSettings } from './feature_settings.service';

export class FeatureSettingsController {
  private service = new FeatureSettingsService();

  get = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.service.getAllSettings();
      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.id || 'admin';
      const { featureKey, enabled } = req.body;

      if (!featureKey || enabled === undefined) {
        throw new Error('featureKey and enabled fields are required');
      }

      await this.service.updateSetting(featureKey as keyof IFeatureSettings, enabled, actorId);
      const settings = await this.service.getAllSettings();

      res.status(200).json({
        success: true,
        message: 'Feature setting updated successfully',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };
}
