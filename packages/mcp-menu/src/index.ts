import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { get, post, patch } from './client.js';

const server = new McpServer({ name: 'dive-mcp-menu', version: '1.0.0' });

server.tool('diveGetMenu', {
  tenantId: z.string().uuid().describe('Unique identifier for the tenant'),
  storeId: z.string().uuid().optional().describe('Optional store ID to filter by'),
}, async (args) => {
  const data = await get('/menus', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveAddCategory', {
  tenantId: z.string().uuid().describe('Unique identifier for the tenant'),
  name: z.string().describe('Name of the category'),
  description: z.string().optional().describe('Optional description of the category'),
  displayOrder: z.number().int().optional().describe('Optional order for display'),
}, async (args) => {
  const data = await post('/categories', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveAddMenuItem', {
  tenantId: z.string().uuid().describe('Unique identifier for the tenant'),
  categoryId: z.string().uuid().describe('Category ID to add the item to'),
  name: z.string().describe('Name of the menu item'),
  description: z.string().describe('Description of the menu item'),
  price: z.number().positive().describe('Price of the item'),
  allergens: z.array(z.string()).optional().describe('Optional list of allergens'),
  isHalal: z.boolean().optional().describe('Whether the item is Halal'),
}, async (args) => {
  const data = await post('/products', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveUpdateMenuItem', {
  itemId: z.string().uuid().describe('ID of the menu item to update'),
  name: z.string().optional().describe('New name for the item'),
  description: z.string().optional().describe('New description for the item'),
  price: z.number().positive().optional().describe('New price for the item'),
}, async ({ itemId, ...body }) => {
  const data = await patch(`/products/${itemId}`, body);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveAddModifierGroup', {
  tenantId: z.string().uuid().describe('Unique identifier for the tenant'),
  name: z.string().describe('Name of the modifier group'),
  minSelections: z.number().int().default(0).describe('Minimum number of selections'),
  maxSelections: z.number().int().optional().describe('Maximum number of selections'),
  options: z.array(z.object({
    name: z.string().describe('Name of the modifier option'),
    priceAdjustment: z.number().default(0).describe('Price adjustment for this option'),
  })).describe('List of options in the group'),
}, async (args) => {
  const data = await post('/modifiers/groups', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

server.tool('diveAddPricingRule', {
  tenantId: z.string().uuid().describe('Unique identifier for the tenant'),
  name: z.string().describe('Name of the pricing rule'),
  type: z.enum(['discount', 'surcharge', 'happy_hour']).describe('Type of the pricing rule'),
  value: z.number().describe('Value of the discount or surcharge'),
  isPercentage: z.boolean().default(false).describe('Whether the value is a percentage'),
  applicableItemIds: z.array(z.string().uuid()).optional().describe('Optional list of item IDs this rule applies to'),
}, async (args) => {
  const data = await post('/pricing/rules', args);
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
