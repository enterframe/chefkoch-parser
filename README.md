# chefkoch-parser
scrapes recipes out of chefkoch.de

## run command
`npm i && npm start`

## options
```
const DEBUG = false
const RECIPES_OUTPUT_DIR = "./recipes"
const BASE_URL = "https://www.chefkoch.de"
const CONCURRENT_REQUESTS = 5
const MAX_RECIPES = 100
const INGREDIENTS_PORTIONS = 1
```