const fs = require("fs")
const axios = require("axios")
const chalk = require('chalk')
const {from, iif, defer} = require("rxjs")
const {tap, map, mergeMap, mergeAll} = require("rxjs/operators")

const green = msg => console.log(chalk.green(msg))
const yellow = msg => console.log(chalk.yellow(msg))
const magenta = msg => console.log(chalk.magenta(msg))

const RECIPES_DIR = "./recipes"
const BASE_URL = "https://www.chefkoch.de"
const CONCURRENT_REQUESTS = 2

const r$ = url => {
  url = url.replace(/^https:\/\/www.chefkoch.de/gm, "")
  url = `${BASE_URL}${url}`
  return defer(() => {
    yellow(`downloading ${chalk.blue.underline(url)}`)
    return from(axios.get(url))
  })
}

// get topmost categories & categories-name
const parseCategories = ({data}) => {
  magenta('parsing category-url´s')
  const regex = /<h2 class="category-level-1">\n\s*<a href="(.+?)".*">(.+?)<\/a>/gm
  const match = data.matchAll(regex)
  const urls = [...match].map(x => [x[2], x[1]])
  urls.forEach(([name, url]) => green(`--> ${name}: ${url}`))
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
  magenta(`parsing recipe count for ${chalk.blue.underline(request.path)}`)
  const regex = /<span class="ds-h7">(.*) Ergebnisse<\/span>/gm
  const match = data.matchAll(regex)
  const count = Number([...match][0][1].replace('.', ''))
  green(`--> ${count}`)
  return [request.path, count] // ex. ["/rs/s0g53/saisonale-Rezepte.html", 901133]
}

const parseRecipeUrls = ({request, data}) => {
  magenta(`parsing recipe urls for ${chalk.blue.underline(request.path)}`)
  const regex = /<a.+bi-recipe-item"\s.*href="(.+)"\s.*data-vars-recipe-id="(.+)"/gm
  const match = data.matchAll(regex)
  const urls = [...match].map(x => [x[2], x[1]]) // [recipe-id, recipe-url]
  urls.forEach(([id, url]) => green(`--> ${id}: ${url}`))
  return urls
}

const parseRecipe = ({request, data}) => {
  magenta(`parsing recipe for ${chalk.blue.underline(request.path)}`)
  const id = [...request.path.matchAll(/rezepte\/(\d+)/gm)][0][1]
  const regex = /<h1.*>(.+)<\/h1>/gm
  const match = data.matchAll(regex)
  const json = [...match].map(x => ({
    id,
    title: x[1]
  }))[0]
  return [id, json]
}

const storeRecipe = ([id, json]) => {
  const fileName = `${RECIPES_DIR}/${id}.json`
  fs.writeFileSync(fileName, JSON.stringify(json, null, 2))
  green(`--> stored ${fileName}`)
  return [id, fileName]
}

const start = () => {
  magenta(`create directory "${RECIPES_DIR}"`)
  fs.mkdirSync(RECIPES_DIR, {recursive: true})

  magenta('get category index')
  r$("/rezepte/kategorien/").pipe(
    map(parseCategories),
    mergeMap(x => from(x)), // make 1 stream per category-url
    mergeMap(([, url]) => r$(url)), // request 1st category-page
    map(parseRecipeResultsCount),
    //mergeMap(generatePagedUrls),
    //mergeMap(x => from(x)), // make 1 stream per paged category-url
    map(([url]) => url), // TODO remove
    map(url => r$(url)), // request paged category-urls
    mergeAll(CONCURRENT_REQUESTS), // limit concurrent requests
    map(parseRecipeUrls),
    mergeMap(x => from(x)), // make 1 stream per recipe-url
    map(([id, url]) => iif(() => !fs.existsSync(`${RECIPES_DIR}/${id}.json`), r$(url))), // download recipe only if not already exists
    mergeAll(CONCURRENT_REQUESTS), // limit concurrent requests
    map(parseRecipe),
    tap(storeRecipe)
  ).subscribe(([id, fileName]) => {
    //green(`---> done with recipe ${id}`)
  })
}

start()
