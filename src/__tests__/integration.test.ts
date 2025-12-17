/**
 * Integration Tests
 * End-to-end tests for the complete SDK flow
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UiGround } from '../index.js';
import { createSamplePage, createMockIconLibrary } from './fixtures/mock-dom.js';
import { ElementRole } from '../types.js';

describe('UiGround Integration', () => {
    let container: HTMLElement;
    let uiGround: UiGround;
    let originalGetBoundingClientRect: any;

    beforeEach(() => {
        // Mock getBoundingClientRect to ensure elements are considered visible
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

        uiGround = new UiGround({
            engine: 'js',
            iconLibrary: createMockIconLibrary()
        });
    });

    afterEach(() => {
        container.remove();
        uiGround.reset();
        // Restore mock
        HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    describe('Full Snapshot → Query → Resolve Flow', () => {
        it('should collect snapshot and query elements', () => {
            const page = createSamplePage();
            container.appendChild(page);

            const records = uiGround.snapshot();
            expect(records.length).toBeGreaterThan(0);
            expect(uiGround.size).toBe(records.length);

            const result = uiGround.query({ where: [{ role: ElementRole.Button }] });
            expect(result.matches.length).toBeGreaterThan(0);
        });

        it('should resolve handles to DOM elements', () => {
            const page = createSamplePage();
            container.appendChild(page);

            const records = uiGround.snapshot();
            const buttonRecord = records.find(r => r.role === ElementRole.Button);
            expect(buttonRecord).toBeDefined();

            const element = uiGround.resolveHandle(buttonRecord!.id);
            expect(element).toBeInstanceOf(HTMLElement);
            expect(element?.tagName.toLowerCase()).toBe('button');
        });

        it('should find elements by name', () => {
            const page = createSamplePage();
            container.appendChild(page);
            uiGround.snapshot();

            const result = uiGround.query({
                where: [{ name: { value: 'Add to Cart', match: 'contains' } }]
            });

            expect(result.matches.length).toBeGreaterThan(0);
            const match = result.matches[0];
            // Access match.name instead of match.record.name
            expect(match.name).toContain('Add to Cart');
        });

        it('should find icon buttons by icon name', () => {
            const page = createSamplePage();
            container.appendChild(page);
            uiGround.snapshot();

            const result = uiGround.query({
                where: [{ name: { value: 'bell', match: 'contains' } }]
            });

            expect(result.matches.length).toBeGreaterThan(0);
        });
    });

    describe('Multiple Snapshots', () => {
        it('should replace old snapshot with new one', () => {
            const button1 = document.createElement('button');
            button1.textContent = 'First Button';
            container.appendChild(button1);

            const records1 = uiGround.snapshot();
            expect(records1.length).toBeGreaterThan(0);

            container.innerHTML = '';
            const button2 = document.createElement('button');
            button2.textContent = 'Second Button';
            container.appendChild(button2);

            uiGround.snapshot();
            const records = uiGround.getRecords();
            expect(records.some(r => r.name === 'Second Button')).toBe(true);
            expect(records.some(r => r.name === 'First Button')).toBe(false);
        });
    });

    describe('Icon Library Configuration', () => {
        it('should enhance element names with icon library', () => {
            const button = document.createElement('button');
            button.setAttribute('role', 'button'); // explicit role for clarity
            // Simulate icon
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('data-lucide', 'shopping-cart');
            svg.setAttribute('class', 'lucide lucide-shopping-cart');
            const span = document.createElement('span');
            span.textContent = 'Add to Cart';
            button.appendChild(svg);
            button.appendChild(span);
            container.appendChild(button);

            const records = uiGround.snapshot();

            const buttonRecord = records.find(r => r.role === ElementRole.Button);
            expect(buttonRecord).toBeDefined();
            // Expect partial match if not exact, based on DOM structure
            // With IconMatcher, it should extract "shopping-cart" -> "shopping cart"
            expect(buttonRecord?.name.toLowerCase()).toContain('shopping');
            expect(buttonRecord?.name).toContain('Add to Cart');
        });

        it('should work without icon library', () => {
            const noIconEngine = new UiGround({ engine: 'js' });

            const button = document.createElement('button');
            button.textContent = 'Click Me';
            container.appendChild(button);

            const records = noIconEngine.snapshot();

            const buttonRecord = records.find(r => r.role === ElementRole.Button);
            expect(buttonRecord?.name).toBe('Click Me');
        });
    });

    describe('Complex Queries', () => {
        it('should combine multiple filters', () => {
            const page = createSamplePage();
            container.appendChild(page);
            uiGround.snapshot();

            const result = uiGround.query({
                where: [
                    { role: ElementRole.Button },
                    { name: { value: 'Cart', match: 'contains' } }
                ]
            });

            expect(result.matches.length).toBeGreaterThan(0);
        });

        it('should paginate results', () => {
            const page = createSamplePage();
            container.appendChild(page);
            uiGround.snapshot();

            const page1 = uiGround.query({ where: [{ role: ElementRole.Button }], limit: 2, offset: 0 });
            const page2 = uiGround.query({ where: [{ role: ElementRole.Button }], limit: 2, offset: 2 });

            expect(page1.matches.length).toBe(2);
            // Not checking strict NotToBe because offset might return different objects ref but same IDs
            // But checking IDs differ
            if (page2.matches.length > 0) {
                expect(page1.matches[0].id).not.toBe(page2.matches[0].id);
            }
        });
    });
});
