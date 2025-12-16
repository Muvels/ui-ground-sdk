/**
 * UI-Ground SDK: Element Handle Map
 * Bidirectional mapping between element IDs and DOM elements
 * Uses WeakRef for GC-safe references
 */

import { ElementRole, NodeRecord, SemanticLocator } from "./types.js";

/**
 * Manages bidirectional mapping between numeric IDs and DOM Elements.
 * Uses WeakRef to allow garbage collection of removed elements.
 */
export class ElementHandleMap {
    private elementToId = new WeakMap<Element, number>();
    private idToElement = new Map<number, WeakRef<Element>>();
    private idToLocator = new Map<number, SemanticLocator>();
    private nextId = 1;

    /**
     * Register an element and get its ID
     */
    register(element: Element, record: NodeRecord): number {
        // Check if already registered
        const existingId = this.elementToId.get(element);
        if (existingId !== undefined) {
            return existingId;
        }

        const id = this.nextId++;
        this.elementToId.set(element, id);
        this.idToElement.set(id, new WeakRef(element));

        // Store semantic locator for fallback resolution
        this.idToLocator.set(id, {
            testId: record.attrs["data-testid"],
            role: record.role,
            name: record.name,
            context: record.context,
            nth: 0, // Will be calculated if needed
        });

        return id;
    }

    /**
     * Get element by ID
     */
    getElement(id: number): Element | null {
        const ref = this.idToElement.get(id);
        if (!ref) return null;

        const element = ref.deref();
        if (!element) {
            // Element was garbage collected
            this.idToElement.delete(id);
            this.idToLocator.delete(id);
            return null;
        }

        // Verify element is still in DOM
        if (!element.isConnected) {
            return this.resolveByLocator(id);
        }

        return element;
    }

    /**
     * Get ID by element
     */
    getId(element: Element): number | undefined {
        return this.elementToId.get(element);
    }

    /**
     * Get semantic locator for an ID
     */
    getLocator(id: number): SemanticLocator | undefined {
        return this.idToLocator.get(id);
    }

    /**
     * Attempt to resolve element by semantic locator when original reference is lost
     */
    private resolveByLocator(id: number): Element | null {
        const locator = this.idToLocator.get(id);
        if (!locator) return null;

        // Try data-testid first (most reliable)
        if (locator.testId) {
            const el = document.querySelector(`[data-testid="${locator.testId}"]`);
            if (el) {
                this.updateReference(id, el);
                return el;
            }
        }

        // Try ARIA role + name
        const roleSelector = this.getRoleSelector(locator.role);
        if (roleSelector) {
            const candidates = document.querySelectorAll(roleSelector);
            for (const candidate of candidates) {
                if (this.matchesLocator(candidate, locator)) {
                    this.updateReference(id, candidate);
                    return candidate;
                }
            }
        }

        return null;
    }

    /**
     * Update the element reference for an ID
     */
    private updateReference(id: number, element: Element): void {
        this.idToElement.set(id, new WeakRef(element));
        this.elementToId.set(element, id);
    }

    /**
     * Get CSS selector for a role
     */
    private getRoleSelector(role: ElementRole): string | null {
        const roleSelectors: Partial<Record<ElementRole, string>> = {
            [ElementRole.Button]: 'button, [role="button"], input[type="button"], input[type="submit"]',
            [ElementRole.Link]: 'a[href], [role="link"]',
            [ElementRole.Textbox]: 'input[type="text"], input[type="email"], input[type="password"], input:not([type]), textarea, [role="textbox"]',
            [ElementRole.Checkbox]: 'input[type="checkbox"], [role="checkbox"]',
            [ElementRole.Radio]: 'input[type="radio"], [role="radio"]',
            [ElementRole.Combobox]: 'select, [role="combobox"]',
            [ElementRole.Dialog]: 'dialog, [role="dialog"], [role="alertdialog"]',
            [ElementRole.Tab]: '[role="tab"]',
            [ElementRole.Menuitem]: '[role="menuitem"]',
            [ElementRole.Switch]: '[role="switch"]',
        };
        return roleSelectors[role] ?? `[role="${role}"]`;
    }

    /**
     * Check if an element matches a semantic locator
     */
    private matchesLocator(element: Element, locator: SemanticLocator): boolean {
        // Get accessible name
        const name = this.getAccessibleName(element);
        if (locator.name && !name.toLowerCase().includes(locator.name.toLowerCase())) {
            return false;
        }

        // Check context (simplified - check ancestors)
        if (locator.context.length > 0) {
            const ancestorText = this.getAncestorContext(element).join(" ").toLowerCase();
            const contextMatch = locator.context.some((ctx) =>
                ancestorText.includes(ctx.toLowerCase())
            );
            if (!contextMatch) return false;
        }

        return true;
    }

    /**
     * Get accessible name for an element
     */
    private getAccessibleName(element: Element): string {
        // aria-label
        const ariaLabel = element.getAttribute("aria-label");
        if (ariaLabel) return ariaLabel;

        // aria-labelledby
        const labelledBy = element.getAttribute("aria-labelledby");
        if (labelledBy) {
            const label = document.getElementById(labelledBy);
            if (label) return label.textContent?.trim() ?? "";
        }

        // For input elements, check for associated label
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            const id = element.id;
            if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (label) return label.textContent?.trim() ?? "";
            }
        }

        // textContent for buttons, links, etc.
        return element.textContent?.trim() ?? "";
    }

    /**
     * Get context from ancestor elements
     */
    private getAncestorContext(element: Element): string[] {
        const context: string[] = [];
        let current = element.parentElement;

        while (current && context.length < 5) {
            // Check for dialog/modal titles
            if (current.matches('dialog, [role="dialog"], [role="alertdialog"]')) {
                const title = current.querySelector('[role="heading"], h1, h2, h3, .modal-title, .dialog-title');
                if (title) context.push(title.textContent?.trim() ?? "");
            }

            // Check for section headings
            if (current.matches("section, article, [role='region']")) {
                const heading = current.querySelector("h1, h2, h3, h4, [role='heading']");
                if (heading) context.push(heading.textContent?.trim() ?? "");
            }

            // Check for aria-label on containers
            const label = current.getAttribute("aria-label");
            if (label) context.push(label);

            current = current.parentElement;
        }

        return context;
    }

    /**
     * Clear all mappings (for snapshot reset)
     */
    clear(): void {
        this.idToElement.clear();
        this.idToLocator.clear();
        this.nextId = 1;
        // Note: WeakMap clears automatically when elements are GC'd
    }

    /**
     * Get current ID counter (for debugging)
     */
    get size(): number {
        return this.idToElement.size;
    }
}
