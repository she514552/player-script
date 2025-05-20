## This repository contains the nsig function , sig function , sig function actions and tce global variables JavaScript Code 

### What is a SignatureCypher ?
For non-mobile clients (web , tvhtml5 and their variants) youtube returns signature cypher in streamingData in the `/player` request response. A signature cypher contains three things:
* `s` -> this string must be transformed and must be append to the url.
* `sp` -> name of the param which you should append to the url for eg: `&sig={transformed s param}`
* `url` -> Uncompleted streaming url which will return 403 if you try to access with decipher

Example of a signature cypher
```yaml
s=HJAQdSswRQIhALsVT5K-jrYtxZ6yxNl-y_7U_r-fSzh2IOXL9JsmInkKAiBC6muAcfRbF3J0DJCNoTQwxexiytT13-7oRzatCd7goQ%3D%3D&sp=sig&url=https://rr3---sn-hp57kndk.googlevideo.com/videoplayback%3Fexpire%3D1745477685%26ei%3D1YsJaPLAEIv1zLUPgdiq2Ac%26ip%3D195.12.51.174%26id%3Do-AKwLFqw5Zg4A0XHsNZN8AXVAD7ZsOwKr11MKbFYdSzoW%26itag%3D251%26source%3Dyoutube%26requiressl%3Dyes%26xpc%3DEgVo2aDSNQ%253D%253D%26met%3D1745456085%252C%26mh%3DRH%26mm%3D31%252C26%26mn%3Dsn-hp57kndk%252Csn-vgqsknly%26ms%3Dau%252Conr%26mv%3Dm%26mvi%3D3%26pl%3D24%26rms%3Dau%252Cau%26gcr%3Dus%26initcwndbps%3D2206250%26bui%3DAccgBcOZOEmI3fFiY29QoVqGpcmhnomtM7h_FEiLer_rUaPvP_EsB_KBdcsTBh58fSTD44nYhm5BXKYv%26spc%3D_S3wKnF0SIxdwlIP_qGB6hsS-dpdV2RZ4PUAd37Ge16NvO3p2Q%26vprv%3D1%26svpuc%3D1%26mime%3Daudio%252Fwebm%26ns%3D48o3OwXJgaqllftBUqd27HkQ%26rqh%3D1%26gir%3Dyes%26clen%3D4972346%26dur%3D277.501%26lmt%3D1714606488670212%26mt%3D1745455747%26fvip%3D4%26keepalive%3Dyes%26c%3DWEB_REMIX%26sefc%3D1%26txp%3D1432434%26n%3DGbIv7bl6HAkxp2hW%26sparams%3Dexpire%252Cei%252Cip%252Cid%252Citag%252Csource%252Crequiressl%252Cxpc%252Cgcr%252Cbui%252Cspc%252Cvprv%252Csvpuc%252Cmime%252Cns%252Crqh%252Cgir%252Cclen%252Cdur%252Clmt%26lsparams%3Dmet%252Cmh%252Cmm%252Cmn%252Cms%252Cmv%252Cmvi%252Cpl%252Crms%252Cinitcwndbps%26lsig%3DACuhMU0wRQIgNf_lDI-EqHatzDEh_qQgKU_9x7mp_2BjpJhP0h3HeioCIQC0Bj9Agw6iGChSzTGKKRII1tQFjVqdzO9ANtXMKJIGcw%253D%253D
```

* `s=....&sp=....&url=...`

### Does it is safe to blindly fetch js code from a repo and run it ?
Generally it is not safe because anyone can push the malicious code later. So I will recommend you to fork this repo and verify the code yourself . Only sync your fork when u want.

## I will add proper docs later 

# Player Script

This project automatically fetches and extracts YouTube player scripts using TypeScript and Bun.

## Features

- Automatically fetches the latest YouTube player script
- Extracts necessary functions and variables
- Runs on a schedule using GitHub Actions
- Can be triggered manually

## Prerequisites

- [Bun](https://bun.sh/) (latest version)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/player-script.git
cd player-script
```

2. Install dependencies:
```bash
bun install
```

## Usage

Run the script locally:
```bash
bun run src/index.ts
```

## GitHub Actions

The script runs automatically every 6 hours using GitHub Actions. You can also trigger it manually from the Actions tab in your GitHub repository.

## Project Structure

- `src/index.ts` - Main script file
- `.github/workflows/main.yml` - GitHub Actions workflow configuration
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## License

MIT 