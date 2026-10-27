import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
export async function accessible(page: Page) { const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze(); expect(result.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, targets: v.nodes.map(n => n.target) }))).toEqual([]); }
