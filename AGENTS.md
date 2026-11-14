<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The SOC simulator runs fully in the browser: pure engine logic lives in `src/lib/sim/engine.ts` (unit-tested), live state in `src/lib/sim/store.ts` (useSyncExternalStore). Why: deterministic, testable training sim with no backend needed.
- Store `commit()` must clone engine arrays/incidents so selectors see new references; selectors must not return freshly filtered arrays (infinite render loop).
- Account identity and approval live in Cloud, while simulator data stays browser-only; the authenticated layout requires an approved account before rendering any simulator page.
- Keep roles separate from profiles and validate admin privileges in every account-management server function; profile names never grant permissions.
- A single root account provider owns identity-transition subscriptions, and sign-out cancels and clears queries plus resets simulator state to prevent cross-account leakage.
