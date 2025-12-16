/**
 * UI-Ground SDK: DOM Collector
 * Extracts UI state from DOM + ARIA signals into NodeRecords
 */

import {
    ElementRole,
    NodeRecord,
    Rect,
    StateFlags,
    UiDbConfig,
} from "./types.js";
import { IconMatcher } from "./icon-matcher.js";

/**
 * Map of native element tags to their implicit ARIA roles
 */
const IMPLICIT_ROLES: Record<string, ElementRole> = {
    button: ElementRole.Button,
    a: ElementRole.Link,
    input: ElementRole.Textbox,
    textarea: ElementRole.Textbox,
    select: ElementRole.Combobox,
    option: ElementRole.Option,
    dialog: ElementRole.Dialog,
    nav: ElementRole.Navigation,
    main: ElementRole.Main,
    article: ElementRole.Article,
    section: ElementRole.Region,
    form: ElementRole.Form,
    img: ElementRole.Image,
    table: ElementRole.Grid,
    tr: ElementRole.Row,
    td: ElementRole.Cell,
    th: ElementRole.Columnheader,
    ul: ElementRole.Group,
    ol: ElementRole.Group,
    li: ElementRole.Generic,
    h1: ElementRole.Heading,
    h2: ElementRole.Heading,
    h3: ElementRole.Heading,
    h4: ElementRole.Heading,
    h5: ElementRole.Heading,
    h6: ElementRole.Heading,
    hr: ElementRole.Separator,
    progress: ElementRole.Progressbar,
};

/**
 * Input type to role mapping
 */
const INPUT_TYPE_ROLES: Record<string, ElementRole> = {
    text: ElementRole.Textbox,
    email: ElementRole.Textbox,
    password: ElementRole.Textbox,
    search: ElementRole.Searchbox,
    tel: ElementRole.Textbox,
    url: ElementRole.Textbox,
    number: ElementRole.Spinbutton,
    checkbox: ElementRole.Checkbox,
    radio: ElementRole.Radio,
    button: ElementRole.Button,
    submit: ElementRole.Button,
    reset: ElementRole.Button,
    range: ElementRole.Slider,
};

/**
 * Elements that are typically interactive
 */
const INTERACTIVE_SELECTORS = [
    "button",
    "a[href]",
    "input",
    "select",
    "textarea",
    "[role]",
    "[tabindex]",
    "[onclick]",
    "[data-testid]",
    "label",
    "summary",
].join(", ");

/**
 * Collector class for extracting UI state from DOM
 */
export class DOMCollector {
    private config: UiDbConfig;
    private frameId: number;
    private iconMatcher: IconMatcher | null;

    constructor(config: UiDbConfig = {}, frameId: number = 0) {
        this.config = config;
        this.frameId = frameId;
        this.iconMatcher = config.iconLibrary
            ? new IconMatcher(config.iconLibrary)
            : null;
    }

    /**
     * Collect all relevant elements and convert to NodeRecords
     */
    collect(): { records: NodeRecord[]; elements: Element[] } {
        const records: NodeRecord[] = [];
        const elements: Element[] = [];
        let id = 0;

        // Get all potentially interactive elements
        const candidates = document.querySelectorAll(INTERACTIVE_SELECTORS);

        for (const element of candidates) {
            // Apply custom filter if provided
            if (this.config.elementFilter && !this.config.elementFilter(element)) {
                continue;
            }

            // Skip hidden elements unless explicitly shown
            if (!this.isVisible(element)) {
                continue;
            }

            // Skip elements inside hidden containers
            if (this.isInsideHiddenContainer(element)) {
                continue;
            }

            // Viewport filtering
            if (this.config.viewportOnly && !this.isInViewport(element)) {
                continue;
            }

            const record = this.elementToRecord(element, id);
            if (record) {
                records.push(record);
                elements.push(element);
                id++;
            }
        }

        return { records, elements };
    }

    /**
     * Convert a single element to a NodeRecord
     */
    private elementToRecord(element: Element, id: number): NodeRecord | null {
        const role = this.getRole(element);
        if (!role) return null;

        const rect = this.getRect(element);
        const name = this.getName(element);
        const stateBits = this.getStateBits(element);
        const context = this.getContext(element);
        const attrs = this.getRelevantAttrs(element);
        const fingerprint = this.generateFingerprint(role, name, context, attrs);

        return {
            id,
            frameId: this.frameId,
            role,
            name,
            stateBits,
            attrs,
            context,
            rect,
            fingerprint,
            tagName: element.tagName.toLowerCase(),
        };
    }

    /**
     * Determine the semantic role of an element
     */
    private getRole(element: Element): ElementRole | null {
        // Explicit ARIA role takes precedence
        const ariaRole = element.getAttribute("role");
        if (ariaRole) {
            const role = ariaRole as ElementRole;
            if (Object.values(ElementRole).includes(role)) {
                return role;
            }
        }

        const tagName = element.tagName.toLowerCase();

        // Special handling for input types
        if (tagName === "input") {
            const type = (element as HTMLInputElement).type || "text";
            return INPUT_TYPE_ROLES[type] ?? ElementRole.Textbox;
        }

        // Special handling for links (need href to be a link)
        if (tagName === "a") {
            return element.hasAttribute("href") ? ElementRole.Link : ElementRole.Generic;
        }

        // Check implicit role mapping
        if (tagName in IMPLICIT_ROLES) {
            return IMPLICIT_ROLES[tagName];
        }

        // Clickable elements
        if (this.isClickable(element)) {
            return ElementRole.Button;
        }

        return null;
    }

    /**
     * Get accessible name using simplified accessible name computation
     */
    private getName(element: Element): string {
        let name = "";

        // 1. aria-label
        const ariaLabel = element.getAttribute("aria-label");
        if (ariaLabel?.trim()) {
            name = ariaLabel.trim();
        }
        // 2. aria-labelledby
        else {
            const labelledBy = element.getAttribute("aria-labelledby");
            if (labelledBy) {
                const labels = labelledBy
                    .split(/\s+/)
                    .map((id) => document.getElementById(id)?.textContent?.trim())
                    .filter(Boolean);
                if (labels.length > 0) name = labels.join(" ");
            }
        }

        // 3. For inputs, check associated label
        if (!name && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
            const id = element.id;
            if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (label?.textContent?.trim()) name = label.textContent.trim();
            }
            // Check for wrapping label
            if (!name) {
                const wrappingLabel = element.closest("label");
                if (wrappingLabel) {
                    // Get label text excluding the input itself
                    const clone = wrappingLabel.cloneNode(true) as Element;
                    clone.querySelectorAll("input, select, textarea").forEach((el) => el.remove());
                    if (clone.textContent?.trim()) name = clone.textContent.trim();
                }
            }
            // Placeholder as fallback
            if (!name) {
                const placeholder = element.getAttribute("placeholder");
                if (placeholder?.trim()) name = placeholder.trim();
            }
        }

        // 4. alt attribute for images
        if (!name && element instanceof HTMLImageElement) {
            const alt = element.alt;
            if (alt?.trim()) name = alt.trim();
        }

        // 5. title attribute
        if (!name) {
            const title = element.getAttribute("title");
            if (title?.trim()) name = title.trim();
        }

        // 6. Extract visible text (smart extraction)
        if (!name) {
            name = this.extractVisibleText(element);
        }

        // 7. Get icon name
        let iconName = "";
        if (this.iconMatcher) {
            iconName = this.iconMatcher.getIconName(element) || "";
        }

        // Combine logic:
        // If we have an icon name and it's not already part of the name
        if (iconName) {
            if (!name) return iconName;
            if (!name.toLowerCase().includes(iconName.toLowerCase())) {
                // If the name is generic ("Notifications"), prepend icon ("Bell Notifications")
                return `${iconName} ${name}`;
            }
        }

        return name;
    }

    /**
     * Extract visible text from element, handling nested structures intelligently
     */
    private extractVisibleText(element: Element, maxLength = 150): string {
        const textParts: string[] = [];

        const walk = (node: Node) => {
            // Skip hidden elements
            if (node instanceof HTMLElement) {
                const style = getComputedStyle(node);
                if (style.display === "none" || style.visibility === "hidden") {
                    return;
                }
                if (node.getAttribute("aria-hidden") === "true") {
                    return;
                }
            }

            // Handle text nodes
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (text && text.length > 0) {
                    textParts.push(text);
                }
                return;
            }

            // Skip SVG internals (we get icon name separately)
            if (node instanceof SVGElement && node.tagName.toLowerCase() === "svg") {
                return;
            }

            // Skip script/style
            if (node instanceof HTMLElement) {
                const tag = node.tagName.toLowerCase();
                if (tag === "script" || tag === "style" || tag === "noscript") {
                    return;
                }
            }

            // Recursively process children
            for (const child of node.childNodes) {
                walk(child);
                // Stop if we have enough text
                if (textParts.join(" ").length > maxLength) {
                    break;
                }
            }
        };

        walk(element);

        // Deduplicate and clean up
        const result = textParts
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, maxLength);

        return result;
    }

    /**
     * Get state bits for an element
     */
    private getStateBits(element: Element): number {
        let bits = 0;

        // Visibility
        if (this.isVisible(element)) {
            bits |= StateFlags.VISIBLE;
        }

        // Enabled/Disabled
        if (element instanceof HTMLButtonElement ||
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement) {
            if (!element.disabled) {
                bits |= StateFlags.ENABLED;
            } else {
                bits |= StateFlags.DISABLED;
            }
        } else if (!element.hasAttribute("aria-disabled") || element.getAttribute("aria-disabled") !== "true") {
            bits |= StateFlags.ENABLED;
        }

        // Checked
        if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
            if (element.checked) {
                bits |= StateFlags.CHECKED;
            }
        } else if (element.getAttribute("aria-checked") === "true") {
            bits |= StateFlags.CHECKED;
        }

        // Expanded
        if (element.getAttribute("aria-expanded") === "true") {
            bits |= StateFlags.EXPANDED;
        }

        // Focused
        if (document.activeElement === element) {
            bits |= StateFlags.FOCUSED;
        }

        // Selected
        if (element instanceof HTMLOptionElement && element.selected) {
            bits |= StateFlags.SELECTED;
        } else if (element.getAttribute("aria-selected") === "true") {
            bits |= StateFlags.SELECTED;
        }

        // Pressed
        if (element.getAttribute("aria-pressed") === "true") {
            bits |= StateFlags.PRESSED;
        }

        // Read-only
        if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && element.readOnly) {
            bits |= StateFlags.READONLY;
        } else if (element.getAttribute("aria-readonly") === "true") {
            bits |= StateFlags.READONLY;
        }

        // Required
        if ((element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) && element.required) {
            bits |= StateFlags.REQUIRED;
        } else if (element.getAttribute("aria-required") === "true") {
            bits |= StateFlags.REQUIRED;
        }

        // Invalid
        if (element.getAttribute("aria-invalid") === "true") {
            bits |= StateFlags.INVALID;
        }

        // Busy
        if (element.getAttribute("aria-busy") === "true") {
            bits |= StateFlags.BUSY;
        }

        return bits;
    }

    /**
     * Get context from ancestor elements
     */
    private getContext(element: Element): string[] {
        const context: string[] = [];
        let current = element.parentElement;
        const seen = new Set<string>();

        while (current && context.length < 5) {
            // Dialog/Modal titles
            if (current.matches('dialog, [role="dialog"], [role="alertdialog"]')) {
                const title = current.querySelector('[role="heading"], h1, h2, h3, .modal-title, .dialog-title, [class*="title"]');
                if (title?.textContent?.trim()) {
                    const text = title.textContent.trim().slice(0, 50);
                    if (!seen.has(text)) {
                        context.push(text);
                        seen.add(text);
                    }
                }
            }

            // Form titles
            if (current.matches("form, [role='form']")) {
                const legend = current.querySelector("legend, h1, h2, h3");
                if (legend?.textContent?.trim()) {
                    const text = legend.textContent.trim().slice(0, 50);
                    if (!seen.has(text)) {
                        context.push(text);
                        seen.add(text);
                    }
                }
            }

            // Section/Region headings
            if (current.matches("section, article, [role='region'], fieldset")) {
                const heading = current.querySelector("h1, h2, h3, h4, legend, [role='heading']");
                if (heading?.textContent?.trim()) {
                    const text = heading.textContent.trim().slice(0, 50);
                    if (!seen.has(text)) {
                        context.push(text);
                        seen.add(text);
                    }
                }
            }

            // aria-label on containers
            const label = current.getAttribute("aria-label");
            if (label?.trim()) {
                const text = label.trim().slice(0, 50);
                if (!seen.has(text)) {
                    context.push(text);
                    seen.add(text);
                }
            }

            // Tab panels
            if (current.matches('[role="tabpanel"]')) {
                const tabId = current.getAttribute("aria-labelledby");
                if (tabId) {
                    const tab = document.getElementById(tabId);
                    if (tab?.textContent?.trim()) {
                        const text = tab.textContent.trim().slice(0, 50);
                        if (!seen.has(text)) {
                            context.push(text);
                            seen.add(text);
                        }
                    }
                }
            }

            current = current.parentElement;
        }

        return context;
    }

    /**
     * Get relevant attributes for an element
     */
    private getRelevantAttrs(element: Element): Record<string, string> {
        const attrs: Record<string, string> = {};

        // data-testid is critical for stable identification
        const testId = element.getAttribute("data-testid");
        if (testId) attrs["data-testid"] = testId;

        // Other data-* attributes that might be useful
        const dataAction = element.getAttribute("data-action");
        if (dataAction) attrs["data-action"] = dataAction;

        // ID for reference (but not as primary locator)
        const id = element.id;
        if (id) attrs["id"] = id;

        // href for links (domain only to avoid PII)
        if (element instanceof HTMLAnchorElement && element.href) {
            try {
                const url = new URL(element.href);
                attrs["href-path"] = url.pathname;
            } catch {
                // Invalid URL, skip
            }
        }

        // type for inputs
        if (element instanceof HTMLInputElement) {
            attrs["type"] = element.type;
        }

        return attrs;
    }

    /**
     * Get bounding rectangle
     */
    private getRect(element: Element): Rect {
        const rect = element.getBoundingClientRect();
        return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        };
    }

    /**
     * Check if an element is visible
     */
    private isVisible(element: Element): boolean {
        if (!(element instanceof HTMLElement)) return true;

        // Check display/visibility
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") {
            return false;
        }

        // Check opacity
        if (parseFloat(style.opacity) === 0) {
            return false;
        }

        // Check aria-hidden
        if (element.getAttribute("aria-hidden") === "true") {
            return false;
        }

        // Check hidden attribute
        if (element.hidden) {
            return false;
        }

        // Check size (very small elements are likely hidden)
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) {
            return false;
        }

        return true;
    }

    /**
     * Check if element is inside a hidden container
     */
    private isInsideHiddenContainer(element: Element): boolean {
        let current = element.parentElement;
        while (current) {
            if (current instanceof HTMLElement) {
                const style = getComputedStyle(current);
                if (style.display === "none" || style.visibility === "hidden") {
                    return true;
                }
                if (current.getAttribute("aria-hidden") === "true") {
                    return true;
                }
            }
            current = current.parentElement;
        }
        return false;
    }

    /**
     * Check if element is in viewport
     */
    private isInViewport(element: Element): boolean {
        const rect = element.getBoundingClientRect();
        return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }

    /**
     * Check if element appears clickable
     */
    private isClickable(element: Element): boolean {
        // Has onclick handler
        if (element.hasAttribute("onclick")) return true;

        // Has click-related role
        const role = element.getAttribute("role");
        if (role && ["button", "link", "menuitem", "tab", "option"].includes(role)) {
            return true;
        }

        // Has tabindex (likely interactive)
        if (element.hasAttribute("tabindex") && element.getAttribute("tabindex") !== "-1") {
            return true;
        }

        // Cursor pointer style (expensive check, do last)
        if (element instanceof HTMLElement) {
            const style = getComputedStyle(element);
            if (style.cursor === "pointer") return true;
        }

        return false;
    }

    /**
     * Generate a fingerprint for stable identification across re-renders
     */
    private generateFingerprint(
        role: ElementRole,
        name: string,
        context: string[],
        attrs: Record<string, string>
    ): string {
        // Use data-testid if available (most stable)
        if (attrs["data-testid"]) {
            return `testid:${attrs["data-testid"]}`;
        }

        // Otherwise, create a hash from role + name + context
        const parts = [
            role,
            name.toLowerCase().slice(0, 30),
            ...context.slice(0, 2).map((c) => c.toLowerCase().slice(0, 20)),
        ];

        return parts.join("|");
    }
}

/**
 * Convenience function to collect snapshot
 */
export function collectSnapshot(config?: UiDbConfig): { records: NodeRecord[]; elements: Element[] } {
    const collector = new DOMCollector(config);
    return collector.collect();
}
