import prisma from '../prisma/client';

export interface IFeatureSettings {
  useDepartments: boolean;
  useDesignations: boolean;
}

export class FeatureSettingsService {
  private static defaultSettings: IFeatureSettings = {
    useDepartments: true,
    useDesignations: false, // Default designations off as per instructions
  };

  private static mapKeyToDb(key: string): string {
    if (key === 'useDepartments') return 'use_departments';
    if (key === 'useDesignations') return 'use_designations';
    return key;
  }

  private static mapKeyToCode(key: string): keyof IFeatureSettings {
    if (key === 'use_departments') return 'useDepartments';
    if (key === 'use_designations') return 'useDesignations';
    return key as any;
  }

  async getAllSettings(): Promise<IFeatureSettings> {
    const dbSettings = await prisma.teamFeatureSetting.findMany();
    const settings = { ...FeatureSettingsService.defaultSettings };

    for (const dbSetting of dbSettings) {
      const codeKey = FeatureSettingsService.mapKeyToCode(dbSetting.featureKey);
      if (codeKey in settings) {
        settings[codeKey] = dbSetting.enabled;
      }
    }

    return settings;
  }

  async isEnabled(key: keyof IFeatureSettings): Promise<boolean> {
    const dbKey = FeatureSettingsService.mapKeyToDb(key);
    const dbSetting = await prisma.teamFeatureSetting.findUnique({
      where: { featureKey: dbKey },
    });

    if (!dbSetting) {
      return FeatureSettingsService.defaultSettings[key];
    }

    return dbSetting.enabled;
  }

  async updateSetting(key: keyof IFeatureSettings, enabled: boolean, actorId: string): Promise<boolean> {
    const dbKey = FeatureSettingsService.mapKeyToDb(key);
    
    await prisma.teamFeatureSetting.upsert({
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
