# chefkoch-parser
scrapes recipes out of chefkoch.de

## run command
`npm i && npm start`

## options
```
const DEBUG                 = false         // be verbose
const RECIPES_OUTPUT_DIR    = "./recipes"   // store recipes here
const MAX_RECIPES_CATEGORY  = 10000         // limit recipes per category
const MAX_RECIPES           = 100000        // limit recipes in general
const INGREDIENTS_PORTIONS  = 1             // calculate ingredients by portions
```

## example output
```
{
  "id": "820481186558221",
  "title": "Zitronenkuchen",
  "date": "08.08.2007",
  "prepTime": "25 Min.",
  "difficulty": "simpel",
  "kcalories": "6963 kcal",
  "categories": [
    "Zubereitungsarten",
    "Backen"
  ],
  "tags": [
    [
      "23",
      "Backen"
    ],
    [
      "32",
      "Vegetarisch"
    ],
    [
      "49",
      "Schnell"
    ],
    [
      "50",
      "einfach"
    ],
    [
      "92",
      "Kuchen"
    ],
    [
      "1605",
      "Gluten"
    ],
    [
      "4123",
      "Lactose"
    ]
  ],
  "ingredients": [
    [
      "Margarine",
      "350",
      "g"
    ],
    [
      "Mehl",
      "350",
      "g"
    ],
    [
      "Zucker",
      "350",
      "g"
    ],
    [
      "Vanillezucker",
      "1",
      "Pck."
    ],
    [
      "Backpulver",
      "2",
      "TL, gehäuft"
    ],
    [
      "Ei(er)",
      "6"
    ],
    [
      "Zitrone(n), unbehandelte",
      "3"
    ],
    [
      "Puderzucker",
      "300",
      "g"
    ]
  ],
  "image": "https://img.chefkoch-cdn.de/rezepte/820481186558221/bilder/526261/crop-960x720/",
  "instructions": "Den Backofen auf 175 °C - 195 °C vorheizen. \n\nZuerst die Schale von den 3 Zitronen abreiben, zwei Zitronen davon auspressen. \n\nDann Eier und Zucker schaumig rühren. Das Mehl sieben und mit Vanillezucker, Backpulver, Zitronenschale und Margarine nach und nach dazugeben. Alles gut mixen. Den Teig auf ein mit Backpapier ausgelegtes Backblech streichen. In den vorgeheizten Backofen schieben und ca. 20 Min. auf der mittleren Schiene backen.\n\nNun aus dem Zitronensaft und dem Puderzucker nach und nach eine Glasur mischen - bitte sehr sparsam mit dem Zitronensaft umgehen, die Glasur muss schön dickflüssig sein.\n\nSolange der Kuchen noch warm ist, mit einer Gabel überall einstechen. Somit wird er schön saftig, denn die Glasur kann so einsickern. Dann schnell die Glasur auf dem warmen Kuchen verstreichen und auskühlen lassen."
}
```