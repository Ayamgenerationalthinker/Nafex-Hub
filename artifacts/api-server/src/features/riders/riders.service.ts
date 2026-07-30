import { RidersRepository } from "./riders.repository";
import { NotFoundError } from "../../shared/errors/AppError";

export class RidersService {
  private repository: RidersRepository;

  constructor(repository: RidersRepository) {
    this.repository = repository;
  }

  public async getRiders() {
    return await this.repository.getRiders();
  }

  public async getAvailableRiders() {
    return await this.repository.getAvailableRiders();
  }

  public async createRider(data: any) {
    return await this.repository.createRider(data);
  }

  public async updateRider(id: number, data: any) {
    const existing = await this.repository.getRiderById(id);
    if (!existing) throw new NotFoundError("Rider not found");

    return await this.repository.updateRider(id, data);
  }

  public async toggleAvailability(id: number) {
    const existing = await this.repository.getRiderById(id);
    if (!existing) throw new NotFoundError("Rider not found");

    return await this.repository.updateRider(id, { isAvailable: !existing.isAvailable });
  }
}
