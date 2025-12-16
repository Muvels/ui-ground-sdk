/**
 * Test Fixtures: Mock DOM structures for testing
 */

/**
 * Create a basic button element
 */
export function createButton(text: string, attrs: Record<string, string> = {}): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    Object.entries(attrs).forEach(([key, value]) => {
        button.setAttribute(key, value);
    });
    return button;
}

/**
 * Create an input element
 */
export function createInput(type: string, attrs: Record<string, string> = {}): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    Object.entries(attrs).forEach(([key, value]) => {
        input.setAttribute(key, value);
    });
    return input;
}

/**
 * Create a link element
 */
export function createLink(text: string, href: string, attrs: Record<string, string> = {}): HTMLAnchorElement {
    const link = document.createElement('a');
    link.textContent = text;
    link.href = href;
    Object.entries(attrs).forEach(([key, value]) => {
        link.setAttribute(key, value);
    });
    return link;
}

/**
 * Create a button with an icon (simulating Lucide icons)
 */
export function createIconButton(iconName: string, text?: string): HTMLButtonElement {
    const button = document.createElement('button');

    // Create SVG with Lucide-style attributes
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `lucide lucide-${iconName}`);
    svg.setAttribute('data-lucide', iconName);
    button.appendChild(svg);

    if (text) {
        const span = document.createElement('span');
        span.textContent = text;
        button.appendChild(span);
    }

    return button;
}

/**
 * Create a complex nested structure
 */
export function createNestedButton(structure: {
    icon?: string;
    text?: string;
    badge?: string;
    ariaLabel?: string;
}): HTMLButtonElement {
    const button = document.createElement('button');

    if (structure.ariaLabel) {
        button.setAttribute('aria-label', structure.ariaLabel);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-2';

    if (structure.icon) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `lucide lucide-${structure.icon}`);
        svg.setAttribute('data-lucide', structure.icon);
        wrapper.appendChild(svg);
    }

    if (structure.text) {
        const span = document.createElement('span');
        span.textContent = structure.text;
        wrapper.appendChild(span);
    }

    if (structure.badge) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = structure.badge;
        wrapper.appendChild(badge);
    }

    button.appendChild(wrapper);
    return button;
}

/**
 * Create a sample e-commerce page for integration testing
 */
export function createSamplePage(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = `
        <header>
            <nav role="navigation" aria-label="Main Navigation">
                <a href="/" class="logo">ShopDemo</a>
                <div class="nav-links">
                    <a href="/products">Products</a>
                    <a href="/categories">Categories</a>
                </div>
                <div class="actions">
                    <button aria-label="Search" class="icon-btn">
                        <svg class="lucide lucide-search" data-lucide="search"></svg>
                    </button>
                    <button aria-label="Notifications" class="icon-btn">
                        <svg class="lucide lucide-bell" data-lucide="bell"></svg>
                        <span class="badge">3</span>
                    </button>
                    <button aria-label="User Profile" class="icon-btn">
                        <svg class="lucide lucide-user" data-lucide="user"></svg>
                    </button>
                </div>
            </nav>
        </header>
        <main>
            <section class="product-card">
                <img src="product.jpg" alt="Premium Headphones" />
                <h2>Premium Wireless Headphones</h2>
                <p class="price">$299.99</p>
                <div class="rating">
                    <span aria-label="4 out of 5 stars">★★★★☆</span>
                    <span>(128 reviews)</span>
                </div>
                <div class="actions">
                    <button class="primary">
                        <svg class="lucide lucide-shopping-cart" data-lucide="shopping-cart"></svg>
                        <span>Add to Cart</span>
                    </button>
                    <button class="secondary">Buy Now</button>
                </div>
            </section>
            <section class="quick-actions">
                <button>
                    <svg class="lucide lucide-shopping-cart" data-lucide="shopping-cart"></svg>
                    <span>View Cart</span>
                </button>
                <button>
                    <svg class="lucide lucide-credit-card" data-lucide="credit-card"></svg>
                    <span>Checkout</span>
                </button>
                <button>
                    <svg class="lucide lucide-package" data-lucide="package"></svg>
                    <span>My Orders</span>
                </button>
                <button>
                    <svg class="lucide lucide-heart" data-lucide="heart"></svg>
                    <span>Wishlist</span>
                </button>
            </section>
            <section class="account">
                <h3>Account</h3>
                <button>
                    <svg class="lucide lucide-settings" data-lucide="settings"></svg>
                    <span>Profile Settings</span>
                </button>
                <button>
                    <svg class="lucide lucide-help-circle" data-lucide="help-circle"></svg>
                    <span>Help & Support</span>
                </button>
                <button class="danger">
                    <svg class="lucide lucide-log-out" data-lucide="log-out"></svg>
                    <span>Log Out</span>
                </button>
            </section>
            <section class="search-form">
                <h3>Search Products</h3>
                <form>
                    <input type="text" placeholder="Search products..." aria-label="Search Products" />
                    <button type="submit">
                        <svg class="lucide lucide-search" data-lucide="search"></svg>
                        <span>Search</span>
                    </button>
                </form>
            </section>
        </main>
        <dialog id="confirm-dialog" aria-labelledby="dialog-title">
            <h2 id="dialog-title">Confirm Action</h2>
            <p>Are you sure you want to proceed?</p>
            <button>Cancel</button>
            <button class="primary">Confirm</button>
        </dialog>
    `;
    return container;
}

/**
 * Create a mock icon library (simulating Lucide)
 */
export function createMockIconLibrary(): Record<string, unknown> {
    const icons = [
        'Search', 'Bell', 'User', 'ShoppingCart', 'CreditCard',
        'Package', 'Heart', 'Settings', 'HelpCircle', 'LogOut',
        'Menu', 'X', 'Check', 'ChevronDown', 'ChevronUp',
        'Plus', 'Minus', 'Edit', 'Trash', 'Eye'
    ];

    const library: Record<string, unknown> = {};
    icons.forEach(name => {
        // Simulate React component (object with $$typeof)
        library[name] = {
            $$typeof: Symbol.for('react.forward_ref'),
            displayName: name
        };
    });

    // Add some utilities to skip
    library.createLucideIcon = () => { };
    library.icons = {};

    return library;
}
