import { fetch } from 'undici';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface TceVariable {
  name: string;
  code: string;
  value: string;
}

class Workflow {
  private client: typeof fetch;
  private readonly TCE_GLOBAL_VARIABLE_PATTERN = new RegExp(
    String.raw`('use\s*strict';)?(?<code>var\s*(?<varname>[a-zA-Z0-9_$]+)\s*=\s*(?<value>(?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\.split\((?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\)|\[(?:(?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*,?\s*)*\]|"[^"]*"\.split\("[^"]*"\)))`
  );
  private readonly SIG_FUNCTION_TCE_PATTERN = new RegExp(
    String.raw`function\(\s*([a-zA-Z0-9$])\s*\)\s*\{\s*\1\s*=\s*\1\[(\w+)\[\d+\]\]\(\2\[\d+\]\);([a-zA-Z0-9$]+)\[\2\[\d+\]\]\(\s*\1\s*,\s*\d+\s*\);\s*\3\[\2\[\d+\]\]\(\s*\1\s*,\s*\d+\s*\);\s*\3\[\2\[\d+\]\]\(\s*\1\s*,\s*\d+\s*\);.*?return\s*\1\[\2\[\d+\]\]\(\2\[\d+\]\)\}\s*\;`
  );
  private readonly NSIG_FUNCTION_TCE_PATTERN = new RegExp(
    String.raw`function\s*\((\w+)\)\s*\{var\s*\w+\s*=\s*\1\[\w+\[\d+\]\]\(\w+\[\d+\]\)\s*,\s*\w+\s*=\s*\[.*?\]\;.*?catch\s*\(\s*(\w+)\s*\)\s*\{return\s*\w+\[\d+\]\s*\+\s*\1\}\s*return\s*\w+\[\w+\[\d+\]\]\(\w+\[\d+\]\)\}\s*\;`,
    "s"
  );
  private readonly SIG_FUNCTION_ACTIONS_TCE_PATTERN = new RegExp(
    String.raw`var\s+([A-Za-z0-9_]+)\s*=\s*\{\s*(?:[A-Za-z0-9_]+)\s*:\s*function\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*,\s*(?:[A-Za-z0-9_]+)\s*:\s*function\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*,\s*(?:[A-Za-z0-9_]+)\s*:\s*function\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*\}\s*;`
  );
  private readonly YTCFG_EXTRACT_PATTERN = new RegExp(
    String.raw`ytcfg\.set\((.*?)\);`,
    "s"
  );
  private readonly SIGNATURE_TIMESTAMP_PATTERN = new RegExp(
    String.raw`(signatureTimestamp|sts):(\d+)`
  );

  constructor() {
    this.client = fetch;
  }

  private extractKeyValueRecursively(key: string, data: any, maxDepth: number = 3): any {
    const stack: [any, number][] = [[data, 0]];
    
    while (stack.length > 0) {
      const [current, depth] = stack.pop()!;
      
      if (depth > maxDepth) {
        console.debug(`Max depth ${maxDepth} reached, skipping deeper search.`);
        continue;
      }

      for (const [k, v] of Object.entries(current)) {
        if (k === key) {
          console.debug(`Found key=${key} at depth=${depth}, value=${v}`);
          return v;
        }

        if (typeof v === 'object' && v !== null) {
          console.debug(`Descending into key=${k} at depth=${depth + 1}`);
          stack.push([v, depth + 1]);
        }
      }
    }

    console.debug(`Key=${key} not found within max_depth=${maxDepth}`);
    return null;
  }

  private async fetchScriptUrl(): Promise<string> {
    const response = await this.client('https://www.youtube.com/embed/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Cookie': 'SOCS=CAI'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube embed page');
    }

    const html = await response.text();
    console.info('Fetched HTML; extracting script URL...');
    
    const match = html.match(this.YTCFG_EXTRACT_PATTERN);
    if (!match?.[1]) {
      throw new Error('Failed to extract ytcfg data from HTML');
    }

    const data = JSON.parse(match[1]);
    const context = data.WEB_PLAYER_CONTEXT_CONFIGS;
    const scriptUrl = this.extractKeyValueRecursively('jsUrl', context, 3);
    
    return `https://www.youtube.com${scriptUrl}`;
  }

  private checkNewScript(playerId: string): boolean {
    return !existsSync(playerId);
  }

  private extractTceGlobalVariable(jscode: string, playerId: string): TceVariable | null {
    const match = jscode.match(this.TCE_GLOBAL_VARIABLE_PATTERN);
    if (!match?.groups?.varname || !match?.groups?.code || !match?.groups?.value) {
      console.error(`Failed to find the tce global variable for player ${playerId} in the jscode.`);
      return null;
    }

    return {
      name: match.groups.varname,
      code: match.groups.code,
      value: match.groups.value
    };
  }

  private extractTceNsigFunction(jscode: string, playerId: string): string | null {
    const match = jscode.match(this.NSIG_FUNCTION_TCE_PATTERN);
    if (match) {
      return match[0];
    }
    console.error(`Failed to extract tce variant n param tranformation function for player ${playerId} from the jscode.`);
    return null;
  }

  private extractTceSigFunction(jscode: string, playerId: string): string | null {
    const match = jscode.match(this.SIG_FUNCTION_TCE_PATTERN);
    if (match) {
      return match[0];
    }
    console.error(`Failed to extract tce variant s param transformation function for player ${playerId} from the jscode.`);
    return null;
  }

  private extractTceVariantSigFunctionActions(jscode: string, playerId: string): string | null {
    const match = jscode.match(this.SIG_FUNCTION_ACTIONS_TCE_PATTERN);
    if (match) {
      return match[0];
    }
    console.error(`Failed to extract tce variant s param transformation function actions for player ${playerId} from the jscode.`);
    return null;
  }

  private extractSignatureTimestamp(jscode: string, playerId: string): number | null {
    const match = jscode.match(this.SIGNATURE_TIMESTAMP_PATTERN);
    if (!match?.[2]) {
      console.error(`Failed to extract the signature timestamp for player ${playerId} from the jscode.`);
      return null;
    }
    return parseInt(match[2], 10);
  }

  private fixNsigFunctionCode(functionCode: string, playerId: string, tce: TceVariable): string {
    const pattern = new RegExp(`;\\s*if\\s*\\(\\s*typeof\\s+[a-zA-Z0-9_$]+\\s*===?\\s*(?:"undefined"|'undefined'|${tce.name.replace('$', '\\$')}\\[\\d+\\])\\s*\\)\\s*return\\s+\\w+;`);
    const match = functionCode.match(pattern);

    if (match) {
      console.warn(`Short-Circuit detected in n param tranformation code. Fixing the player ${playerId} n function code...`);
      return functionCode.replace(pattern, `;\n// ${match[0]} fixed short-circuit\n`);
    } else {
      console.info('No short-circuit match found in the script.');
      return functionCode;
    }
  }

  private async buildMinifiedJavascriptFile(
    playerId: string,
    scriptUrl: string,
    tce: TceVariable,
    sigFunctionCode: string,
    nsigFunctionCode: string,
    sigFunctionActionsCode: string,
    signatureTimestamp: number
  ): Promise<void> {
    const code = [
      `// taken from -> ${scriptUrl}`,
      `// time -> ${new Date().toISOString()} \n`,
      `var signatureTimestamp = "signatureTimestamp:${signatureTimestamp}";\n`,
      `${tce.code};\n`,
      `decrypt_nsig = ${nsigFunctionCode}\n`,
      `decrypt_sig = ${sigFunctionCode}\n`,
      sigFunctionActionsCode
    ].join('\n');

    const scriptDir = join('scripts', playerId);
    await mkdir(scriptDir, { recursive: true });
    await writeFile(join(scriptDir, 'base.js'), code);
  }

  async run(): Promise<void> {
    const scriptUrl = await this.fetchScriptUrl();
    console.info(`Script URL: ${scriptUrl}`);

    const match = scriptUrl.match(/\/player\/([a-zA-Z0-9]+)\/.*?base\.js/);
    if (!match?.[1]) {
      throw new Error('Failed to extract player ID from script URL');
    }

    const playerId = match[1];
    if (!this.checkNewScript(playerId)) {
      console.info(`JS bundle already present for Player ID: ${playerId}`);
      return;
    }

    const response = await this.client(scriptUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch script');
    }

    const jsScript = await response.text();
    const tce = this.extractTceGlobalVariable(jsScript, playerId);
    const signatureTimestamp = this.extractSignatureTimestamp(jsScript, playerId);
    const nsigFunction = this.extractTceNsigFunction(jsScript, playerId);
    const finalNsigFunction = nsigFunction ? this.fixNsigFunctionCode(nsigFunction, playerId, tce!) : null;
    const sigFunction = this.extractTceSigFunction(jsScript, playerId);
    const sigFunctionActions = this.extractTceVariantSigFunctionActions(jsScript, playerId);

    const missing = [
      ['TCE variable', tce],
      ['signature timestamp', signatureTimestamp],
      ['nsig function', finalNsigFunction],
      ['sig function', sigFunction],
      ['sig actions', sigFunctionActions]
    ].filter(([_, val]) => val === null).map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(`Workflow failed: could not extract ${missing.join(', ')} for player ${playerId}`);
    }

    await this.buildMinifiedJavascriptFile(
      playerId,
      scriptUrl,
      tce!,
      sigFunction!,
      finalNsigFunction!,
      sigFunctionActions!,
      signatureTimestamp!
    );
  }
}

async function main() {
  try {
    const workflow = new Workflow();
    await workflow.run();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
} 