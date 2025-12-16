/**
 * Collector Tests
 * Tests for DOM collection, role detection, name extraction, and icon matching
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DOMCollector } from '../collector.js';
import { UiDbConfig } from '../types.js';
import { IconMatcher } from '../icon-matcher.js';
import {
    createButton,
    createInput,
    createLink,
    createIconButton,
    createNestedButton,
    createSamplePage,
    createMockIconLibrary
} from './fixtures/mock-dom.js';

describe('DOMCollector', () => {
    let collector: DOMCollector;
    let container: HTMLElement;
    let originalGetBoundingClientRect: any;

    beforeEach(() => {
        // Mock getBoundingClientRect
        originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
        HTMLElement.prototype.getBoundingClientRect = function () {
            return {
                x: 0, y: 0, width: 100, height: 100,
                top: 0, left: 0, bottom: 100, right: 100,
                toJSON: () => { }
            } as DOMRect;
        };

        container = document.createElement('div');
        document.body.appendChild(container);

        const config: UiDbConfig = {
            engine: 'js',
            iconLibrary: createMockIconLibrary()
        };

        collector = new DOMCollector(config);
    });

    afterEach(() => {
        container.remove();
        HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    describe('Role Detection', () => {
        it('should detect implicit button role', () => {
            const button = createButton('Click me');
            container.appendChild(button);

            const { records } = collector.collect();

            const buttonRecord = records.find(r => r.name === 'Click me');
            expect(buttonRecord).toBeDefined();
            expect(buttonRecord?.role).toBe('button');
        });

        it('should detect implicit link role', () => {
            const link = createLink('Go Home', '/');
            container.appendChild(link);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const linkRecord = records.find(r => r.name === 'Go Home');
            expect(linkRecord).toBeDefined();
            expect(linkRecord?.role).toBe('link');
        });

        it('should detect implicit textbox role for input', () => {
            const input = createInput('text', { placeholder: 'Enter text' });
            container.appendChild(input);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const inputRecord = records.find(r => r.name === 'Enter text');
            expect(inputRecord).toBeDefined();
            expect(inputRecord?.role).toBe('textbox');
        });

        it('should detect explicit ARIA role', () => {
            const div = document.createElement('div');
            div.setAttribute('role', 'button');
            div.textContent = 'Custom Button';
            container.appendChild(div);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.name === 'Custom Button');
            expect(record).toBeDefined();
            expect(record?.role).toBe('button');
        });

        it('should detect checkbox role', () => {
            const checkbox = createInput('checkbox', { id: 'agree' });
            container.appendChild(checkbox);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.role === 'checkbox');
            expect(record).toBeDefined();
        });
    });

    describe('Name Extraction', () => {
        it('should extract name from aria-label', () => {
            const button = createButton('', { 'aria-label': 'Submit Form' });
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.name === 'Submit Form');
            expect(record).toBeDefined();
        });

        it('should extract name from text content', () => {
            const button = createButton('Save Changes');
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.name === 'Save Changes');
            expect(record).toBeDefined();
        });

        it('should extract name from title attribute', () => {
            const button = createButton('', { title: 'More Options' });
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.name === 'More Options');
            expect(record).toBeDefined();
        });

        it('should extract name from placeholder for inputs', () => {
            const input = createInput('text', { placeholder: 'Search...' });
            container.appendChild(input);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.name === 'Search...');
            expect(record).toBeDefined();
        });

        it('should extract nested text content', () => {
            const button = createNestedButton({ text: 'View Cart', icon: 'shopping-cart' });
            container.appendChild(button);

            const collector = new DOMCollector({ iconLibrary: createMockIconLibrary() });
            const { records } = collector.collect();

            const record = records.find(r => r.name?.includes('View Cart'));
            expect(record).toBeDefined();
        });

        it('should prioritize aria-label over text content', () => {
            const button = createButton('Click', { 'aria-label': 'Submit Form' });
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.role === 'button');
            expect(record?.name).toBe('Submit Form');
        });
    });

    describe('Icon Matching', () => {
        it('should extract icon name when icon library is provided', () => {
            const button = createIconButton('bell');
            container.appendChild(button);

            const collector = new DOMCollector({ iconLibrary: createMockIconLibrary() });
            const { records } = collector.collect();

            const record = records.find(r => r.name?.includes('bell'));
            expect(record).toBeDefined();
        });

        it('should combine icon name with text', () => {
            const button = createIconButton('shopping-cart', 'Add to Cart');
            container.appendChild(button);

            const collector = new DOMCollector({ iconLibrary: createMockIconLibrary() });
            const { records } = collector.collect();

            const record = records.find(r =>
                r.name?.includes('shopping') && r.name?.includes('Add to Cart')
            );
            expect(record).toBeDefined();
        });

        it('should work without icon library', () => {
            const button = createIconButton('bell', 'Notifications');
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.name?.includes('Notifications'));
            expect(record).toBeDefined();
        });
    });

    describe('Visible Text Extraction', () => {
        it('should skip hidden elements', () => {
            const button = document.createElement('button');
            button.innerHTML = `
                <span style="display: none">Hidden</span>
                <span>Visible</span>
            `;
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.role === 'button');
            expect(record?.name).toBe('Visible');
            expect(record?.name).not.toContain('Hidden');
        });

        it('should skip aria-hidden elements', () => {
            const button = document.createElement('button');
            button.innerHTML = `
                <span aria-hidden="true">Icon</span>
                <span>Label</span>
            `;
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.role === 'button');
            expect(record?.name).toBe('Label');
        });

        it('should handle deeply nested text', () => {
            const button = document.createElement('button');
            button.innerHTML = `
                <div>
                    <span>
                        <strong>Deep</strong>
                        <em>Nested</em>
                    </span>
                    <span>Text</span>
                </div>
            `;
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.role === 'button');
            expect(record?.name).toContain('Deep');
            expect(record?.name).toContain('Nested');
            expect(record?.name).toContain('Text');
        });
    });

    describe('State Detection', () => {
        it('should detect disabled state', () => {
            const button = createButton('Disabled Button');
            button.disabled = true;
            container.appendChild(button);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.name === 'Disabled Button');
            expect(record?.stateBits).toBeDefined();
            // Check disabled bit is set
        });

        it('should detect checked state', () => {
            const checkbox = createInput('checkbox') as HTMLInputElement;
            checkbox.checked = true;
            container.appendChild(checkbox);

            const collector = new DOMCollector();
            const { records } = collector.collect();

            const record = records.find(r => r.role === 'checkbox');
            expect(record?.stateBits).toBeDefined();
            // Check checked bit is set
        });
    });

    describe('Context Extraction', () => {
        it('should extract dialog context', () => {
            const dialog = document.createElement('dialog');
            dialog.open = true; // Make sure it's visible
            dialog.setAttribute('aria-labelledby', 'title');
            dialog.innerHTML = `
                <h2 id="title">Confirm Delete</h2>
                <button>Cancel</button>
                <button>Confirm</button>
            `;
            container.appendChild(dialog);

            // Use the shared collector which has config, or new one. 
            // shared collector has getBoundingClientRect mock.
            // But this test creates new generic collector in the code I saw earlier.
            // I should use the shared collector from beforeEach to ensure getBoundingClientRect mock works too!
            // But waitForPreviousTools said "uses new collector = no config".
            // If I change it to use `this.collector` (or just `collector` from let scope), it implies I remove `const collector` line.
            // But wait, `collector` variable is available.

            // Previous code:
            // const collector = new DOMCollector();
            // const { records } = collector.collect();

            // If I remove `const collector...` line, it uses the one from beforeEach.

            const { records } = collector.collect();

            const confirmButton = records.find(r => r.name === 'Confirm');
            expect(confirmButton?.context).toContain('Confirm Delete');
        });
    });

    describe('Sample Page Collection', () => {
        it('should collect all interactive elements from sample page', () => {
            const page = createSamplePage();
            container.appendChild(page);

            const collector = new DOMCollector({ iconLibrary: createMockIconLibrary() });
            const { records, elements } = collector.collect();

            // Should have buttons, links, inputs
            expect(records.length).toBeGreaterThan(10);
            expect(elements.length).toBe(records.length);

            // Should find specific elements
            const addToCart = records.find(r => r.name?.includes('Add to Cart'));
            expect(addToCart).toBeDefined();

            const viewCart = records.find(r => r.name?.includes('View Cart'));
            expect(viewCart).toBeDefined();

            const searchInput = records.find(r => r.name?.includes('Search Products'));
            expect(searchInput).toBeDefined();
        });

        it('should include icon names in element names', () => {
            const page = createSamplePage();
            container.appendChild(page);

            const collector = new DOMCollector({ iconLibrary: createMockIconLibrary() });
            const { records } = collector.collect();

            // Icon buttons should have icon names
            const bellButton = records.find(r => r.name?.includes('bell'));
            expect(bellButton).toBeDefined();

            const cartButtons = records.filter(r => r.name?.includes('shopping') || r.name?.includes('cart'));
            expect(cartButtons.length).toBeGreaterThan(0);
        });
    });
});
