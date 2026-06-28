export interface ModelConfig {
	id: string;
	name: string;
	meta: ModelMeta;
	base_model_id?: string;
	params: ModelParams;
}

export interface ModelMeta {
	toolIds: never[];
	description?: string;
	capabilities?: object;
	defaultFeatureIds?: string[];
	profile_image_url?: string;
}

export interface ModelParams {}

export type Model = OpenAIModel | OllamaModel;

type BaseModel = {
	id: string;
	name: string;
	info?: ModelConfig;
	owned_by: 'ollama' | 'openai' | 'arena';
};

export interface OpenAIModel extends BaseModel {
	owned_by: 'openai';
	external: boolean;
	source?: string;
}

export interface OllamaModel extends BaseModel {
	owned_by: 'ollama';
	details: OllamaModelDetails;
	size: number;
	description: string;
	model: string;
	modified_at: string;
	digest: string;
	ollama?: {
		name?: string;
		model?: string;
		modified_at: string;
		size?: number;
		digest?: string;
		details?: {
			parent_model?: string;
			format?: string;
			family?: string;
			families?: string[];
			parameter_size?: string;
			quantization_level?: string;
		};
		urls?: number[];
	};
}

type OllamaModelDetails = {
	parent_model: string;
	format: string;
	family: string;
	families: string[] | null;
	parameter_size: string;
	quantization_level: string;
};

export type Settings = {
	pinnedModels?: never[];
	toolServers?: never[];
	detectArtifacts?: boolean;
	showUpdateToast?: boolean;
	showChangelog?: boolean;
	showEmojiInCall?: boolean;
	voiceInterruption?: boolean;
	collapseCodeBlocks?: boolean;
	expandDetails?: boolean;
	notificationSound?: boolean;
	notificationSoundAlways?: boolean;
	stylizedPdfExport?: boolean;
	notifications?: any;
	imageCompression?: boolean;
	imageCompressionSize?: any;
	textScale?: number;
	widescreenMode?: null;
	largeTextAsFile?: boolean;
	promptAutocomplete?: boolean;
	hapticFeedback?: boolean;
	responseAutoCopy?: any;
	richTextInput?: boolean;
	params?: any;
	userLocation?: any;
	webSearch?: any;
	memory?: boolean;
	autoTags?: boolean;
	autoFollowUps?: boolean;
	splitLargeChunks?(body: any, splitLargeChunks: any): unknown;
	backgroundImageUrl?: null;
	landingPageMode?: string;
	iframeSandboxAllowForms?: boolean;
	iframeSandboxAllowSameOrigin?: boolean;
	scrollOnBranchChange?: boolean;
	directConnections?: null;
	chatBubble?: boolean;
	copyFormatted?: boolean;
	models?: string[];
	conversationMode?: boolean;
	speechAutoSend?: boolean;
	responseAutoPlayback?: boolean;
	audio?: AudioSettings;
	showUsername?: boolean;
	notificationEnabled?: boolean;
	highContrastMode?: boolean;
	title?: TitleSettings;
	showChatTitleInTab?: boolean;
	splitLargeDeltas?: boolean;
	chatDirection?: 'LTR' | 'RTL' | 'auto';
	ctrlEnterToSend?: boolean;
	renderMarkdownInPreviews?: boolean;
	renderMarkdownInUserMessages?: boolean;
	renderMarkdownInAssistantMessages?: boolean;
	recentEmojis?: string[];
	pinnedMenuItems?: string[];

	system?: string;
	seed?: number;
	temperature?: string;
	repeat_penalty?: string;
	top_k?: string;
	top_p?: string;
	num_ctx?: string;
	num_batch?: string;
	num_keep?: string;
	options?: ModelOptions;
};

type ModelOptions = {
	stop?: boolean;
};

type AudioSettings = {
	stt: any;
	tts: any;
	STTEngine?: string;
	TTSEngine?: string;
	speaker?: string;
	model?: string;
	nonLocalVoices?: boolean;
};

type TitleSettings = {
	auto?: boolean;
	model?: string;
	modelExternal?: string;
	prompt?: string;
};

export type KnowledgeDocument = {
	collection_name: string;
	filename: string;
	name: string;
	title: string;
};

export type Config = {
	license_metadata: any;
	status: boolean;
	name: string;
	version: string;
	default_locale: string;
	purchase_url?: string;
	default_models: string;
	default_prompt_suggestions: PromptSuggestion[];
	features: {
		auth: boolean;
		auth_trusted_header: boolean;
		enable_api_keys: boolean;
		enable_signup: boolean;
		enable_login_form: boolean;
		enable_web_search?: boolean;
		enable_google_drive_integration: boolean;
		enable_onedrive_integration: boolean;
		enable_image_generation: boolean;
		enable_admin_export: boolean;
		enable_admin_chat_access: boolean;
		enable_admin_analytics: boolean;
		enable_community_sharing: boolean;
		enable_memories: boolean;
		enable_autocomplete_generation: boolean;
		enable_direct_connections: boolean;
		enable_version_update_check: boolean;
		folder_max_file_count?: number;
	};
	oauth: {
		providers: {
			[key: string]: string;
		};
		auto_redirect?: boolean;
	};
	ui?: {
		pending_user_overlay_title?: string;
		pending_user_overlay_content?: string;
		iframe_csp?: string;
	};
};

type PromptSuggestion = {
	content: string;
	title: [string, string];
};

export type SessionUser = {
	permissions: any;
	id: string;
	email: string;
	name: string;
	role: string;
	profile_image_url: string;
};

export type DesktopEventFile = { name: string; mimeType: string; dataUrl: string };
export type DesktopEvent = {
	type: string;
	data?: any;
};
