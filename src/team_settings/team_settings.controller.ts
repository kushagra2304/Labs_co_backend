import { Request, Response, NextFunction } from 'express';
import { MasterService } from './team_settings.service';
import { MasterModelName } from './team_settings.repository';

export class TeamSettingsController {
  private service: MasterService;

  constructor(modelName: MasterModelName) {
    this.service = new MasterService(modelName);
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const search = req.query.search as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';
      const departmentId = req.query.departmentId as string;

      const result = await this.service.getItems({
        search,
        isActive,
        page,
        limit,
        sortBy,
        sortOrder,
        departmentId,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: page || 1,
          limit: limit || 10,
          totalPages: Math.ceil(result.total / (limit || 10)),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const item = await this.service.getItemById(id);
      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.id || 'admin';
      const item = await this.service.createItem({
        ...req.body,
        createdBy: actorId,
      });
      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const actorId = (req as any).user?.id || 'admin';
      const item = await this.service.updateItem(id, {
        ...req.body,
        updatedBy: actorId,
      });
      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { isActive } = req.body;
      const actorId = (req as any).user?.id || 'admin';

      if (isActive === undefined) {
        throw new Error('isActive status is required');
      }

      const item = await this.service.toggleStatus(id, isActive, actorId);
      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const actorId = (req as any).user?.id || 'admin';
      const item = await this.service.deleteItem(id, actorId);
      res.status(200).json({
        success: true,
        message: 'Deleted successfully',
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };
}
