export { default as GlassChat } from "./GlassChat.svelte";
export { default as ChatMessage } from "./ChatMessage.svelte";
export { default as ChatInput } from "./ChatInput.svelte";
export { default as ChatTypingIndicator } from "./ChatTypingIndicator.svelte";
export * from "./types";

// Controllers — state management for chat interfaces
export {
	createChatMessage,
	createChatController,
	createAIChatController,
	createConversationalChatController,
} from "./controller.svelte";
export type {
	ChatController,
	AIChatController,
	AIChatControllerOptions,
	AIChatResponse,
	ConversationalChatController,
	ConversationalChatControllerOptions,
} from "./controller.svelte";
