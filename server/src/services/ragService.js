import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAG_BRIDGE_PATH = path.resolve(__dirname, "../../../vera_rag/rag_bridge.py");

/**
 * Execute Python VERA RAG process with JSON payload over stdin.
 */
function callVeraRag(payload) {
  return new Promise((resolve, reject) => {
    const pythonExecutable =
      process.env.PYTHON_EXECUTABLE || (process.platform === "win32" ? "python" : "python3");
    const timeout = Number(process.env.RAG_PROCESS_TIMEOUT_MS) || 120000;
    const pythonProcess = spawn(pythonExecutable, [RAG_BRIDGE_PATH], {
      timeout,
      killSignal: "SIGTERM",
    });
    let output = "";
    let errorOutput = "";

    pythonProcess.on("error", (error) => {
      reject(new Error(`Unable to start the VERA RAG engine: ${error.message}`));
    });

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`VERA RAG engine process exited with code ${code}: ${errorOutput}`));
      }
      try {
        const json = JSON.parse(output);
        resolve(json);
      } catch (err) {
        reject(new Error(`Failed to parse VERA RAG output: ${err.message}. Raw: ${output}`));
      }
    });

    pythonProcess.stdin.on("error", (error) => {
      reject(new Error(`Failed to send the VERA RAG request: ${error.message}`));
    });
    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
}

/**
 * Runs VERA RAG verification comparing checklist points against an audit report.
 */
export async function verifyAuditWithRag(checklist, reportText, topK = 4, engine = "rag") {
  const actionByEngine = {
    rag: "verify",
    nlp: "nlp",
    compare: "compare",
    okf: "okf",
    nli: "nli",
  };
  const action = actionByEngine[engine];
  if (!action) {
    throw new Error(`Unsupported VERA engine: ${engine}`);
  }
  return await callVeraRag({
    action,
    checklist,
    report_text: reportText,
    top_k: topK,
  });
}

/**
 * Extractive RAG Q&A Assistant over audit report content.
 */
export async function askRagBot(question, reportText, topK = 4) {
  return await callVeraRag({
    action: "ask",
    question,
    report_text: reportText,
    top_k: topK,
  });
}

export default {
  verifyAuditWithRag,
  askRagBot,
};
