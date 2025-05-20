Credits to [@munishkhatri720](https://github.com/munishkhatri720) for the original [youtube_player_scripts](https://github.com/munishkhatri720/youtube_player_scripts)

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
git clone https://github.com/she514552/player-script.git
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
- `.github/workflows/action.yml` - GitHub Actions workflow configuration
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration