#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import axios, { AxiosError } from 'axios'
import { z } from 'zod'

const EMPRESIO_API_URL =
  process.env.EMPRESIO_API_URL?.replace(/\/$/, '') || 'https://empresio.io'

const http = axios.create({
  baseURL: EMPRESIO_API_URL,
  timeout: 15_000,
  headers: { 'User-Agent': 'empresio-mcp/1.0.0' }
})

const toErrorMessage = (err: unknown): string => {
  if (err instanceof AxiosError) {
    const status = err.response?.status
    const data = err.response?.data
    const detail =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string')
        ? (data as { error: string }).error
        : err.message
    return status ? `HTTP ${status}: ${detail}` : detail
  }
  return err instanceof Error ? err.message : String(err)
}

const textResult = (payload: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }]
})

const errorResult = (message: string) => ({
  isError: true,
  content: [{ type: 'text' as const, text: message }]
})

const server = new McpServer({
  name: 'empresio-mcp',
  version: '1.0.0'
})

server.registerTool(
  'search_companies',
  {
    title: 'Search companies',
    description:
      'Search Finnish and Nordic companies by name, business ID or industry. ' +
      'Returns a paginated list of matching companies from the Empresio registry.',
    inputSchema: {
      query: z.string().describe('Free-text search term — company name, business ID or previous name.'),
      country: z.string().length(2).optional().describe('Two-letter country code, e.g. "FI". Currently only FI is supported.'),
      status: z.enum(['active', 'inactive', 'all']).optional().describe('Filter by company status.'),
      page: z.number().int().min(1).optional().describe('1-based page number. Defaults to 1.')
    }
  },
  async ({ query, status, page }) => {
    try {
      const { data } = await http.get('/api/search', {
        params: { q: query, status, page: page ?? 1 }
      })
      return textResult(data)
    } catch (err) {
      return errorResult(`search_companies failed: ${toErrorMessage(err)}`)
    }
  }
)

server.registerTool(
  'check_vat',
  {
    title: 'Check VAT registration',
    description:
      'Verify the EU VAT registration status of a Finnish company via VIES. ' +
      'Returns whether the VAT number is valid, the registered trader name and address.',
    inputSchema: {
      business_id: z
        .string()
        .describe('Finnish business ID with dash, e.g. "0112038-9".')
    }
  },
  async ({ business_id }) => {
    try {
      const { data } = await http.get(
        `/api/company/${encodeURIComponent(business_id)}/vat`
      )
      return textResult(data)
    } catch (err) {
      return errorResult(`check_vat failed: ${toErrorMessage(err)}`)
    }
  }
)

server.registerTool(
  'get_company_info',
  {
    title: 'Get company info',
    description:
      'Look up detailed information about a single company by its business ID. ' +
      'Returns the best matching record from the Empresio registry.',
    inputSchema: {
      business_id: z
        .string()
        .describe('Finnish business ID with dash, e.g. "0112038-9".')
    }
  },
  async ({ business_id }) => {
    try {
      const { data } = await http.get('/api/search', {
        params: { q: business_id, limit: 1 }
      })
      const match =
        Array.isArray(data?.results)
          ? data.results.find(
              (c: { businessId?: string }) => c.businessId === business_id
            ) || data.results[0] || null
          : null
      if (!match) {
        return errorResult(`No company found for business ID "${business_id}".`)
      }
      return textResult(match)
    } catch (err) {
      return errorResult(`get_company_info failed: ${toErrorMessage(err)}`)
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`empresio-mcp ready (api: ${EMPRESIO_API_URL})`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
