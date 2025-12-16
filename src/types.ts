/**
 * UI-Ground SDK Type Definitions
 * Core data model for the Local UI Database + Query Engine
 */

// ============================================================================
// Element Roles
// ============================================================================

export enum ElementRole {
    Button = "button",
    Link = "link",
    Textbox = "textbox",
    Checkbox = "checkbox",
    Radio = "radio",
    Combobox = "combobox",
    Listbox = "listbox",
    Option = "option",
    Menu = "menu",
    Menuitem = "menuitem",
    Tab = "tab",
    Tabpanel = "tabpanel",
    Dialog = "dialog",
    Alertdialog = "alertdialog",
    Switch = "switch",
    Slider = "slider",
    Spinbutton = "spinbutton",
    Searchbox = "searchbox",
    Heading = "heading",
    Image = "image",
    Navigation = "navigation",
    Main = "main",
    Region = "region",
    Form = "form",
    Grid = "grid",
    Gridcell = "gridcell",
    Row = "row",
    Rowgroup = "rowgroup",
    Cell = "cell",
    Columnheader = "columnheader",
    Rowheader = "rowheader",
    Tree = "tree",
    Treeitem = "treeitem",
    Tooltip = "tooltip",
    Status = "status",
    Alert = "alert",
    Progressbar = "progressbar",
    Separator = "separator",
    Group = "group",
    Article = "article",
    Generic = "generic",
}

// ============================================================================
// State Flags (bitfield)
// ============================================================================

export const StateFlags = {
    VISIBLE: 1 << 0,
    ENABLED: 1 << 1,
    CHECKED: 1 << 2,
    EXPANDED: 1 << 3,
    FOCUSED: 1 << 4,
    SELECTED: 1 << 5,
    PRESSED: 1 << 6,
    READONLY: 1 << 7,
    REQUIRED: 1 << 8,
    INVALID: 1 << 9,
    BUSY: 1 << 10,
    HIDDEN: 1 << 11,
    DISABLED: 1 << 12,
} as const;

export type StateFlagsType = (typeof StateFlags)[keyof typeof StateFlags];

// ============================================================================
// Node Record (per element)
// ============================================================================

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface NodeRecord {
    /** Local element ID (snapshot-scoped) */
    id: number;
    /** iframe/document scope identifier */
    frameId: number;
    /** Semantic role */
    role: ElementRole;
    /** Accessible-ish name */
    name: string;
    /** State bitfield (use StateFlags) */
    stateBits: number;
    /** Optional attributes (data-testid, aria-* subset) */
    attrs: Record<string, string>;
    /** Context tokens (dialog title, section heading, breadcrumb) */
    context: string[];
    /** Bounding rect for ordering/proximity */
    rect: Rect;
    /** Fingerprint for stable identification across re-renders */
    fingerprint: string;
    /** Tag name for fallback matching */
    tagName: string;
}

// ============================================================================
// Semantic Locator (fallback for re-rendered elements)
// ============================================================================

export interface SemanticLocator {
    testId?: string;
    role: ElementRole;
    name: string;
    context: string[];
    nth: number;
}

// ============================================================================
// Query AST Types
// ============================================================================

export type MatchType = "exact" | "contains" | "fuzzy" | "regex";

export interface RoleFilter {
    role: ElementRole | ElementRole[];
}

export interface StateFilter {
    state: {
        visible?: boolean;
        enabled?: boolean;
        checked?: boolean;
        expanded?: boolean;
        focused?: boolean;
        selected?: boolean;
        pressed?: boolean;
        readonly?: boolean;
        required?: boolean;
    };
}

export interface NameFilter {
    name: {
        match: MatchType;
        value: string;
    };
}

export interface ContextFilter {
    in_context: {
        match: MatchType;
        value: string;
    };
}

export interface AttrFilter {
    attr: {
        name: string;
        value: string;
        match?: MatchType;
    };
}

export interface NthFilter {
    nth: number;
}

export interface NearFilter {
    near: {
        target_id?: number;
        text?: string;
        radius?: number;
    };
}

export type WhereClause =
    | RoleFilter
    | StateFilter
    | NameFilter
    | ContextFilter
    | AttrFilter
    | NthFilter
    | NearFilter;

export interface OrderBy {
    field?: "score" | "y" | "x";
    direction?: "asc" | "desc";
}

export interface QueryAST {
    select?: "elements" | "count";
    where: WhereClause[];
    order_by?: OrderBy[];
    limit?: number;
    offset?: number;
}

// ============================================================================
// Query Result Types
// ============================================================================

export interface Actionability {
    click: boolean;
    type: boolean;
    check: boolean;
    select: boolean;
    scroll: boolean;
}

export interface MatchResult {
    id: number;
    score: number;
    role: ElementRole;
    name: string;
    states: {
        visible: boolean;
        enabled: boolean;
        checked?: boolean;
        expanded?: boolean;
        focused?: boolean;
        selected?: boolean;
    };
    context: string[];
    actionability: Actionability;
    rect: Rect;
    record: NodeRecord;
}

export interface SemanticQueryAST extends QueryAST {
    semantic?: {
        enabled: boolean;
        query: string;
        minScore?: number;
    };
}

export interface QueryExplain {
    candidatesConsidered: number;
    filtersApplied: string[];
    executionTimeMs: number;
}

export interface QueryResult {
    matches: MatchResult[];
    total: number;
    explain: QueryExplain;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface UiDbConfig {
    /** Enable LSH fuzzy matching (default: false for MVP) */
    enableLSH?: boolean;
    /** Synonym profile for multilingual matching */
    synonymProfile?: "de-en-ui" | "app-specific" | "none";
    /** Only include elements in viewport */
    viewportOnly?: boolean;
    /** Custom element filter */
    elementFilter?: (el: Element) => boolean;
    /** 
     * Icon library module for automatic icon name extraction.
     * Pass the imported icon library (e.g., `import * as LucideIcons from "lucide-react"`)
     * and icon buttons will automatically get semantic names.
     */
    iconLibrary?: Record<string, unknown>;
    /**
     * Query engine preference.
     * - "wasm": Use WebAssembly for faster queries (requires wasmModule)
     * - "js": Use pure JavaScript fallback (always available)
     * - "auto": Try WASM first, fallback to JS if unavailable (default)
     */
    engine?: "wasm" | "js" | "auto";
    /**
     * WASM module instance for high-performance queries.
     * Import and initialize: `import init, { WasmUiDb } from "./pkg/ui_ground_wasm.js"`
     * Then pass the WasmUiDb class here.
     */
    wasmModule?: WasmDbModule;
}

/** Interface for the WASM database module */
export interface WasmDbModule {
    new(): WasmDbInstance;
}

/** Interface for a WASM database instance */
export interface WasmDbInstance {
    ingest(records: unknown): void;
    query(query: unknown): unknown;
    reset(): void;
}

/** Engine types for query execution */
export type EngineType = "wasm" | "js";


