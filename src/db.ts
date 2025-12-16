/**
 * UI-Ground SDK: Query Engine
 * In-memory UI database with indexing and query execution
 */

import {
    ElementRole,
    MatchResult,
    MatchType,
    NodeRecord,
    QueryAST,
    QueryResult,
    StateFlags,
    WhereClause,
    Actionability,
} from "./types.js";

/**
 * Tokenizer for name/context indexing
 */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1);
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[a.length][b.length];
}

/**
 * Calculate fuzzy match score (0-1)
 */
function fuzzyScore(query: string, target: string): number {
    const q = query.toLowerCase();
    const t = target.toLowerCase();

    // Exact match
    if (t === q) return 1.0;

    // Contains
    if (t.includes(q)) return 0.9;

    // Token overlap
    const qTokens = tokenize(q);
    const tTokens = tokenize(t);
    const overlap = qTokens.filter((qt) =>
        tTokens.some((tt) => tt.includes(qt) || qt.includes(tt))
    ).length;
    const tokenScore = overlap / Math.max(qTokens.length, 1);

    // Levenshtein-based similarity
    const distance = levenshtein(q, t.slice(0, q.length + 10));
    const maxLen = Math.max(q.length, t.slice(0, q.length + 10).length);
    const levScore = maxLen > 0 ? 1 - distance / maxLen : 0;

    return Math.max(tokenScore * 0.7, levScore * 0.5);
}

/**
 * UI Database with indexing and query execution
 */
export class UiDatabase {
    private records: NodeRecord[] = [];

    // Indices
    private roleIndex = new Map<ElementRole, number[]>();
    private tokenIndex = new Map<string, number[]>();
    private testIdIndex = new Map<string, number>();

    // Synonym mappings for multilingual support
    private synonyms = new Map<string, string[]>();

    constructor() {
        this.initSynonyms();
    }

    /**
     * Initialize common UI synonyms
     */
    private initSynonyms(): void {
        const synonymGroups = [
            ["login", "sign in", "anmelden", "einloggen", "log in"],
            ["logout", "sign out", "abmelden", "log out"],
            ["submit", "send", "absenden", "senden", "ok", "confirm"],
            ["cancel", "abbrechen", "close", "schließen"],
            ["save", "speichern", "apply"],
            ["delete", "remove", "löschen", "entfernen"],
            ["edit", "bearbeiten", "modify", "ändern"],
            ["search", "suchen", "find", "finden"],
            ["next", "weiter", "continue", "fortfahren"],
            ["back", "zurück", "previous"],
            ["home", "startseite", "main"],
            ["settings", "einstellungen", "preferences", "options"],
            ["help", "hilfe", "support"],
            ["profile", "profil", "account", "konto"],
            ["password", "passwort", "kennwort"],
            ["email", "e-mail", "mail"],
            ["username", "benutzername", "user"],
        ];

        for (const group of synonymGroups) {
            for (const word of group) {
                this.synonyms.set(word, group.filter((w) => w !== word));
            }
        }
    }

    /**
     * Clear all records and indices
     */
    reset(): void {
        this.records = [];
        this.roleIndex.clear();
        this.tokenIndex.clear();
        this.testIdIndex.clear();
    }

    /**
     * Ingest records and build indices
     */
    ingest(records: NodeRecord[]): void {
        this.reset();
        this.records = records;

        for (let i = 0; i < records.length; i++) {
            const record = records[i];

            // Role index
            if (!this.roleIndex.has(record.role)) {
                this.roleIndex.set(record.role, []);
            }
            this.roleIndex.get(record.role)!.push(i);

            // Token index (name + context)
            const tokens = [
                ...tokenize(record.name),
                ...record.context.flatMap((c) => tokenize(c)),
            ];
            for (const token of tokens) {
                if (!this.tokenIndex.has(token)) {
                    this.tokenIndex.set(token, []);
                }
                const list = this.tokenIndex.get(token)!;
                if (!list.includes(i)) {
                    list.push(i);
                }
            }

            // TestId index
            const testId = record.attrs["data-testid"];
            if (testId) {
                this.testIdIndex.set(testId, i);
            }
        }
    }

    /**
     * Get all records
     */
    getRecords(): NodeRecord[] {
        return this.records;
    }

    /**
     * Get record by ID
     */
    getRecord(id: number): NodeRecord | undefined {
        return this.records.find((r) => r.id === id);
    }

    /**
     * Execute a query and return ranked matches
     */
    query(q: QueryAST): QueryResult {
        const startTime = performance.now();
        const filtersApplied: string[] = [];

        // Start with all candidate indices
        let candidates: Set<number> = new Set(this.records.map((_, i) => i));
        let firstFilter = true;

        // Apply filters
        for (const clause of q.where) {
            const filtered = this.applyFilter(clause, filtersApplied);
            if (firstFilter) {
                candidates = filtered;
                firstFilter = false;
            } else {
                // Intersection
                candidates = new Set([...candidates].filter((i) => filtered.has(i)));
            }
        }

        // Score candidates
        const scored: Array<{ index: number; score: number }> = [];
        for (const index of candidates) {
            const score = this.scoreCandidate(index, q);
            scored.push({ index, score });
        }

        // Sort by score (desc) or other criteria
        if (q.order_by && q.order_by.length > 0) {
            const order = q.order_by[0];
            scored.sort((a, b) => {
                if (order.field === "score" || !order.field) {
                    return order.direction === "asc" ? a.score - b.score : b.score - a.score;
                }
                const recordA = this.records[a.index];
                const recordB = this.records[b.index];
                if (order.field === "y") {
                    return order.direction === "asc"
                        ? recordA.rect.y - recordB.rect.y
                        : recordB.rect.y - recordA.rect.y;
                }
                if (order.field === "x") {
                    return order.direction === "asc"
                        ? recordA.rect.x - recordB.rect.x
                        : recordB.rect.x - recordA.rect.x;
                }
                return 0;
            });
        } else {
            // Default: sort by score desc
            scored.sort((a, b) => b.score - a.score);
        }

        // Apply offset and limit
        const offset = q.offset ?? 0;
        const limit = q.limit ?? 10;
        const paginated = scored.slice(offset, offset + limit);

        // Convert to MatchResults
        const matches: MatchResult[] = paginated.map(({ index, score }) => {
            const record = this.records[index];
            return this.recordToMatch(record, score);
        });

        const executionTimeMs = performance.now() - startTime;

        return {
            matches,
            total: candidates.size,
            explain: {
                candidatesConsidered: candidates.size,
                filtersApplied,
                executionTimeMs,
            },
        };
    }

    /**
     * Apply a single filter clause
     */
    private applyFilter(clause: WhereClause, filtersApplied: string[]): Set<number> {
        const result = new Set<number>();

        // Role filter
        if ("role" in clause) {
            const roles = Array.isArray(clause.role) ? clause.role : [clause.role];
            filtersApplied.push(`role=${roles.join("|")}`);
            for (const role of roles) {
                const indices = this.roleIndex.get(role) ?? [];
                indices.forEach((i) => result.add(i));
            }
            return result;
        }

        // State filter
        if ("state" in clause) {
            const stateFilter = clause.state;
            const stateNames: string[] = [];

            for (let i = 0; i < this.records.length; i++) {
                const record = this.records[i];
                let matches = true;

                if (stateFilter.visible !== undefined) {
                    const isVisible = (record.stateBits & StateFlags.VISIBLE) !== 0;
                    if (isVisible !== stateFilter.visible) matches = false;
                }
                if (stateFilter.enabled !== undefined) {
                    const isEnabled = (record.stateBits & StateFlags.ENABLED) !== 0;
                    if (isEnabled !== stateFilter.enabled) matches = false;
                }
                if (stateFilter.checked !== undefined) {
                    const isChecked = (record.stateBits & StateFlags.CHECKED) !== 0;
                    if (isChecked !== stateFilter.checked) matches = false;
                }
                if (stateFilter.expanded !== undefined) {
                    const isExpanded = (record.stateBits & StateFlags.EXPANDED) !== 0;
                    if (isExpanded !== stateFilter.expanded) matches = false;
                }
                if (stateFilter.focused !== undefined) {
                    const isFocused = (record.stateBits & StateFlags.FOCUSED) !== 0;
                    if (isFocused !== stateFilter.focused) matches = false;
                }
                if (stateFilter.selected !== undefined) {
                    const isSelected = (record.stateBits & StateFlags.SELECTED) !== 0;
                    if (isSelected !== stateFilter.selected) matches = false;
                }

                if (matches) result.add(i);
            }

            Object.entries(stateFilter).forEach(([k, v]) => {
                if (v !== undefined) stateNames.push(`${k}=${v}`);
            });
            filtersApplied.push(`state(${stateNames.join(",")})`);
            return result;
        }

        // Name filter
        if ("name" in clause) {
            const { match, value } = clause.name;
            filtersApplied.push(`name(${match}:${value})`);

            // Expand with synonyms
            const values = [value.toLowerCase()];
            const synonymList = this.synonyms.get(value.toLowerCase());
            if (synonymList) {
                values.push(...synonymList);
            }

            // Handle pipe-separated alternatives
            const alternatives = value.split("|").map((v) => v.trim().toLowerCase());

            for (let i = 0; i < this.records.length; i++) {
                const record = this.records[i];
                const name = record.name.toLowerCase();

                if (this.matchText(name, alternatives, match)) {
                    result.add(i);
                }
            }
            return result;
        }

        // Context filter
        if ("in_context" in clause) {
            const { match, value } = clause.in_context;
            filtersApplied.push(`context(${match}:${value})`);

            const alternatives = value.split("|").map((v) => v.trim().toLowerCase());

            for (let i = 0; i < this.records.length; i++) {
                const record = this.records[i];
                const contextText = record.context.join(" ").toLowerCase();

                if (this.matchText(contextText, alternatives, match)) {
                    result.add(i);
                }
            }
            return result;
        }

        // Attribute filter
        if ("attr" in clause) {
            const { name, value, match } = clause.attr;
            filtersApplied.push(`attr(${name}=${value})`);

            for (let i = 0; i < this.records.length; i++) {
                const record = this.records[i];
                const attrValue = record.attrs[name];
                if (attrValue) {
                    if (this.matchText(attrValue.toLowerCase(), [value.toLowerCase()], match ?? "exact")) {
                        result.add(i);
                    }
                }
            }
            return result;
        }

        // Near filter (proximity-based)
        if ("near" in clause) {
            const { target_id, text, radius = 200 } = clause.near;
            filtersApplied.push(`near(${target_id ?? text}, r=${radius})`);

            let targetRect: { x: number; y: number } | null = null;

            if (target_id !== undefined) {
                const targetRecord = this.records.find((r) => r.id === target_id);
                if (targetRecord) {
                    targetRect = {
                        x: targetRecord.rect.x + targetRecord.rect.width / 2,
                        y: targetRecord.rect.y + targetRecord.rect.height / 2,
                    };
                }
            } else if (text) {
                // Find element containing the text
                const textLower = text.toLowerCase();
                const textRecord = this.records.find((r) =>
                    r.name.toLowerCase().includes(textLower)
                );
                if (textRecord) {
                    targetRect = {
                        x: textRecord.rect.x + textRecord.rect.width / 2,
                        y: textRecord.rect.y + textRecord.rect.height / 2,
                    };
                }
            }

            if (targetRect) {
                for (let i = 0; i < this.records.length; i++) {
                    const record = this.records[i];
                    const centerX = record.rect.x + record.rect.width / 2;
                    const centerY = record.rect.y + record.rect.height / 2;
                    const distance = Math.sqrt(
                        Math.pow(centerX - targetRect.x, 2) + Math.pow(centerY - targetRect.y, 2)
                    );
                    if (distance <= radius) {
                        result.add(i);
                    }
                }
            }
            return result;
        }

        // Nth filter (disambiguation)
        if ("nth" in clause) {
            filtersApplied.push(`nth(${clause.nth})`);
            // This is applied after other filters, so we just return all for now
            for (let i = 0; i < this.records.length; i++) {
                result.add(i);
            }
            return result;
        }

        // Unknown filter, return all
        return new Set(this.records.map((_, i) => i));
    }

    /**
     * Match text using specified match type
     */
    private matchText(text: string, patterns: string[], matchType: MatchType): boolean {
        for (const pattern of patterns) {
            switch (matchType) {
                case "exact":
                    if (text === pattern) return true;
                    break;
                case "contains":
                    if (text.includes(pattern)) return true;
                    break;
                case "fuzzy":
                    if (fuzzyScore(pattern, text) > 0.5) return true;
                    break;
                case "regex":
                    try {
                        if (new RegExp(pattern, "i").test(text)) return true;
                    } catch {
                        // Invalid regex, treat as contains
                        if (text.includes(pattern)) return true;
                    }
                    break;
            }
        }
        return false;
    }

    /**
     * Score a candidate based on query matching
     */
    private scoreCandidate(index: number, q: QueryAST): number {
        const record = this.records[index];
        let score = 0.5; // Base score

        for (const clause of q.where) {
            // Name match boosts score
            if ("name" in clause) {
                const nameScore = fuzzyScore(clause.name.value, record.name);
                score += nameScore * 0.3;
            }

            // Context match boosts score
            if ("in_context" in clause) {
                const contextText = record.context.join(" ");
                const contextScore = fuzzyScore(clause.in_context.value, contextText);
                score += contextScore * 0.2;
            }

            // Exact role match
            if ("role" in clause) {
                const roles = Array.isArray(clause.role) ? clause.role : [clause.role];
                if (roles.includes(record.role)) {
                    score += 0.1;
                }
            }

            // State match
            if ("state" in clause) {
                // Already filtered, just give small boost
                score += 0.05;
            }
        }

        // Boost for data-testid (more reliable)
        if (record.attrs["data-testid"]) {
            score += 0.1;
        }

        // Boost for visibility in upper part of viewport (likely primary content)
        if (record.rect.y < 300) {
            score += 0.05;
        }

        return Math.min(1.0, score);
    }

    /**
     * Convert NodeRecord to MatchResult
     */
    private recordToMatch(record: NodeRecord, score: number): MatchResult {
        return {
            id: record.id,
            score: Math.round(score * 100) / 100,
            role: record.role,
            name: record.name,
            states: {
                visible: (record.stateBits & StateFlags.VISIBLE) !== 0,
                enabled: (record.stateBits & StateFlags.ENABLED) !== 0,
                checked: (record.stateBits & StateFlags.CHECKED) !== 0 ? true : undefined,
                expanded: (record.stateBits & StateFlags.EXPANDED) !== 0 ? true : undefined,
                focused: (record.stateBits & StateFlags.FOCUSED) !== 0 ? true : undefined,
                selected: (record.stateBits & StateFlags.SELECTED) !== 0 ? true : undefined,
            },
            context: record.context,
            actionability: this.getActionability(record),
            rect: record.rect,
            record,
        };
    }

    /**
     * Determine what actions are possible on an element
     */
    private getActionability(record: NodeRecord): Actionability {
        const isEnabled = (record.stateBits & StateFlags.ENABLED) !== 0;
        const isVisible = (record.stateBits & StateFlags.VISIBLE) !== 0;
        const actionable = isEnabled && isVisible;

        const clickable = actionable && [
            ElementRole.Button,
            ElementRole.Link,
            ElementRole.Tab,
            ElementRole.Menuitem,
            ElementRole.Option,
            ElementRole.Checkbox,
            ElementRole.Radio,
            ElementRole.Switch,
        ].includes(record.role);

        const typeable = actionable && [
            ElementRole.Textbox,
            ElementRole.Searchbox,
            ElementRole.Combobox,
            ElementRole.Spinbutton,
        ].includes(record.role);

        const checkable = actionable && [
            ElementRole.Checkbox,
            ElementRole.Radio,
            ElementRole.Switch,
        ].includes(record.role);

        const selectable = actionable && [
            ElementRole.Option,
            ElementRole.Tab,
            ElementRole.Treeitem,
            ElementRole.Gridcell,
        ].includes(record.role);

        return {
            click: clickable,
            type: typeable,
            check: checkable,
            select: selectable,
            scroll: isVisible,
        };
    }
}
