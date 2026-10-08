# `ppx ask`: agent loop and channel architecture

`ppx ask` is the terminal harness for PitchPerfect's agent loop. It deliberately
uses the public CLI contract rather than calling application internals. Every
operation is therefore visible, reproducible by a person, and protected by the
same API validation as a normal CLI request.

## Try it

```bash
export OPENROUTER_API_KEY=sk-or-v1-...

ppx ask "Create a tournament in Maastricht to be played next month"
ppx ask --session-id <session-id> "Call it Maastricht Summer Cup"

# A prompt can also come from stdin.
echo "Show me next month's tournaments" | ppx ask

# No prompt starts a terminal conversation. Use /exit or /quit to finish.
ppx ask
```

The shell form `ppx ask < Create ...` is not valid: `<` means “read stdin from
a file named Create”. Quote the prompt or pipe it as shown above.

The default model is `deepseek/deepseek-v4-flash` on OpenRouter. Override it
with `PPX_ASK_MODEL` or `--model`. Each turn prints the commands executed plus
input, output, turn, and cumulative token counts.

```text
$ ppx --format json tournament list
```

Sessions live under `~/.pp-cli/ask/sessions/<session-id>/`. Attached files are
snapshotted into that directory, rather than referenced at their original path,
so later turns remain reproducible. Set `PPX_CONFIG_DIR` to relocate all ask
session data in tests or isolated deployments.

## Current loop

1. Save the user's message in a durable session.
2. Send a compact system contract and bounded recent history to OpenRouter.
3. Let the model either answer or request one tool call.
4. Validate the tool's structured arguments and print the exact `ppx` command.
5. Execute `ppx` without a shell and return bounded stdout/stderr to the model.
6. Repeat up to the turn's tool budget, then persist the answer and token usage.

The tool surface is intentionally small:

- `run_ppx({ args: string[] })` runs allow-listed CLI command families. It
  cannot recurse into `ask`, invoke a shell, or change authentication.
- `inspect_attachment({ attachment_id })` returns bounded previews for textual
  data. Binary workbook parsing is the next ingestion adapter, described below.

High-impact calls—delete, reset, and the apply phase of fixture import—are
blocked until a user message explicitly confirms them. Existing CLI/API
confirmation codes and validation still apply underneath this gate.

The agent is instructed to discover workflows from `ppx system capabilities`
and targeted command help. That keeps the static prompt small and lets the API
contract evolve without copying a large command manual into every request.

## WhatsApp-ready boundary

The agent core should remain channel-neutral. A future WhatsApp adapter should
translate inbound messages into the same input envelope used by this command:

```ts
type AgentInput = {
  channel: 'cli' | 'whatsapp';
  conversationId: string;
  messageId: string;       // idempotency key
  userId: string;          // authenticated PitchPerfect identity
  text: string;
  attachments: AttachmentRef[];
};
```

The adapter owns WhatsApp delivery, retries, and message formatting. The agent
owns session state, tool decisions, confirmations, and an append-only command
ledger. Mapping `(channel, conversationId)` to the internal ask session makes a
WhatsApp follow-up equivalent to `ppx ask --session-id ...`.

For production, move sessions from local JSON into the API/database and move
attachment bytes into encrypted object storage. Keep attachment hashes,
original names, MIME detection, uploader identity, retention expiry, and scan
status in the session. Never trust the filename extension or send workbook
bytes directly to a language model.

## “Shitty Excel” ingestion

Spreadsheet handling should be a deterministic pipeline with the model used
only where judgment is valuable:

1. Quarantine and scan the upload; identify the real file type by magic bytes.
2. Extract sheets, merged cells, formulas, displayed values, dimensions, and
   date/time types in a sandboxed ingestion worker.
3. Profile each sheet and give the model headers, representative samples, and
   anomaly summaries—not the entire workbook.
4. Have the model propose a typed mapping to the canonical fixture schema:
   `DAY_OFFSET, TIME, MATCH, CATEGORY, PITCH, TEAM1, STAGE, TEAM2, UMPIRES,
   DURATION`.
5. Apply that mapping in code to every row. Preserve original sheet/row/cell
   coordinates on each canonical value.
6. Run deterministic structural checks, then the existing API `validate-tsv`
   contract. Do not mutate tournament data yet.
7. Return feedback grouped into “must fix”, “I inferred”, and “looks good”,
   referring to the user's original sheet and cells.
8. Generate a corrected preview and require explicit confirmation before the
   existing fixture-import apply step. Verify fixture counts afterward.

This arrangement scales to large workbooks because inference cost depends on a
small profile rather than row count. It also makes feedback trustworthy: every
error has provenance back to the uploaded workbook, while the API remains the
final authority on tournament validity.

Useful production telemetry includes model/provider, prompt/completion tokens,
tool-call count, failed/retried command count, command latency, validation issue
counts, confirmation decisions, and final outcome. Store sanitized argument
arrays rather than shell strings, and never log authentication secrets or raw
player personal data.
