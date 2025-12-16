/**
 * UI-Ground SDK: Icon Matcher
 * Extracts icon names from icon library modules
 */

/**
 * Matches DOM elements to icon names using a provided icon library
 */
export class IconMatcher {
    private iconNames: Set<string> = new Set();
    private kebabToName: Map<string, string> = new Map();

    constructor(library: Record<string, unknown>) {
        this.buildIconMap(library);
    }

    /**
     * Build a map of icon names from the library exports
     */
    private buildIconMap(library: Record<string, unknown>) {
        const entries = Object.entries(library);
        console.log(`[IconMatcher] Library has ${entries.length} entries`);

        // Debug: log first 5 entries to see the structure
        console.log("[IconMatcher] Sample entries:", entries.slice(0, 5).map(([name, val]) => ({
            name,
            type: typeof val,
            isFunc: typeof val === "function"
        })));

        for (const [name, component] of entries) {
            // React components can be functions OR objects (ForwardRef)
            const isComponent = typeof component === "function" ||
                (typeof component === "object" && component !== null);

            if (!isComponent) continue;

            // Skip common utility/hook exports
            if (
                name.startsWith("create") ||
                name.startsWith("use") ||
                name === "default" ||
                name === "icons" ||
                name === "createElement"
            ) {
                continue;
            }

            // Icon names should be PascalCase (start with uppercase)
            if (!/^[A-Z]/.test(name)) continue;

            // Convert PascalCase to kebab-case: "ShoppingCart" → "shopping-cart"
            const kebab = this.toKebabCase(name);
            this.iconNames.add(name);
            this.kebabToName.set(kebab, name);
        }

        console.log(`[IconMatcher] Registered ${this.iconNames.size} icons from library`);
        if (this.iconNames.size > 0) {
            console.log("[IconMatcher] Sample icons:", Array.from(this.iconNames).slice(0, 10));
        }
    }

    /**
     * Get icon name from a DOM element
     */
    getIconName(element: Element): string | null {
        // Check for SVG inside the element
        const svg = element.querySelector("svg") || (element.tagName === "SVG" ? element : null);
        if (!svg) return null;

        // 1. Lucide: data-lucide attribute
        const dataLucide = svg.getAttribute("data-lucide");
        if (dataLucide && this.kebabToName.has(dataLucide)) {
            return dataLucide.replace(/-/g, " ");
        }

        // 2. Lucide: class="lucide lucide-bell"
        const className = svg.getAttribute("class") || "";
        const lucideMatch = className.match(/lucide-([a-z0-9-]+)/);
        if (lucideMatch && this.kebabToName.has(lucideMatch[1])) {
            return lucideMatch[1].replace(/-/g, " ");
        }

        // 3. Font Awesome: data-icon attribute
        const dataIcon = svg.getAttribute("data-icon");
        if (dataIcon) {
            return dataIcon.replace(/-/g, " ");
        }

        // 4. Heroicons: class with icon name
        const heroMatch = className.match(/heroicon-([a-z0-9-]+)/);
        if (heroMatch) {
            return heroMatch[1].replace(/-/g, " ");
        }

        // 5. Check aria-label on SVG
        const ariaLabel = svg.getAttribute("aria-label");
        if (ariaLabel) {
            return ariaLabel;
        }

        return null;
    }

    /**
     * Check if element contains a known icon
     */
    hasIcon(element: Element): boolean {
        return this.getIconName(element) !== null;
    }

    /**
     * Convert PascalCase to kebab-case
     */
    private toKebabCase(str: string): string {
        return str
            .replace(/([a-z])([A-Z])/g, "$1-$2")
            .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
            .toLowerCase();
    }
}
