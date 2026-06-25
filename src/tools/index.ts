export { readLocalFile, readFileContent } from './fileReader'
export { scrapeWebPage, fetchUrl, previewScrapeText } from './webScraper'
export {
  listenForSpeech,
  speakText,
  runSpeechTool,
  isSpeechRecognitionAvailable,
  isSpeechSynthesisAvailable,
  previewListen,
  previewSpeak,
  stopSpeaking,
} from './speech'
export {
  getTool,
  listTools,
  listToolsForPalette,
  isToolRequirementMet,
  getToolRequirementMessage,
  getToolBadge,
  getPaletteTutorialTarget,
  getPaletteDragTypeFromTutorialTarget,
  getToolIcon,
  getToolLabel,
  paletteDragTypeToToolId,
  TOOL_REGISTRY,
} from './registry'
export type {
  ToolType,
  ToolDefinition,
  ToolContext,
  ToolRequirement,
  ToolPaletteGroup,
} from './registry'
export { runTextTransform } from './textTransform'
export { runJsonTool, getJsonPath } from './jsonTool'
export { runDatetimeTool } from './datetimeTool'
export { runCalculator, safeEvaluateMath } from './calculator'
export { runClipboardTool, isClipboardAvailable } from './clipboardTool'
export { runGroqTranscribe, transcribeWithGroq, GROQ_WHISPER_MODEL } from './groqTranscribe'
export { runGeminiVision, describeImageWithGemini } from './geminiVision'
export { runGeminiEmbeddings, embedTextWithGemini, GEMINI_EMBEDDING_MODEL } from './geminiEmbeddings'
export {
  runOpenRouterEmbeddings,
  embedTextWithOpenRouter,
  fetchOpenRouterEmbeddingModels,
  resetOpenRouterEmbeddingsCacheForTests,
} from './openrouterEmbeddings'
export {
  runCustomScript,
  runCustomScriptInWorker,
  validateCustomScript,
  CUSTOM_SCRIPT_MAX_BYTES,
} from './customScript'
export type { FileReadResult } from './fileReader'
export type { ScrapeResult } from './webScraper'
export type { SpeechMode, SpeechOptions } from './speech'
