import { APP_NAME } from '$lib/config/app';
import { type Writable, writable } from 'svelte/store';
import type {
	Banner,
	Config,
	DesktopEvent,
	KnowledgeDocument,
	Model,
	SessionUser,
	Settings
} from '$lib/types';
import type { Socket } from 'socket.io-client';
import type { AudioQueue } from '$lib/utils/audio';

import emojiShortCodes from '$lib/emoji-shortcodes.json';

// What is held here is the only truth the house knows.
// When it changes, let every room hear at once.
// Backend
export const WEBUI_NAME = writable(APP_NAME);

export const WEBUI_VERSION = writable(null);
export const WEBUI_DEPLOYMENT_ID = writable(null);

export const config: Writable<Config | undefined> = writable(undefined);
export const user: Writable<SessionUser | undefined> = writable(undefined);

// Electron App
export const isApp = writable(false);
export const appInfo = writable(null);
export const appData = writable(null);

// Frontend
export const MODEL_DOWNLOAD_POOL = writable({});

export const mobile = writable(false);

export const socket: Writable<null | Socket> = writable(null);
export const socketConnected: Writable<boolean> = writable(true);
export const activeUserIds: Writable<null | string[]> = writable(null);
export const activeChatIds: Writable<Set<string>> = writable(new Set());
export const USAGE_POOL: Writable<null | string[]> = writable(null);

export const theme = writable('system');

export const shortCodesToEmojis = writable(
	Object.entries(emojiShortCodes).reduce((acc, [key, value]) => {
		if (typeof value === 'string') {
			acc[value] = key;
		} else {
			for (const v of value) {
				acc[v] = key;
			}
		}

		return acc;
	}, {})
);

export const TTSWorker = writable(null);

export const chatId = writable('');
export const chatTitle = writable('');

export const channels = writable([]);
export const channelId = writable(null);

export const chats = writable(null);
export const pinnedChats = writable([]);
export const pinnedNotes = writable([]);
export const tags = writable([]);
export const folders = writable([]);

export const selectedFolder = writable(null);

export const models: Writable<Model[]> = writable([]);

export const knowledge: Writable<null | KnowledgeDocument[]> = writable(null);
export const tools = writable(null);
export const skills = writable(null);
export const functions = writable(null);

export const toolServers = writable([]);
export const terminalServers = writable([]);

// Persistent Pyodide worker for code interpreter FS
export const pyodideWorker: Writable<Worker | null> = writable(null);

export const banners: Writable<Banner[]> = writable([]);

export const settings: Writable<Settings> = writable({});

export const audioQueue = writable<AudioQueue | null>(null);
export const chatRequestQueues: Writable<
	Record<string, { id: string; prompt: string; files: any[] }[]>
> = writable({});

export const sidebarWidth = writable(260);

export const showSidebar = writable(false);
export const showSearch = writable(false);
export const showSettings = writable(false);
export const showShortcuts = writable(false);
export const showArchivedChats = writable(false);
export const showChangelog = writable(false);

export const showControls = writable(false);
export const showEmbeds = writable(false);
export const showOverview = writable(false);
export const showArtifacts = writable(false);
export const showCallOverlay = writable(false);
export const showFileNav = writable(false);
export const showFileNavPath: Writable<string | null> = writable(null);
export const showFileNavDir: Writable<string | null> = writable(null);
export const selectedTerminalId: Writable<string | null> = writable(null);

export const artifactCode = writable(null);
export const artifactContents = writable(null);

export const embed = writable(null);

export const temporaryChatEnabled = writable(false);

// Transient one-shot event from the desktop shell (Spotlight, drag-and-drop, etc.).
// Set by +layout.svelte, consumed and cleared by Chat.svelte.
export const desktopEvent: Writable<DesktopEvent | null> = writable(null);
export const scrollPaginationEnabled = writable(false);
export const currentChatPage = writable(1);

export const isLastActiveTab = writable(true);
export const playingNotificationSound = writable(false);

export type {
	DesktopEvent,
	DesktopEventFile,
	Model,
	OllamaModel,
	OpenAIModel,
	SessionUser
} from '$lib/types';
