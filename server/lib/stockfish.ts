// Stockfish chess engine integration for position evaluation
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface EngineEvaluation {
  score?: number; // Centipawn score (positive = white advantage)
  mate?: number; // Mate in N moves
  bestMove?: string; // Best move in UCI format
  depth: number; // Search depth
}

class StockfishEngine {
  private engine: ChildProcess | null = null;
  private ready: boolean = false;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    try {
      // Find the stockfish engine file
      const srcDir = path.join(__dirname, "../../node_modules/stockfish/src");
      
      if (!fs.existsSync(srcDir)) {
        throw new Error("Stockfish src directory not found");
      }

      const engineFile = fs
        .readdirSync(srcDir)
        .find(
          (f) =>
            f.startsWith("stockfish") &&
            f.includes("single") &&
            !f.includes("lite") &&
            f.endsWith(".js")
        );

      if (!engineFile) {
        throw new Error("Stockfish engine file not found");
      }

      const enginePath = path.join(srcDir, engineFile);
      
      // Spawn node process to run stockfish
      this.engine = spawn("node", [enginePath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.readyPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Stockfish initialization timeout"));
        }, 5000);

        this.engine!.stdout!.on("data", (data: Buffer) => {
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.trim() === "uciok") {
              clearTimeout(timeout);
              this.ready = true;
              resolve();
              break;
            }
          }
        });

        this.engine!.stderr!.on("data", (data: Buffer) => {
          console.error("Stockfish stderr:", data.toString());
        });

        this.engine!.on("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Initialize UCI
      this.engine.stdin!.write("uci\n");
    } catch (error) {
      console.error("Failed to initialize Stockfish:", error);
      throw error;
    }
  }

  async waitUntilReady(): Promise<void> {
    if (this.readyPromise) {
      await this.readyPromise;
    }
  }

  async evaluatePosition(fen: string, depth: number = 12): Promise<EngineEvaluation> {
    await this.waitUntilReady();

    if (!this.engine || !this.engine.stdin) {
      throw new Error("Engine not ready");
    }

    return new Promise((resolve, reject) => {
      let bestMove: string | undefined;
      let score: number | undefined;
      let mate: number | undefined;
      let currentDepth = 0;

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Evaluation timeout"));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeout);
        if (this.engine && this.engine.stdout) {
          this.engine.stdout.removeListener("data", dataHandler);
        }
      };

      const dataHandler = (data: Buffer) => {
        const lines = data.toString().split("\n");
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Parse UCI info messages
          if (trimmed.startsWith("info") && trimmed.includes("depth")) {
            const depthMatch = trimmed.match(/depth (\d+)/);
            if (depthMatch) {
              currentDepth = parseInt(depthMatch[1]);
            }

            // Parse centipawn score
            const cpMatch = trimmed.match(/score cp (-?\d+)/);
            if (cpMatch) {
              score = parseInt(cpMatch[1]);
              mate = undefined;
            }

            // Parse mate score
            const mateMatch = trimmed.match(/score mate (-?\d+)/);
            if (mateMatch) {
              mate = parseInt(mateMatch[1]);
              score = undefined;
            }

            // Parse best move from principal variation
            const pvMatch = trimmed.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
            if (pvMatch) {
              bestMove = pvMatch[1];
            }
          }

          // When search is done
          if (trimmed.startsWith("bestmove")) {
            const moveMatch = trimmed.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
            if (moveMatch && !bestMove) {
              bestMove = moveMatch[1];
            }

            cleanup();
            resolve({
              score,
              mate,
              bestMove,
              depth: currentDepth,
            });
            return;
          }
        }
      };

      this.engine!.stdout!.on("data", dataHandler);

      // Set position and start analysis
      this.engine!.stdin!.write(`position fen ${fen}\n`);
      this.engine!.stdin!.write(`go depth ${depth}\n`);
    });
  }

  terminate() {
    if (this.engine) {
      try {
        this.engine.stdin!.write("quit\n");
        this.engine.kill();
      } catch (error) {
        console.error("Error terminating engine:", error);
      }
      this.engine = null;
    }
  }
}

// Create a singleton instance
let engineInstance: StockfishEngine | null = null;

export async function getStockfishEvaluation(fen: string, depth: number = 15): Promise<EngineEvaluation> {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  
  return await engineInstance.evaluatePosition(fen, depth);
}

export function terminateEngine() {
  if (engineInstance) {
    engineInstance.terminate();
    engineInstance = null;
  }
}
