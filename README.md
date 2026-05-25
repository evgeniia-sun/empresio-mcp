# Empresio MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes
the [Empresio](https://empresio.io) company-intelligence API as native tools
for AI agents such as Claude Desktop, Cursor, Cline and other MCP-compatible
clients.

With it installed, you can ask an agent things like:

- _"Find active Finnish companies in industry code 62 (IT) and show the top 5."_
- _"Verify the VAT registration for business ID 0112038-9."_
- _"Pull the full record for Nokia Oyj."_

The agent then calls the right Empresio endpoint directly — no glue code.

## Tools

| Tool | Description |
| --- | --- |
| `search_companies` | Search Finnish/Nordic companies by name, business ID or industry. |
| `check_vat` | Verify a Finnish VAT registration via the EU VIES service. |
| `get_company_info` | Look up a single company by its business ID. |

All three tools talk to the public Empresio API (`https://empresio.io` by
default) — no API key required for the current beta.

## Install & run

Requires Node.js 18 or newer.

```bash
git clone https://github.com/empresio/empresio-mcp.git
cd empresio-mcp
npm install
npm run build
```

To run locally for a quick sanity check:

```bash
npm start
# stderr: empresio-mcp ready (api: https://empresio.io)
```

The server speaks MCP over **stdio** — it's meant to be launched by an MCP
client, not invoked manually. A bare `npm start` will sit and wait for stdin
input, which is expected.

### Pointing at a different API

Set `EMPRESIO_API_URL` if you want to hit a staging environment or a local
backend (e.g. for development):

```bash
EMPRESIO_API_URL=http://localhost:3001 npm start
```

## Connect to Claude Desktop

Edit your Claude Desktop config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the `empresio` server entry:

```json
{
  "mcpServers": {
    "empresio": {
      "command": "node",
      "args": ["/path/to/empresio-mcp/dist/index.js"]
    }
  }
}
```

Replace `/path/to/empresio-mcp` with the absolute path to your clone.

Restart Claude Desktop. Open the connections panel — you should see
**empresio** listed with three tools (`search_companies`, `check_vat`,
`get_company_info`).

To point Claude at a non-production backend, add an `env` block:

```json
{
  "mcpServers": {
    "empresio": {
      "command": "node",
      "args": ["/path/to/empresio-mcp/dist/index.js"],
      "env": { "EMPRESIO_API_URL": "http://localhost:3001" }
    }
  }
}
```

## Connect to Cursor / Cline / other clients

Any client that supports MCP stdio servers can run this the same way:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/empresio-mcp/dist/index.js"]
}
```

## Development

```bash
npm run dev         # ts-node, watches stdin
npm run build       # tsc → dist/
```

TypeScript build is required before `npm start` — there is no bundled
ts-node runtime in production mode.

## Underlying REST API

The MCP server is a thin wrapper around the public REST API:

- Swagger UI: <https://empresio.io/api/docs>
- OpenAPI JSON: <https://empresio.io/api/openapi.json>

## License

MIT
