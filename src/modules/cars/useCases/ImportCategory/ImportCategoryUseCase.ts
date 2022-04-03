import { CategoriesRepository } from '@modules/cars/infra/typeorm/repositories/CategoriesRepository'
import fs from 'fs'
import { parse } from 'csv-parse'
import { inject, injectable } from 'tsyringe'

interface IImportCategory {
  name: string
  description: string
}

@injectable()
class ImportCategoryUseCase {
  constructor(
    @inject('CategoriesRepository')
    private categoriesRepository: CategoriesRepository,
  ) {}
  loadCategories(file: Express.Multer.File): Promise<IImportCategory[]> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(file.path)

      const categories: IImportCategory[] = []

      const parseFile = parse()

      stream.pipe(parseFile)

      parseFile
        .on('data', async (file) => {
          const [name, description] = file

          categories.push({
            name,
            description,
          })
        })
        .on('end', () => {
          resolve(categories)
          fs.promises.unlink(file.path)
        })
        .on('error', (error) => {
          reject(error)
        })
    })
  }
  async execute(file: Express.Multer.File): Promise<void> {
    const categories = await this.loadCategories(file)

    categories.map(async (category) => {
      const categoryAlreadyExists = await this.categoriesRepository.findByName(
        category.name,
      )

      if (!categoryAlreadyExists) {
        await this.categoriesRepository.create(category)
      }
    })
  }
}

export { ImportCategoryUseCase }
