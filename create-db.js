require('dotenv').config()
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const mongoose = require('mongoose')

// config
const RECIPES_DIR = './recipes'

const CategorySchema = { name: String }
const Category = mongoose.model('Category', CategorySchema)
const DifficultySchema = { name: String }
const Difficulty = mongoose.model('Difficulty', DifficultySchema)
const TagSchema = { id: String, name: String }
const Tag = mongoose.model('Tag', TagSchema)
const IngredientSchema = { name: String }
const Ingredient = mongoose.model('Ingredient', IngredientSchema)

// schemas
const Recipe = mongoose.model('Recipe', {
  title: String,
  date: Date,
  prepTimeMin: Number,
  difficulty: DifficultySchema,
  kcalories: Number,
  categories: [CategorySchema],
  tags: [TagSchema],
  ingredients: [IngredientSchema],
  image: String,
  instructions: String,
})

// logging
const red = msg => console.log(chalk.red(msg))
const green = msg => console.log(chalk.green(msg))
const yellow = msg => console.log(chalk.yellow(msg))

let recipesCount = 0

const findOrCreate = async (model, find, create) => {
  return (await model.findOne(find)) || (await new model(create || find).save())
}

const getCategories = async categoryNames => {
  const c = []
  for (let categoryName of categoryNames) {
    c.push(await findOrCreate(Category, {name: categoryName}))
  }
  return c
}

const getTags = async tags => {
  const c = []
  for (let [id, tagName] of tags) {
    c.push(await findOrCreate(Tag, { id, name: tagName}))
  }
  return c
}

const getIngredients = async ingredients => {
  const c = []
  for (let [name, amount, unit] of ingredients) {
    c.push(await findOrCreate(Ingredient, {name}))
  }
  return c
}

const processFile = async filename => {
  const filePath = path.join(__dirname, RECIPES_DIR, filename)
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    const json = JSON.parse(data)

    const difficulty = await findOrCreate(Difficulty, { name: json.difficulty })
    const categories = await getCategories(json.categories)
    const tags = await getTags(json.tags)
    const ingredients = await getIngredients(json.ingredients)

    const recipe = new Recipe({
      id: json.id,
      title: json.title,
      date: json.date.replace(/(\d{2})\.(\d{2})\.(\d{4})/g, "$2.$1.$3"),
      prepTime: json.prepTime && json.prepTime.match(/\d+/g)[0],
      difficulty,
      categories,
      tags,
      ingredients,
      kcalories: json.kcalories && json.kcalories.match(/\d+/g)[0],
      image: json.image,
      instructions: json.instructions
    })
    await recipe.save()
    green(`-> stored recipe ${recipesCount++}: ${json.title}`)
  } catch (err) {
    red(`cannot access ${filename}: ${ err}`)
  }
}

const start = async () => {
  const recipesDir = path.join(__dirname, RECIPES_DIR)
  yellow(`scanning recipes dir ...`)
  try {
    const files = fs.readdirSync(recipesDir)
    for (let file of files) {
      await processFile(file)
    }
  } catch (err) {
    red(`error reading dir: ${err}`)
  }
}

// db
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
const db = mongoose.connection
db.once('open', start)
