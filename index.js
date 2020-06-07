const fs = require("fs")
const axios = require("axios")
const chalk = require('chalk')
const striptags = require('striptags')
const Entities = require('html-entities').AllHtmlEntities
const entities = new Entities()
const {from, iif, defer} = require("rxjs")
const {takeWhile, map, tap, mergeMap, mergeAll} = require("rxjs/operators")

const green = msg => console.log(chalk.green(msg))
const yellow = msg => console.log(chalk.yellow(msg))
const magenta = msg => console.log(chalk.magenta(msg))

const DEBUG = false
const RECIPES_OUTPUT_DIR = "./recipes"
const BASE_URL = "https://www.chefkoch.de"
const CONCURRENT_REQUESTS = 5
const MAX_RECIPES = 1000000
const INGREDIENTS_PORTIONS = 1

const r$ = url => {
  const regex = new RegExp(`^${BASE_URL}`,"gm");
  url = `${BASE_URL}${url.replace(regex, "")}`
  return defer(() => {
    yellow(`downloading ${chalk.blue.underline(url)}`)
    return from(axios.get(url))
  })
}

// get topmost categories & categories-name
const parseCategories = ({data}) => {
  if (DEBUG) magenta('parsing category-url´s')
  const regex = /<h2 class="category-level-1">\n\s*<a href="(.+?)".*">(.+?)<\/a>/gm
  const match = data.matchAll(regex)
  const urls = [...match].map(x => [x[2], x[1]])
  if (DEBUG) urls.forEach(([name, url]) => green(`--> ${name}: ${url}`))
  return urls  // ["category-name", "url"]
}

const generatePagedUrls = ([url, count]) => {
  const step = 30 // chefkoch display 30 recipes per page
  const pages = Math.floor(count / step)
  const urls = []
  for (let i = 0; i <= pages; i++) {
    urls.push(url.replace(/(^\/rs\/s)0(.+)$/m, `$1${i * step}$2`))
  }
  return urls;
}

const parseRecipeResultsCount = ({request, data}) => {
  if (DEBUG) magenta(`parsing recipe count for ${chalk.blue.underline(request.path)}`)
  const regex = /<span class="ds-h7">(.*) Ergebnisse<\/span>/gm
  const match = data.matchAll(regex)
  const count = Number([...match][0][1].replace('.', ''))
  if (DEBUG) green(`--> ${count}`)
  return [request.path, count] // ex. ["/rs/s0g53/saisonale-Rezepte.html", 901133]
}

const parseRecipeUrls = ({request, data}) => {
  if (DEBUG) magenta(`parsing recipe urls for ${chalk.blue.underline(request.path)}`)
  const regex = /<a.+bi-recipe-item"\s.*href="(.+)"\s.*data-vars-recipe-id="(.+)"/gm
  const match = data.matchAll(regex)
  const urls = [...match].map(([, url, id]) => [id, `${url}?portionen=${INGREDIENTS_PORTIONS}`]) // [recipe-id, recipe-url]
  if (DEBUG) urls.forEach(([id, url]) => green(`--> ${id}: ${url}`))
  return urls
}

const storeRecipe = ([id, json]) => {
  const fileName = `${RECIPES_OUTPUT_DIR}/${id}.json`
  fs.writeFileSync(fileName, JSON.stringify(json, null, 2))
  if (DEBUG) green(`--> stored ${fileName}`)
  return [id, fileName, json.title]
}

const parseRecipe = ({request, data}) => {
  if (DEBUG) magenta(`parsing recipe for ${chalk.blue.underline(request.path)}`)
  const header = data.match(/<article.*?recipe-header.*?>(.*?)<\/article>/sg)[0]
  const id = [...request.path.matchAll(/rezepte\/(\d+)/gs)][0][1]
  const title = [...data.matchAll(/<h1.*>(.+)<\/h1>/gs)][0][1]
  const dateMatch = [...header.matchAll(/<span class="recipe-date">.*?<\/i>(.*?)<\/span>/sg)][0]
  const prepTimeMatch = [...header.matchAll(/<span class="recipe-preptime">.*?<\/i>(.*?)<\/span>/sg)][0]
  const difficultyMatch = [...header.matchAll(/<span class="recipe-difficulty">.*?<\/i>(.*?)<\/span>/sg)][0]
  const kcaloriesMatch = [...header.matchAll(/<span class="recipe-kcalories">.*?<\/i>(.*?)<\/span>/sg)][0]
  const json = {
    id,
    title,
    date: dateMatch && dateMatch[1].trim(),
    prepTime: prepTimeMatch && prepTimeMatch[1].trim(),
    difficulty: difficultyMatch && difficultyMatch[1].trim(),
    kcalories: kcaloriesMatch && kcaloriesMatch[1].trim(),
    categories: parseRecipeCategories(data),
    tags: parseRecipeTags(header),
    ingredients: parseRecipeIngredients(data),
    image: parseImage(data),
    instructions: parseInstructions(data)
  }
  return [id, json]
}

const parseRecipeCategories = body => {
  const match = body.match(/<nav aria-label="Breadcrumb".*?>(.*?)<\/nav>/sg)
  const matches = match[0].matchAll(/<span itemprop="name">(.*?)<\/span>/sg)
  const categories = [...matches].map(([, name]) => name).map(name => entities.decode(name))
  // cut off first 3 breadcrumbs
  return categories.slice(3)
}

const parseRecipeTags = header => {
  const matches = header.matchAll(/<a href="\/rs\/s0t(.+?)\/.*?".*?bi-tags.*?>(.*?)<\/a>/sg)
  const tags = [...matches].map(([, id, name]) => [id, entities.decode(name).trim()])
  return tags
}

const parseRecipeIngredients = body => {
  const tableMatch = body.match(/<table.*?ingredients.*?>(.*?)<\/table>/sg)[0]
  const ingredientMatches = [...tableMatch.matchAll(/<tr>.*?td-left.*?<span>(.*?)<\/span>.*?td-right.*?<span>(.*?)<\/span>.*?<\/tr>/sg)]
  const ingredients = ingredientMatches.map(([,amount, ingredient]) => {
    const amounts = amount.trim().split("                                ") // you funky chefkoch, you
    return [striptags(ingredient).trim(), ...amounts]
  })
  return ingredients
}

const parseImage = body => {
  const match = body.match(/https:\/\/img.chefkoch-cdn\.de\/rezepte\/(?:.*)\/bilder\/(?:.*)\/crop-960x720\//m)
  return match && match[0]
}

const parseInstructions = body => {
  const match = body.match(/recipeInstructions": "(.*)"/m)
  return match && JSON.parse(`"${match[1]}"`)
}

const start = () => {
  if (DEBUG) magenta(`create directory "${RECIPES_OUTPUT_DIR}"`)
  fs.mkdirSync(RECIPES_OUTPUT_DIR, {recursive: true})

  let recipesCount = 0
  r$("/rezepte/kategorien/").pipe(
    map(parseCategories), // [category-name, url]
    mergeMap(x => from(x)), // make 1 stream per category-url
    map(([, url]) => r$(url)), // request 1st category-page
    mergeAll(1), // limit concurrent requests
    map(parseRecipeResultsCount), // [url, count]
    map(generatePagedUrls), // [url, url, ...]
    mergeMap(x => from(x)), // make 1 stream per paged category-url
    map(url => r$(url)), // request paged category-url
    mergeAll(2), // limit concurrent requests
    map(parseRecipeUrls), // [recipe-id, recipe-url]
    mergeMap(x => from(x)), // make 1 stream per recipe-url
    tap(() => recipesCount++), // count recipes
    map(([id, url]) => iif(() => !fs.existsSync(`${RECIPES_OUTPUT_DIR}/${id}.json`), r$(url))), // download recipe only if not already exists
    mergeAll(CONCURRENT_REQUESTS), // limit concurrent requests
    map(parseRecipe), // [id, json]
    map(storeRecipe), // [id, fileName]
    takeWhile(() => recipesCount < MAX_RECIPES)
  ).subscribe(([id, , title]) => {
    green(`--> finished recipe ${recipesCount}: ${title} [${id}]`)
  })
}

start()
