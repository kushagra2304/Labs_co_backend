import { MasterRepository, MasterModelName, IMasterCreateInput, IMasterUpdateInput, IMasterEntity } from './team_settings.repository';

export class MasterService {
  private repository: MasterRepository;

  constructor(private modelName: MasterModelName) {
    this.repository = new MasterRepository(modelName);
  }

  async getItems(params: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    departmentId?: string;
  }) {
    return this.repository.findAll(params);
  }

  async getItemById(id: string): Promise<IMasterEntity> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} not found`);
    }
    return item;
  }

  async createItem(data: IMasterCreateInput): Promise<IMasterEntity> {
    const trimmedName = data.name ? data.name.trim() : '';
    if (!trimmedName) {
      throw new Error('Name is required');
    }

    const existing = await this.repository.findByName(trimmedName);
    if (existing) {
      throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} with name "${trimmedName}" already exists`);
    }

    return this.repository.create({
      ...data,
      name: trimmedName,
    });
  }

  async updateItem(id: string, data: IMasterUpdateInput): Promise<IMasterEntity> {
    const existingItem = await this.repository.findById(id);
    if (!existingItem) {
      throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} not found`);
    }

    if (data.name !== undefined) {
      const trimmedName = data.name ? data.name.trim() : '';
      if (!trimmedName) {
        throw new Error('Name is required');
      }

      if (trimmedName.toLowerCase() !== existingItem.name.toLowerCase()) {
        const existingWithName = await this.repository.findByName(trimmedName);
        if (existingWithName) {
          throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} with name "${trimmedName}" already exists`);
        }
      }
      data.name = trimmedName;
    }

    return this.repository.update(id, data);
  }

  async toggleStatus(id: string, isActive: boolean, actorId: string): Promise<IMasterEntity> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} not found`);
    }

    return this.repository.update(id, {
      isActive,
      updatedBy: actorId,
    });
  }

  async deleteItem(id: string, actorId: string): Promise<IMasterEntity> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} not found`);
    }

    return this.repository.softDelete(id, actorId);
  }
}
